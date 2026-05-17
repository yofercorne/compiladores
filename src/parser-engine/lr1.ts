import {
  EOF,
  EPSILON,
  formatProduction,
  isNonTerminal,
  type Grammar,
  type NonTerminal,
  type Production,
  type SymbolName,
  type Terminal
} from "./grammar";

import {
  firstOfSequence,
  type SymbolSetMap
} from "./firstFollow";

import { tokenizeInput } from "./simulator";

export interface LR1Item {
  productionId: string;
  dot: number;
  lookahead: Terminal;
}

export interface LR1State {
  id: number;
  items: LR1Item[];
  transitions: Record<SymbolName, number>;
  isAcceptState: boolean;
  isReduceState: boolean;
  reductions: Production[];
}

export interface LR1Automaton {
  augmentedProduction: Production;
  productions: Production[];
  states: LR1State[];
  startStateId: number;
}

export interface LR1BuildResult {
  automaton: LR1Automaton;
}

export type LR1Action =
  | {
      type: "shift";
      toState: number;
    }
  | {
      type: "reduce";
      production: Production;
    }
  | {
      type: "accept";
    };

export type LR1ActionTable = Record<
  number,
  Record<Terminal, LR1Action | undefined>
>;

export type LR1GotoTable = Record<
  number,
  Record<NonTerminal, number | undefined>
>;

export interface LR1Conflict {
  stateId: number;
  symbol: Terminal;
  existingAction: LR1Action;
  incomingAction: LR1Action;
  type: "shift/reduce" | "reduce/reduce" | "accept/conflict";
  reason: string;
}

export interface LR1TableResult {
  action: LR1ActionTable;
  goto: LR1GotoTable;
  conflicts: LR1Conflict[];
  terminals: Terminal[];
  nonTerminals: NonTerminal[];
  automaton: LR1Automaton;
}

export type LR1ParseAction =
  | "init"
  | "shift"
  | "reduce"
  | "accept"
  | "error";

export interface LR1ParseStep {
  index: number;
  stateStack: number[];
  symbolStack: SymbolName[];
  input: SymbolName[];
  action: LR1ParseAction;
  explanation: string;
  production?: Production;
  toState?: number;
  lookahead?: SymbolName;
}

export interface LR1SimulationResult {
  accepted: boolean;
  steps: LR1ParseStep[];
  error?: string;
}

export interface SimulateLR1Options {
  maxSteps?: number;
}

export function buildLR1Automaton(
  grammar: Grammar,
  firstSets: SymbolSetMap
): LR1BuildResult {
  const augmentedProduction = createAugmentedProduction(grammar);
  const productions = [augmentedProduction, ...grammar.productions];

  const initialItems = closureLR1(
    grammar,
    productions,
    firstSets,
    [
      {
        productionId: augmentedProduction.id,
        dot: 0,
        lookahead: EOF
      }
    ]
  );

  const states: LR1State[] = [];
  const stateKeyToId = new Map<string, number>();
  const queue: LR1State[] = [];

  const initialState = createState(
    0,
    initialItems,
    grammar,
    productions
  );

  states.push(initialState);
  queue.push(initialState);
  stateKeyToId.set(itemsKey(initialState.items), initialState.id);

  while (queue.length > 0) {
    const currentState = queue.shift();

    if (!currentState) continue;

    const symbols = getSymbolsAfterDot(currentState.items, productions);

    for (const symbol of symbols) {
      const nextItems = gotoLR1(
        grammar,
        productions,
        firstSets,
        currentState.items,
        symbol
      );

      if (nextItems.length === 0) continue;

      const key = itemsKey(nextItems);
      const existingStateId = stateKeyToId.get(key);

      if (existingStateId !== undefined) {
        currentState.transitions[symbol] = existingStateId;
        continue;
      }

      const newState = createState(
        states.length,
        nextItems,
        grammar,
        productions
      );

      states.push(newState);
      queue.push(newState);
      stateKeyToId.set(key, newState.id);

      currentState.transitions[symbol] = newState.id;
    }
  }

  return {
    automaton: {
      augmentedProduction,
      productions,
      states,
      startStateId: 0
    }
  };
}

export function buildLR1Table(
  grammar: Grammar,
  firstSets: SymbolSetMap
): LR1TableResult {
  const { automaton } = buildLR1Automaton(grammar, firstSets);

  return buildLR1TableFromAutomaton(grammar, automaton);
}

export function buildLR1TableFromAutomaton(
  grammar: Grammar,
  automaton: LR1Automaton
): LR1TableResult {
  const terminals = [...grammar.terminals, EOF];
  const nonTerminals = [...grammar.nonTerminals];

  const action: LR1ActionTable = {};
  const goto: LR1GotoTable = {};
  const conflicts: LR1Conflict[] = [];

  for (const state of automaton.states) {
    action[state.id] = {};
    goto[state.id] = {};

    for (const terminal of terminals) {
      action[state.id]![terminal] = undefined;
    }

    for (const nonTerminal of nonTerminals) {
      goto[state.id]![nonTerminal] = undefined;
    }
  }

  for (const state of automaton.states) {
    for (const [symbol, targetStateId] of Object.entries(state.transitions)) {
      if (grammar.terminals.includes(symbol)) {
        insertAction(
          action,
          conflicts,
          state.id,
          symbol,
          {
            type: "shift",
            toState: targetStateId
          }
        );

        continue;
      }

      if (isNonTerminal(grammar, symbol)) {
        goto[state.id]![symbol] = targetStateId;
      }
    }

    for (const item of state.items) {
      if (!isLR1ItemComplete(item, automaton.productions)) {
        continue;
      }

      const production = getProductionById(
        automaton.productions,
        item.productionId
      );

      if (production.id === automaton.augmentedProduction.id) {
        if (item.lookahead === EOF) {
          insertAction(
            action,
            conflicts,
            state.id,
            EOF,
            {
              type: "accept"
            }
          );
        }

        continue;
      }

      insertAction(
        action,
        conflicts,
        state.id,
        item.lookahead,
        {
          type: "reduce",
          production
        }
      );
    }
  }

  return {
    action,
    goto,
    conflicts,
    terminals,
    nonTerminals,
    automaton
  };
}

export function closureLR1(
  grammar: Grammar,
  productions: Production[],
  firstSets: SymbolSetMap,
  items: LR1Item[]
): LR1Item[] {
  const result = new Map<string, LR1Item>();

  for (const item of items) {
    result.set(itemKey(item), item);
  }

  let changed = true;

  while (changed) {
    changed = false;

    const currentItems = [...result.values()];

    for (const item of currentItems) {
      const production = getProductionById(productions, item.productionId);
      const right = getEffectiveRight(production);
      const symbol = right[item.dot];

      if (symbol === undefined) continue;
      if (!isNonTerminal(grammar, symbol)) continue;

      const beta = right.slice(item.dot + 1);
      const lookaheadSequence = [...beta, item.lookahead];

      const lookaheads = firstOfSequence(
        grammar,
        lookaheadSequence,
        firstSets
      ).filter((candidate) => candidate !== EPSILON);

      const productionsForSymbol = productions.filter(
        (candidate) => candidate.left === symbol
      );

      for (const candidate of productionsForSymbol) {
        for (const lookahead of lookaheads) {
          const newItem: LR1Item = {
            productionId: candidate.id,
            dot: 0,
            lookahead
          };

          const key = itemKey(newItem);

          if (!result.has(key)) {
            result.set(key, newItem);
            changed = true;
          }
        }
      }
    }
  }

  return sortItems([...result.values()]);
}

export function gotoLR1(
  grammar: Grammar,
  productions: Production[],
  firstSets: SymbolSetMap,
  items: LR1Item[],
  symbol: SymbolName
): LR1Item[] {
  const movedItems: LR1Item[] = [];

  for (const item of items) {
    const production = getProductionById(productions, item.productionId);
    const right = getEffectiveRight(production);
    const symbolAfterDot = right[item.dot];

    if (symbolAfterDot !== symbol) continue;

    movedItems.push({
      productionId: item.productionId,
      dot: item.dot + 1,
      lookahead: item.lookahead
    });
  }

  if (movedItems.length === 0) {
    return [];
  }

  return closureLR1(grammar, productions, firstSets, movedItems);
}

export function simulateLR1(
  grammar: Grammar,
  table: LR1TableResult,
  rawInput: string | string[],
  options: SimulateLR1Options = {}
): LR1SimulationResult {
  if (table.conflicts.length > 0) {
    return {
      accepted: false,
      steps: [
        {
          index: 0,
          stateStack: [0],
          symbolStack: [],
          input: [...tokenizeInput(rawInput), EOF],
          action: "error",
          explanation:
            "No se puede simular porque la tabla LR(1) tiene conflictos."
        }
      ],
      error: "La tabla LR(1) tiene conflictos."
    };
  }

  const maxSteps = options.maxSteps ?? 500;

  const input = [...tokenizeInput(rawInput), EOF];
  const stateStack: number[] = [table.automaton.startStateId];
  const symbolStack: SymbolName[] = [];
  const steps: LR1ParseStep[] = [];

  steps.push({
    index: 0,
    stateStack: [...stateStack],
    symbolStack: [...symbolStack],
    input: [...input],
    action: "init",
    explanation: "Inicializamos la pila de estados con I0."
  });

  let stepIndex = 1;

  while (stepIndex <= maxSteps) {
    const currentState = stateStack[stateStack.length - 1];
    const lookahead = input[0];

    if (currentState === undefined || lookahead === undefined) {
      const error = "La pila de estados o la entrada quedaron inválidas.";

      steps.push(
        makeErrorStep(
          stepIndex,
          stateStack,
          symbolStack,
          input,
          error,
          lookahead
        )
      );

      return {
        accepted: false,
        steps,
        error
      };
    }

    const selectedAction = table.action[currentState]?.[lookahead];

    if (!selectedAction) {
      const error = `No existe ACTION[${currentState}, ${lookahead}].`;

      steps.push(
        makeErrorStep(
          stepIndex,
          stateStack,
          symbolStack,
          input,
          error,
          lookahead
        )
      );

      return {
        accepted: false,
        steps,
        error
      };
    }

    if (selectedAction.type === "shift") {
      symbolStack.push(lookahead);
      stateStack.push(selectedAction.toState);
      input.shift();

      steps.push({
        index: stepIndex,
        stateStack: [...stateStack],
        symbolStack: [...symbolStack],
        input: [...input],
        action: "shift",
        toState: selectedAction.toState,
        lookahead,
        explanation:
          `ACTION[${currentState}, ${lookahead}] = shift ${selectedAction.toState}. ` +
          `Se consume ${lookahead} y se apila el estado I${selectedAction.toState}.`
      });

      stepIndex++;
      continue;
    }

    if (selectedAction.type === "reduce") {
      const production = selectedAction.production;
      const popCount = getEffectiveRightLength(production);

      for (let i = 0; i < popCount; i++) {
        symbolStack.pop();
        stateStack.pop();
      }

      const stateAfterPop = stateStack[stateStack.length - 1];

      if (stateAfterPop === undefined) {
        const error = "No existe estado después de reducir.";

        steps.push(
          makeErrorStep(
            stepIndex,
            stateStack,
            symbolStack,
            input,
            error,
            lookahead
          )
        );

        return {
          accepted: false,
          steps,
          error
        };
      }

      const gotoState = table.goto[stateAfterPop]?.[production.left];

      if (gotoState === undefined) {
        const error =
          `No existe GOTO[${stateAfterPop}, ${production.left}] ` +
          `después de reducir con ${formatProduction(production)}.`;

        steps.push(
          makeErrorStep(
            stepIndex,
            stateStack,
            symbolStack,
            input,
            error,
            lookahead
          )
        );

        return {
          accepted: false,
          steps,
          error
        };
      }

      symbolStack.push(production.left);
      stateStack.push(gotoState);

      steps.push({
        index: stepIndex,
        stateStack: [...stateStack],
        symbolStack: [...symbolStack],
        input: [...input],
        action: "reduce",
        production,
        toState: gotoState,
        lookahead,
        explanation:
          `ACTION[${currentState}, ${lookahead}] = reduce ${formatProduction(production)}. ` +
          `Luego se aplica GOTO[${stateAfterPop}, ${production.left}] = ${gotoState}.`
      });

      stepIndex++;
      continue;
    }

    if (selectedAction.type === "accept") {
      steps.push({
        index: stepIndex,
        stateStack: [...stateStack],
        symbolStack: [...symbolStack],
        input: [...input],
        action: "accept",
        lookahead,
        explanation: "ACTION indica accept. La cadena es aceptada."
      });

      return {
        accepted: true,
        steps
      };
    }
  }

  const error =
    `Se superó el límite de ${maxSteps} pasos. ` +
    "Puede existir un ciclo o una tabla problemática.";

  steps.push(
    makeErrorStep(
      stepIndex,
      stateStack,
      symbolStack,
      input,
      error,
      input[0]
    )
  );

  return {
    accepted: false,
    steps,
    error
  };
}

function getProductionById(
  productions: Production[],
  productionId: string
): Production {
  const production = productions.find(
    (candidate) => candidate.id === productionId
  );

  if (!production) {
    throw new Error(`No existe la producción con id ${productionId}.`);
  }

  return production;
}

export function formatLR1Item(
  item: LR1Item,
  productions: Production[]
): string {
  const production = getProductionById(productions, item.productionId);
  const right = getEffectiveRight(production);

  const beforeDot = right.slice(0, item.dot);
  const afterDot = right.slice(item.dot);

  const body =
    right.length === 0
      ? ["·"]
      : [...beforeDot, "·", ...afterDot];

  return `${production.left} -> ${body.join(" ")}, ${item.lookahead}`;
}

export function formatLR1State(
  state: LR1State,
  productions: Production[]
): string[] {
  return state.items.map((item) => formatLR1Item(item, productions));
}

export function formatLR1Action(action: LR1Action | undefined): string {
  if (!action) return "";

  if (action.type === "shift") {
    return `s${action.toState}`;
  }

  if (action.type === "reduce") {
    return `r(${formatProduction(action.production)})`;
  }

  return "acc";
}

export function formatLR1ActionTable(result: LR1TableResult): string[][] {
  const header = ["Estado", ...result.terminals];
  const rows: string[][] = [header];

  for (const state of result.automaton.states) {
    rows.push([
      `I${state.id}`,
      ...result.terminals.map((terminal) =>
        formatLR1Action(result.action[state.id]?.[terminal])
      )
    ]);
  }

  return rows;
}

export function formatLR1GotoTable(result: LR1TableResult): string[][] {
  const header = ["Estado", ...result.nonTerminals];
  const rows: string[][] = [header];

  for (const state of result.automaton.states) {
    rows.push([
      `I${state.id}`,
      ...result.nonTerminals.map((nonTerminal) => {
        const target = result.goto[state.id]?.[nonTerminal];

        return target === undefined ? "" : `I${target}`;
      })
    ]);
  }

  return rows;
}

 function isLR1ItemComplete(
  item: LR1Item,
  productions: Production[]
): boolean {
  const production = getProductionById(productions, item.productionId);
  const right = getEffectiveRight(production);

  return item.dot >= right.length;
}

function insertAction(
  action: LR1ActionTable,
  conflicts: LR1Conflict[],
  stateId: number,
  terminal: Terminal,
  incomingAction: LR1Action
): void {
  const row = action[stateId];

  if (!row) {
    throw new Error(`No existe fila ACTION para el estado I${stateId}.`);
  }

  const existingAction = row[terminal];

  if (!existingAction) {
    row[terminal] = incomingAction;
    return;
  }

  if (sameAction(existingAction, incomingAction)) {
    return;
  }

  conflicts.push({
    stateId,
    symbol: terminal,
    existingAction,
    incomingAction,
    type: getConflictType(existingAction, incomingAction),
    reason:
      `Conflicto LR(1) en ACTION[${stateId}, ${terminal}]: ` +
      `${formatLR1Action(existingAction)} contra ${formatLR1Action(incomingAction)}.`
  });
}

function sameAction(a: LR1Action, b: LR1Action): boolean {
  if (a.type !== b.type) return false;

  if (a.type === "shift" && b.type === "shift") {
    return a.toState === b.toState;
  }

  if (a.type === "reduce" && b.type === "reduce") {
    return a.production.id === b.production.id;
  }

  return a.type === "accept" && b.type === "accept";
}

function getConflictType(
  a: LR1Action,
  b: LR1Action
): LR1Conflict["type"] {
  const types = new Set([a.type, b.type]);

  if (types.has("accept")) {
    return "accept/conflict";
  }

  if (types.has("shift") && types.has("reduce")) {
    return "shift/reduce";
  }

  return "reduce/reduce";
}

function createAugmentedProduction(grammar: Grammar): Production {
  return {
    id: "P0",
    left: grammar.augmentedStartSymbol,
    right: [grammar.startSymbol],
    raw: `${grammar.augmentedStartSymbol} -> ${grammar.startSymbol}`
  };
}

function createState(
  id: number,
  items: LR1Item[],
  grammar: Grammar,
  productions: Production[]
): LR1State {
  const reductions = items
    .filter((item) => isLR1ItemComplete(item, productions))
    .map((item) => getProductionById(productions, item.productionId));

  const isAcceptState = reductions.some(
    (production) => production.left === grammar.augmentedStartSymbol
  );

  const isReduceState = reductions.some(
    (production) => production.left !== grammar.augmentedStartSymbol
  );

  return {
    id,
    items: sortItems(items),
    transitions: {},
    isAcceptState,
    isReduceState,
    reductions
  };
}

function getSymbolsAfterDot(
  items: LR1Item[],
  productions: Production[]
): SymbolName[] {
  const symbols = new Set<SymbolName>();

  for (const item of items) {
    const production = getProductionById(productions, item.productionId);
    const right = getEffectiveRight(production);
    const symbol = right[item.dot];

    if (symbol !== undefined) {
      symbols.add(symbol);
    }
  }

  return [...symbols].sort();
}

function getEffectiveRight(production: Production): SymbolName[] {
  if (production.right.length === 1 && production.right[0] === EPSILON) {
    return [];
  }

  return production.right;
}

function getEffectiveRightLength(production: Production): number {
  return getEffectiveRight(production).length;
}

function itemKey(item: LR1Item): string {
  return `${item.productionId}@${item.dot},${item.lookahead}`;
}

function itemsKey(items: LR1Item[]): string {
  return sortItems(items).map(itemKey).join("|");
}

function sortItems(items: LR1Item[]): LR1Item[] {
  return [...items].sort((a, b) => {
    const productionCompare = a.productionId.localeCompare(
      b.productionId,
      undefined,
      { numeric: true }
    );

    if (productionCompare !== 0) {
      return productionCompare;
    }

    if (a.dot !== b.dot) {
      return a.dot - b.dot;
    }

    return a.lookahead.localeCompare(b.lookahead);
  });
}

function makeErrorStep(
  index: number,
  stateStack: number[],
  symbolStack: SymbolName[],
  input: SymbolName[],
  error: string,
  lookahead: SymbolName | undefined
): LR1ParseStep {
  return {
    index,
    stateStack: [...stateStack],
    symbolStack: [...symbolStack],
    input: [...input],
    action: "error",
    ...(lookahead !== undefined ? { lookahead } : {}),
    explanation: error
  };
}