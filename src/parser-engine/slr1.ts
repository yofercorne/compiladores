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
  buildLR0Automaton,
  getProductionById,
  isItemComplete,
  type LR0Automaton
} from "./lr0";

import { tokenizeInput } from "./simulator";

export type SLR1Action =
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

export type SLR1ActionTable = Record<
  number,
  Record<Terminal, SLR1Action | undefined>
>;

export type SLR1GotoTable = Record<
  number,
  Record<NonTerminal, number | undefined>
>;

export interface SLR1Conflict {
  stateId: number;
  symbol: Terminal;
  existingAction: SLR1Action;
  incomingAction: SLR1Action;
  type: "shift/reduce" | "reduce/reduce" | "accept/conflict";
  reason: string;
}

export interface SLR1TableResult {
  action: SLR1ActionTable;
  goto: SLR1GotoTable;
  conflicts: SLR1Conflict[];
  terminals: Terminal[];
  nonTerminals: NonTerminal[];
  automaton: LR0Automaton;
}

export type SLR1ParseAction =
  | "init"
  | "shift"
  | "reduce"
  | "accept"
  | "error";

export interface SLR1ParseStep {
  index: number;
  stateStack: number[];
  symbolStack: SymbolName[];
  input: SymbolName[];
  action: SLR1ParseAction;
  explanation: string;
  production?: Production;
  toState?: number;
  lookahead?: SymbolName;
}

export interface SLR1SimulationResult {
  accepted: boolean;
  steps: SLR1ParseStep[];
  error?: string;
}

export interface SimulateSLR1Options {
  maxSteps?: number;
}

export function buildSLR1Table(
  grammar: Grammar,
  followSets: SymbolSetMap
): SLR1TableResult {
  const { automaton } = buildLR0Automaton(grammar);

  return buildSLR1TableFromAutomaton(
    grammar,
    automaton,
    followSets
  );
}

export function buildSLR1TableFromAutomaton(
  grammar: Grammar,
  automaton: LR0Automaton,
  followSets: SymbolSetMap
): SLR1TableResult {
  const terminals = [...grammar.terminals, EOF];
  const nonTerminals = [...grammar.nonTerminals];

  const action: SLR1ActionTable = {};
  const goto: SLR1GotoTable = {};
  const conflicts: SLR1Conflict[] = [];

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
      if (!isItemComplete(item, automaton.productions)) {
        continue;
      }

      const production = getProductionById(
        automaton.productions,
        item.productionId
      );

      if (production.id === automaton.augmentedProduction.id) {
        insertAction(
          action,
          conflicts,
          state.id,
          EOF,
          {
            type: "accept"
          }
        );

        continue;
      }

      const follow = followSets[production.left] ?? [];

      for (const terminal of follow) {
        insertAction(
          action,
          conflicts,
          state.id,
          terminal,
          {
            type: "reduce",
            production
          }
        );
      }
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

export function simulateSLR1(
  grammar: Grammar,
  table: SLR1TableResult,
  rawInput: string | string[],
  options: SimulateSLR1Options = {}
): SLR1SimulationResult {
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
            "No se puede simular porque la tabla SLR(1) tiene conflictos."
        }
      ],
      error: "La tabla SLR(1) tiene conflictos."
    };
  }

  const maxSteps = options.maxSteps ?? 500;

  const input = [...tokenizeInput(rawInput), EOF];
  const stateStack: number[] = [table.automaton.startStateId];
  const symbolStack: SymbolName[] = [];
  const steps: SLR1ParseStep[] = [];

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

export function formatSLR1Action(action: SLR1Action | undefined): string {
  if (!action) return "";

  if (action.type === "shift") {
    return `s${action.toState}`;
  }

  if (action.type === "reduce") {
    return `r(${formatProduction(action.production)})`;
  }

  return "acc";
}

export function formatSLR1ActionTable(result: SLR1TableResult): string[][] {
  const header = ["Estado", ...result.terminals];
  const rows: string[][] = [header];

  for (const state of result.automaton.states) {
    rows.push([
      `I${state.id}`,
      ...result.terminals.map((terminal) =>
        formatSLR1Action(result.action[state.id]?.[terminal])
      )
    ]);
  }

  return rows;
}

export function formatSLR1GotoTable(result: SLR1TableResult): string[][] {
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

export function explainSLR1Conflict(conflict: SLR1Conflict): string {
  return conflict.reason;
}

function insertAction(
  action: SLR1ActionTable,
  conflicts: SLR1Conflict[],
  stateId: number,
  terminal: Terminal,
  incomingAction: SLR1Action
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
      `Conflicto SLR(1) en ACTION[${stateId}, ${terminal}]: ` +
      `${formatSLR1Action(existingAction)} contra ${formatSLR1Action(incomingAction)}.`
  });
}

function sameAction(a: SLR1Action, b: SLR1Action): boolean {
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
  a: SLR1Action,
  b: SLR1Action
): SLR1Conflict["type"] {
  const types = new Set([a.type, b.type]);

  if (types.has("accept")) {
    return "accept/conflict";
  }

  if (types.has("shift") && types.has("reduce")) {
    return "shift/reduce";
  }

  return "reduce/reduce";
}

function getEffectiveRightLength(production: Production): number {
  if (production.right.length === 1 && production.right[0] === EPSILON) {
    return 0;
  }

  return production.right.length;
}

function makeErrorStep(
  index: number,
  stateStack: number[],
  symbolStack: SymbolName[],
  input: SymbolName[],
  error: string,
  lookahead: SymbolName | undefined
): SLR1ParseStep {
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