/**
 * ParserLab Pro - LL(1) Step-by-Step Simulator
 *
 * Responsabilidad:
 * - Ejecutar una cadena usando la tabla LL(1).
 * - Generar pasos serializables para la UI.
 * - Cada paso incluye pila, entrada, acción y explicación pedagógica.
 */

import {
  EOF,
  EPSILON,
  formatProduction,
  isNonTerminal,
  isTerminal,
  type Grammar,
  type Production,
  type SymbolName
} from "./grammar";

import type { LL1Table } from "./ll1";

export type ParseAction =
  | "init"
  | "match"
  | "predict"
  | "accept"
  | "error";

export interface ParseStep {
  index: number;
  stack: SymbolName[];
  input: SymbolName[];
  action: ParseAction;
  production?: Production;
  top?: SymbolName | undefined;
  lookahead?: SymbolName | undefined;
  explanation: string;
}

export interface LL1SimulationResult {
  accepted: boolean;
  steps: ParseStep[];
  error?: string;
}

export interface SimulateLL1Options {
  maxSteps?: number;
}

export function tokenizeInput(input: string | string[]): string[] {
  if (Array.isArray(input)) {
    return input.filter(Boolean);
  }

  const trimmed = input.trim();

  if (!trimmed) {
    return [];
  }

  return trimmed.split(/\s+/).filter(Boolean);
}

export function simulateLL1(
  grammar: Grammar,
  table: LL1Table,
  rawInput: string | string[],
  options: SimulateLL1Options = {}
): LL1SimulationResult {
  const maxSteps = options.maxSteps ?? 500;

  const input = [...tokenizeInput(rawInput), EOF];
  const stack: SymbolName[] = [EOF, grammar.startSymbol];

  const steps: ParseStep[] = [];

  steps.push({
    index: 0,
    stack: [...stack],
    input: [...input],
    action: "init",
    explanation: `Inicializamos la pila con $ y el símbolo inicial ${grammar.startSymbol}.`
  });

  let stepIndex = 1;

  while (stepIndex <= maxSteps) {
    const top = stack[stack.length - 1];
    const lookahead = input[0];

    if (!top || !lookahead) {
      const error = "La pila o la entrada quedaron en un estado inválido.";

      steps.push(
        makeErrorStep(stepIndex, stack, input, top, lookahead, error)
      );

      return {
        accepted: false,
        steps,
        error
      };
    }

    if (top === EOF && lookahead === EOF) {
      steps.push({
        index: stepIndex,
        stack: [...stack],
        input: [...input],
        action: "accept",
        top,
        lookahead,
        explanation:
          "La pila y la entrada llegaron a $. La cadena es aceptada."
      });

      return {
        accepted: true,
        steps
      };
    }

    if (isTerminal(grammar, top) || top === EOF) {
      if (top === lookahead) {
        stack.pop();
        input.shift();

        steps.push({
          index: stepIndex,
          stack: [...stack],
          input: [...input],
          action: "match",
          top,
          lookahead,
          explanation:
            `El terminal superior ${top} coincide con la entrada. ` +
            "Se consume el token."
        });

        stepIndex++;
        continue;
      }

      const error = `Se esperaba "${top}", pero llegó "${lookahead}".`;

      steps.push(
        makeErrorStep(stepIndex, stack, input, top, lookahead, error)
      );

      return {
        accepted: false,
        steps,
        error
      };
    }

    if (isNonTerminal(grammar, top)) {
      const production = table[top]?.[lookahead];

      if (!production) {
        const error =
          `No existe producción en la tabla LL(1) ` +
          `para M[${top}, ${lookahead}].`;

        steps.push(
          makeErrorStep(stepIndex, stack, input, top, lookahead, error)
        );

        return {
          accepted: false,
          steps,
          error
        };
      }

      stack.pop();

      const isEpsilonProduction =
        production.right.length === 1 &&
        production.right[0] === EPSILON;

      if (!isEpsilonProduction) {
        for (const symbol of [...production.right].reverse()) {
          stack.push(symbol);
        }
      }

      steps.push({
        index: stepIndex,
        stack: [...stack],
        input: [...input],
        action: "predict",
        production,
        top,
        lookahead,
        explanation:
          `Usando M[${top}, ${lookahead}], aplicamos ` +
          `${formatProduction(production)}.`
      });

      stepIndex++;
      continue;
    }

    const error = `Símbolo desconocido en pila: "${top}".`;

    steps.push(
      makeErrorStep(stepIndex, stack, input, top, lookahead, error)
    );

    return {
      accepted: false,
      steps,
      error
    };
  }

  const error =
    `Se superó el límite de ${maxSteps} pasos. ` +
    "Puede existir un ciclo o una gramática problemática.";

  steps.push(
    makeErrorStep(stepIndex, stack, input, stack.at(-1), input[0], error)
  );

  return {
    accepted: false,
    steps,
    error
  };
}

function makeErrorStep(
  index: number,
  stack: SymbolName[],
  input: SymbolName[],
  top: SymbolName | undefined,
  lookahead: SymbolName | undefined,
  error: string
): ParseStep {
  return {
    index,
    stack: [...stack],
    input: [...input],
    action: "error",
    top,
    lookahead,
    explanation: error
  };
}