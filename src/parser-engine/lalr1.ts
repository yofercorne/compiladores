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

import type { SymbolSetMap } from "./firstFollow";

import {
  buildLR1Automaton,
  type LR1Automaton,
  type LR1Item
} from "./lr1";

import { tokenizeInput } from "./simulator";

export interface LALR1Item {
  productionId: string;
  dot: number;
  lookahead: Terminal;
}

export interface LALR1State {
  id: number;
  items: LALR1Item[];
  transitions: Record<SymbolName, number>;
  isAcceptState: boolean;
  isReduceState: boolean;
  reductions: Production[];
  mergedFrom: number[];
}

export interface LALR1Automaton {
  augmentedProduction: Production;
  productions: Production[];
  states: LALR1State[];
  startStateId: number;
}

export interface LALR1BuildResult {
  automaton: LALR1Automaton;
}

export type LALR1Action =
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

export type LALR1ActionTable = Record<
  number,
  Record<Terminal, LALR1Action | undefined>
>;

export type LALR1GotoTable = Record<
  number,
  Record<NonTerminal, number | undefined>
>;

export interface LALR1Conflict {
  stateId: number;
  symbol: Terminal;
  existingAction: LALR1Action;
  incomingAction: LALR1Action;
  type: "shift/reduce" | "reduce/reduce" | "accept/conflict";
  reason: string;
}

export interface LALR1TableResult {
  action: LALR1ActionTable;
  goto: LALR1GotoTable;
  conflicts: LALR1Conflict[];
  terminals: Terminal[];
  nonTerminals: NonTerminal[];
  automaton: LALR1Automaton;
}

export type LALR1ParseAction =
  | "init"
  | "shift"
  | "reduce"
  | "accept"
  | "error";

export interface LALR1ParseStep {
  index: number;
  stateStack: number[];
  symbolStack: SymbolName[];
  input: SymbolName[];
  action: LALR1ParseAction;
  explanation: string;
  production?: Production;
  toState?: number;
  lookahead?: SymbolName;
}

export interface LALR1SimulationResult {
  accepted: boolean;
  steps: LALR1ParseStep[];
  error?: string;
}

export interface SimulateLALR1Options {
  maxSteps?: number;
}

export function buildLALR1Automaton(
  grammar: Grammar,
  firstSets: SymbolSetMap
): LALR1BuildResult {
  const { automaton: lr1Automaton } = buildLR1Automaton(grammar, firstSets);
  const lalrAutomaton = mergeLR1AutomatonByCore(grammar, lr1Automaton);

  return {
    automaton: lalrAutomaton
  };
}

export function buildLALR1Table(
  grammar: Grammar,
  firstSets: SymbolSetMap
): LALR1TableResult {
  const { automaton } = buildLALR1Automaton(grammar, firstSets);

  return buildLALR1TableFromAutomaton(grammar, automaton);
}

export function buildLALR1TableFromAutomaton(
  grammar: Grammar,
  automaton: LALR1Automaton
): LALR1TableResult {
  const terminals = [...grammar.terminals, EOF];
  const nonTerminals = [...grammar.nonTerminals];

  const action: LALR1ActionTable = {};
  const goto: LALR1GotoTable = {};
  const conflicts: LALR1Conflict[] = [];

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
      if (!isLALR1ItemComplete(item, automaton.productions)) {
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

function mergeLR1AutomatonByCore(
  grammar: Grammar,
  lr1Automaton: LR1Automaton
): LALR1Automaton {
  const coreToOldStateIds = new Map<string, number[]>();

  for (const state of lr1Automaton.states) {
    const core = lr1CoreKey(state.items);
    const stateIds = coreToOldStateIds.get(core) ?? [];

    stateIds.push(state.id);
    coreToOldStateIds.set(core, stateIds);
  }

  const coreKeys = [...coreToOldStateIds.keys()];
  const oldStateToNewState = new Map<number, number>();

  coreKeys.forEach((coreKey, newStateId) => {
    const oldStateIds = coreToOldStateIds.get(coreKey) ?? [];

    for (const oldStateId of oldStateIds) {
      oldStateToNewState.set(oldStateId, newStateId);
    }
  });

  const states: LALR1State[] = [];

  coreKeys.forEach((coreKey, newStateId) => {
    const oldStateIds = coreToOldStateIds.get(coreKey) ?? [];
    const itemMap = new Map<string, LALR1Item>();

    for (const oldStateId of oldStateIds) {
      const oldState = lr1Automaton.states[oldStateId];

      if (!oldState) continue;

      for (const item of oldState.items) {
        const lalrItem: LALR1Item = {
          productionId: item.productionId,
          dot: item.dot,
          lookahead: item.lookahead
        };

        itemMap.set(itemKey(lalrItem), lalrItem);
      }
    }

    const items = sortItems([...itemMap.values()]);
    const transitions: Record<SymbolName, number> = {};

    for (const oldStateId of oldStateIds) {
      const oldState = lr1Automaton.states[oldStateId];

      if (!oldState) continue;

      for (const [symbol, oldTargetId] of Object.entries(
        oldState.transitions
      )) {
        const newTargetId = oldStateToNewState.get(oldTargetId);

        if (newTargetId === undefined) continue;

        transitions[symbol] = newTargetId;
      }
    }

    states.push(
      createState(
        newStateId,
        items,
        transitions,
        oldStateIds,
        grammar,
        lr1Automaton.productions
      )
    );
  });

  return {
    augmentedProduction: lr1Automaton.augmentedProduction,
    productions: lr1Automaton.productions,
    states,
    startStateId: oldStateToNewState.get(lr1Automaton.startStateId) ?? 0
  };
}

export function simulateLALR1(
  grammar: Grammar,
  table: LALR1TableResult,
  rawInput: string | string[],
  options: SimulateLALR1Options = {}
): LALR1SimulationResult {
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
            "No se puede simular porque la tabla LALR(1) tiene conflictos."
        }
      ],
      error: "La tabla LALR(1) tiene conflictos."
    };
  }

  const maxSteps = options.maxSteps ?? 500;

  const input = [...tokenizeInput(rawInput), EOF];
  const stateStack: number[] = [table.automaton.startStateId];
  const symbolStack: SymbolName[] = [];
  const steps: LALR1ParseStep[] = [];

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

export function formatLALR1Item(
  item: LALR1Item,
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

export function formatLALR1State(
  state: LALR1State,
  productions: Production[]
): string[] {
  return state.items.map((item) => formatLALR1Item(item, productions));
}

export function formatLALR1Action(action: LALR1Action | undefined): string {
  if (!action) return "";

  if (action.type === "shift") {
    return `s${action.toState}`;
  }

  if (action.type === "reduce") {
    return `r(${formatProduction(action.production)})`;
  }

  return "acc";
}

export function formatLALR1ActionTable(
  result: LALR1TableResult
): string[][] {
  const header = ["Estado", ...result.terminals];
  const rows: string[][] = [header];

  for (const state of result.automaton.states) {
    rows.push([
      `I${state.id}`,
      ...result.terminals.map((terminal) =>
        formatLALR1Action(result.action[state.id]?.[terminal])
      )
    ]);
  }

  return rows;
}

export function formatLALR1GotoTable(result: LALR1TableResult): string[][] {
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

function createState(
  id: number,
  items: LALR1Item[],
  transitions: Record<SymbolName, number>,
  mergedFrom: number[],
  grammar: Grammar,
  productions: Production[]
): LALR1State {
  const reductions = items
    .filter((item) => isLALR1ItemComplete(item, productions))
    .map((item) => getProductionById(productions, item.productionId));

  const uniqueReductions = uniqueProductions(reductions);

  const isAcceptState = uniqueReductions.some(
    (production) => production.left === grammar.augmentedStartSymbol
  );

  const isReduceState = uniqueReductions.some(
    (production) => production.left !== grammar.augmentedStartSymbol
  );

  return {
    id,
    items: sortItems(items),
    transitions,
    isAcceptState,
    isReduceState,
    reductions: uniqueReductions,
    mergedFrom: [...mergedFrom].sort((a, b) => a - b)
  };
}

function insertAction(
  action: LALR1ActionTable,
  conflicts: LALR1Conflict[],
  stateId: number,
  terminal: Terminal,
  incomingAction: LALR1Action
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
      `Conflicto LALR(1) en ACTION[${stateId}, ${terminal}]: ` +
      `${formatLALR1Action(existingAction)} contra ${formatLALR1Action(incomingAction)}.`
  });
}

function sameAction(a: LALR1Action, b: LALR1Action): boolean {
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
  a: LALR1Action,
  b: LALR1Action
): LALR1Conflict["type"] {
  const types = new Set([a.type, b.type]);

  if (types.has("accept")) {
    return "accept/conflict";
  }

  if (types.has("shift") && types.has("reduce")) {
    return "shift/reduce";
  }

  return "reduce/reduce";
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

function isLALR1ItemComplete(
  item: LALR1Item,
  productions: Production[]
): boolean {
  const production = getProductionById(productions, item.productionId);
  const right = getEffectiveRight(production);

  return item.dot >= right.length;
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

function uniqueProductions(productions: Production[]): Production[] {
  const map = new Map<string, Production>();

  for (const production of productions) {
    map.set(production.id, production);
  }

  return [...map.values()];
}

function lr1CoreKey(items: LR1Item[]): string {
  return [...items]
    .map((item) => `${item.productionId}@${item.dot}`)
    .sort()
    .join("|");
}

function itemKey(item: LALR1Item): string {
  return `${item.productionId}@${item.dot},${item.lookahead}`;
}

function sortItems(items: LALR1Item[]): LALR1Item[] {
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
): LALR1ParseStep {
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