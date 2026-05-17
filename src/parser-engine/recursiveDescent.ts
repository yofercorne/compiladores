import type { Grammar, Production } from "./grammar";

type GrammarSymbol = string;

export type RecursiveDescentStepKind =
  | "start"
  | "call"
  | "try-production"
  | "match-terminal"
  | "match-epsilon"
  | "return-success"
  | "return-failure"
  | "backtrack"
  | "accept"
  | "reject"
  | "error";

export interface RecursiveDescentStep {
  index: number;
  kind: RecursiveDescentStepKind;

  nonTerminal?: string;
  symbol?: string;
  production?: Production;

  position: number;
  input: string[];
  remainingInput: string[];
  callStack: string[];
  depth: number;

  expected?: string;
  found?: string;
  consumed?: string;

  message: string;
}

export interface RecursiveDescentTreeNode {
  id: string;
  symbol: string;
  children: RecursiveDescentTreeNode[];
  productionId?: string;
  token?: string;
  kind: "non-terminal" | "terminal" | "epsilon";
}

export interface DirectLeftRecursionIssue {
  nonTerminal: string;
  productions: Production[];
  message: string;
}

export interface RecursiveDescentOptions {
  maxDepth?: number;
  maxSteps?: number;
  maxBranches?: number;
}

export interface RecursiveDescentResult {
  accepted: boolean;
  tokens: string[];
  finalPosition: number;
  steps: RecursiveDescentStep[];
  tree?: RecursiveDescentTreeNode;
  leftRecursions: DirectLeftRecursionIssue[];
  errors: string[];
}

interface TokenizeResult {
  tokens: string[];
  errors: string[];
}

interface SequenceCandidate {
  nextPosition: number;
  children: RecursiveDescentTreeNode[];
}

interface ParseAttempt {
  nextPosition: number;
  node: RecursiveDescentTreeNode;
  production: Production;
}

class RecursiveDescentLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecursiveDescentLimitError";
  }
}

const EPSILON_SYMBOLS = new Set(["ε", "eps", "epsilon", "lambda", "λ", ""]);

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (value instanceof Set) {
    return Array.from(value).map(String);
  }

  return [];
}

function isEpsilon(symbol: unknown): boolean {
  return EPSILON_SYMBOLS.has(String(symbol).trim());
}

function getEffectiveRight(production: Production): GrammarSymbol[] {
  const right = Array.isArray(production.right) ? production.right : [];

  return right.map(String).filter((symbol) => !isEpsilon(symbol));
}

function formatProduction(production: Production): string {
  const right = getEffectiveRight(production);

  return `${production.left} → ${right.length > 0 ? right.join(" ") : "ε"}`;
}

function getNonTerminals(grammar: Grammar): Set<string> {
  const result = new Set<string>();

  for (const nonTerminal of toStringArray(
    (grammar as unknown as { nonTerminals?: unknown }).nonTerminals
  )) {
    result.add(nonTerminal);
  }

  for (const production of grammar.productions) {
    result.add(String(production.left));
  }

  return result;
}

function getTerminals(grammar: Grammar): string[] {
  const declaredTerminals = toStringArray(
    (grammar as unknown as { terminals?: unknown }).terminals
  );

  const nonTerminals = getNonTerminals(grammar);
  const terminals = new Set<string>();

  for (const terminal of declaredTerminals) {
    if (!isEpsilon(terminal) && terminal !== "$") {
      terminals.add(terminal);
    }
  }

  for (const production of grammar.productions) {
    for (const symbol of getEffectiveRight(production)) {
      if (!nonTerminals.has(symbol) && symbol !== "$") {
        terminals.add(symbol);
      }
    }
  }

  return Array.from(terminals).sort((a, b) => b.length - a.length);
}

function groupProductionsByLeft(grammar: Grammar): Map<string, Production[]> {
  const grouped = new Map<string, Production[]>();

  for (const production of grammar.productions) {
    const left = String(production.left);

    if (!grouped.has(left)) {
      grouped.set(left, []);
    }

    grouped.get(left)!.push(production);
  }

  return grouped;
}

function stringifyCallStack(stack: string[]): string[] {
  return stack.map((frame) => frame.split("@")[0] ?? frame);
}

function getFoundToken(tokens: string[], position: number): string {
  return tokens[position] ?? "$";
}

export function tokenizeRecursiveDescentInput(
  input: string | string[],
  grammar: Grammar
): TokenizeResult {
  if (Array.isArray(input)) {
    return {
      tokens: input.map(String).filter((token) => token.length > 0),
      errors: [],
    };
  }

  const compactInput = input.replace(/\s+/g, "");

  if (compactInput.length === 0) {
    return {
      tokens: [],
      errors: [],
    };
  }

  const terminals = getTerminals(grammar);

  if (terminals.length === 0) {
    return {
      tokens: compactInput.split(""),
      errors: [],
    };
  }

  const tokens: string[] = [];
  const errors: string[] = [];

  let cursor = 0;

  while (cursor < compactInput.length) {
    const matchedTerminal = terminals.find((terminal) =>
      compactInput.startsWith(terminal, cursor)
    );

    if (!matchedTerminal) {
      errors.push(
        `No se pudo reconocer el símbolo de entrada cerca de "${compactInput.slice(
          cursor
        )}".`
      );
      break;
    }

    tokens.push(matchedTerminal);
    cursor += matchedTerminal.length;
  }

  return {
    tokens,
    errors,
  };
}

export function detectDirectLeftRecursion(
  grammar: Grammar
): DirectLeftRecursionIssue[] {
  const byNonTerminal = new Map<string, Production[]>();

  for (const production of grammar.productions) {
    const left = String(production.left);
    const right = getEffectiveRight(production);

    if (right[0] === left) {
      if (!byNonTerminal.has(left)) {
        byNonTerminal.set(left, []);
      }

      byNonTerminal.get(left)!.push(production);
    }
  }

  return Array.from(byNonTerminal.entries()).map(
    ([nonTerminal, productions]) => ({
      nonTerminal,
      productions,
      message: `El no terminal ${nonTerminal} tiene recursión izquierda directa. Un parser de descenso recursivo puede entrar en una llamada infinita con producciones como: ${productions
        .map(formatProduction)
        .join(" | ")}.`,
    })
  );
}

export function hasDirectLeftRecursion(grammar: Grammar): boolean {
  return detectDirectLeftRecursion(grammar).length > 0;
}

export function runRecursiveDescent(
  grammar: Grammar,
  input: string | string[],
  options: RecursiveDescentOptions = {}
): RecursiveDescentResult {
  const tokensResult = tokenizeRecursiveDescentInput(input, grammar);
  const tokens = tokensResult.tokens;

  const maxDepth =
    options.maxDepth ?? Math.max(40, grammar.productions.length * 8 + 10);

  const maxSteps = options.maxSteps ?? 1500;
  const maxBranches = options.maxBranches ?? 300;

  const steps: RecursiveDescentStep[] = [];
  const errors: string[] = [...tokensResult.errors];

  const nonTerminals = getNonTerminals(grammar);
  const productionsByLeft = groupProductionsByLeft(grammar);
  const leftRecursions = detectDirectLeftRecursion(grammar);

  let nodeCounter = 0;

  const makeNode = (
    symbol: string,
    kind: RecursiveDescentTreeNode["kind"],
    children: RecursiveDescentTreeNode[] = [],
    extra?: Partial<RecursiveDescentTreeNode>
  ): RecursiveDescentTreeNode => ({
    id: `rd-node-${nodeCounter++}`,
    symbol,
    kind,
    children,
    ...extra,
  });

  const addStep = (
    step: Omit<RecursiveDescentStep, "index" | "input" | "remainingInput">
  ): void => {
    if (steps.length >= maxSteps) {
      throw new RecursiveDescentLimitError(
        `Se alcanzó el límite de ${maxSteps} pasos durante el descenso recursivo.`
      );
    }

    steps.push({
      index: steps.length,
      input: tokens,
      remainingInput: tokens.slice(step.position),
      ...step,
    });
  };

  const startSymbol = String(grammar.startSymbol);

  try {
    addStep({
      kind: "start",
      position: 0,
      callStack: [],
      depth: 0,
      nonTerminal: startSymbol,
      message: `Iniciando descenso recursivo desde el símbolo inicial ${startSymbol}.`,
    });

    if (tokensResult.errors.length > 0) {
      addStep({
        kind: "error",
        position: 0,
        callStack: [],
        depth: 0,
        message: tokensResult.errors.join(" "),
      });

      return {
        accepted: false,
        tokens,
        finalPosition: 0,
        steps,
        leftRecursions,
        errors,
      };
    }

if (leftRecursions.length > 0) {
  const message = leftRecursions.map((issue) => issue.message).join(" ");
  const firstLeftRecursion = leftRecursions[0];

  errors.push(message);

  addStep({
    kind: "error",
    position: 0,
    callStack: [],
    depth: 0,
    nonTerminal: firstLeftRecursion?.nonTerminal ?? "desconocido",
    message,
  });

  return {
    accepted: false,
    tokens,
    finalPosition: 0,
    steps,
    leftRecursions,
    errors,
  };
}

const parseSequence = (
  symbols: string[],
  symbolIndex: number,
  position: number,
  depth: number,
  callStack: string[],
  production: Production
): SequenceCandidate[] => {
  if (symbolIndex >= symbols.length) {
    return [
      {
        nextPosition: position,
        children: [],
      },
    ];
  }

  const symbol = symbols[symbolIndex];

  if (symbol === undefined) {
    return [
      {
        nextPosition: position,
        children: [],
      },
    ];
  }

  if (nonTerminals.has(symbol)) {
    const childAttempts = parseNonTerminal(
      symbol,
      position,
      depth + 1,
      callStack
    );

    const candidates: SequenceCandidate[] = [];

    for (const childAttempt of childAttempts) {
      const restCandidates = parseSequence(
        symbols,
        symbolIndex + 1,
        childAttempt.nextPosition,
        depth,
        callStack,
        production
      );

      for (const restCandidate of restCandidates) {
        candidates.push({
          nextPosition: restCandidate.nextPosition,
          children: [childAttempt.node, ...restCandidate.children],
        });

        if (candidates.length >= maxBranches) {
          return candidates;
        }
      }
    }

    if (candidates.length === 0) {
      addStep({
        kind: "return-failure",
        position,
        callStack: stringifyCallStack(callStack),
        depth,
        symbol,
        production,
        expected: symbol,
        found: getFoundToken(tokens, position),
        message: `No se pudo derivar el no terminal ${symbol} usando la producción ${formatProduction(
          production
        )}.`,
      });
    }

    return candidates;
  }

  const found = getFoundToken(tokens, position);

  if (tokens[position] === symbol) {
    addStep({
      kind: "match-terminal",
      position,
      callStack: stringifyCallStack(callStack),
      depth,
      symbol,
      production,
      expected: symbol,
      found,
      consumed: symbol,
      message: `Coincide el terminal ${symbol}. Se consume de la entrada.`,
    });

    const terminalNode = makeNode(symbol, "terminal", [], {
      token: symbol,
    });

    const restCandidates = parseSequence(
      symbols,
      symbolIndex + 1,
      position + 1,
      depth,
      callStack,
      production
    );

    return restCandidates.map((candidate) => ({
      nextPosition: candidate.nextPosition,
      children: [terminalNode, ...candidate.children],
    }));
  }

  addStep({
    kind: "return-failure",
    position,
    callStack: stringifyCallStack(callStack),
    depth,
    symbol,
    production,
    expected: symbol,
    found,
    message: `Se esperaba ${symbol}, pero se encontró ${found}.`,
  });

  return [];
};

    const parseNonTerminal = (
      nonTerminal: string,
      position: number,
      depth: number,
      callStack: string[]
    ): ParseAttempt[] => {
      if (depth > maxDepth) {
        addStep({
          kind: "error",
          position,
          callStack: stringifyCallStack(callStack),
          depth,
          nonTerminal,
          message: `Se superó la profundidad máxima de ${maxDepth}. Es posible que exista recursión indirecta o una derivación demasiado profunda.`,
        });

        return [];
      }

      const frameKey = `${nonTerminal}@${position}`;

      if (callStack.includes(frameKey)) {
        addStep({
          kind: "error",
          position,
          callStack: stringifyCallStack(callStack),
          depth,
          nonTerminal,
          message: `Se detectó un ciclo sin consumir entrada en ${nonTerminal}. Esto sugiere recursión indirecta o una producción que no avanza.`,
        });

        return [];
      }

      const nextCallStack = [...callStack, frameKey];

      addStep({
        kind: "call",
        position,
        callStack: stringifyCallStack(nextCallStack),
        depth,
        nonTerminal,
        message: `Llamando a la función parse${nonTerminal}() en la posición ${position}.`,
      });

      const productions = productionsByLeft.get(nonTerminal) ?? [];

      if (productions.length === 0) {
        addStep({
          kind: "return-failure",
          position,
          callStack: stringifyCallStack(nextCallStack),
          depth,
          nonTerminal,
          message: `No existen producciones para el no terminal ${nonTerminal}.`,
        });

        return [];
      }

      const attempts: ParseAttempt[] = [];

      for (const production of productions) {
        const right = getEffectiveRight(production);

        addStep({
          kind: "try-production",
          position,
          callStack: stringifyCallStack(nextCallStack),
          depth,
          nonTerminal,
          production,
          message: `Intentando producción ${formatProduction(production)}.`,
        });

        let candidates: SequenceCandidate[];

        if (right.length === 0) {
          addStep({
            kind: "match-epsilon",
            position,
            callStack: stringifyCallStack(nextCallStack),
            depth,
            nonTerminal,
            production,
            message: `La producción ${formatProduction(
              production
            )} deriva ε. No se consume entrada.`,
          });

          candidates = [
            {
              nextPosition: position,
              children: [makeNode("ε", "epsilon")],
            },
          ];
        } else {
          candidates = parseSequence(
            right,
            0,
            position,
            depth,
            nextCallStack,
            production
          );
        }

        if (candidates.length === 0) {
          addStep({
            kind: "backtrack",
            position,
            callStack: stringifyCallStack(nextCallStack),
            depth,
            nonTerminal,
            production,
            message: `La producción ${formatProduction(
              production
            )} falló. Se retrocede para probar otra alternativa.`,
          });

          continue;
        }

        for (const candidate of candidates) {
          const node = makeNode(nonTerminal, "non-terminal", candidate.children, {
            productionId: production.id,
          });

          addStep({
            kind: "return-success",
            position: candidate.nextPosition,
            callStack: stringifyCallStack(nextCallStack),
            depth,
            nonTerminal,
            production,
            message: `La producción ${formatProduction(
              production
            )} tuvo éxito. Nueva posición: ${candidate.nextPosition}.`,
          });

          attempts.push({
            nextPosition: candidate.nextPosition,
            node,
            production,
          });

          if (attempts.length >= maxBranches) {
            return attempts;
          }
        }
      }

      if (attempts.length === 0) {
        addStep({
          kind: "return-failure",
          position,
          callStack: stringifyCallStack(nextCallStack),
          depth,
          nonTerminal,
          expected: nonTerminal,
          found: getFoundToken(tokens, position),
          message: `Ninguna producción de ${nonTerminal} pudo aplicarse en la posición ${position}.`,
        });
      }

      return attempts;
    };

    const attempts = parseNonTerminal(startSymbol, 0, 0, []);
    const acceptedAttempt = attempts.find(
      (attempt) => attempt.nextPosition === tokens.length
    );

    if (acceptedAttempt) {
      addStep({
        kind: "accept",
        position: acceptedAttempt.nextPosition,
        callStack: [],
        depth: 0,
        nonTerminal: startSymbol,
        message: "La cadena fue aceptada por descenso recursivo.",
      });

      return {
        accepted: true,
        tokens,
        finalPosition: acceptedAttempt.nextPosition,
        steps,
        tree: acceptedAttempt.node,
        leftRecursions,
        errors,
      };
    }

    const farthestAttempt = attempts.reduce<ParseAttempt | undefined>(
      (best, current) => {
        if (!best || current.nextPosition > best.nextPosition) {
          return current;
        }

        return best;
      },
      undefined
    );

    const finalPosition = farthestAttempt?.nextPosition ?? 0;

    const rejectMessage =
      attempts.length > 0
        ? `La gramática pudo consumir hasta la posición ${finalPosition}, pero quedó entrada pendiente: ${
            tokens.slice(finalPosition).join(" ") || "$"
          }.`
        : "La cadena no pudo derivarse desde el símbolo inicial.";

    errors.push(rejectMessage);

    addStep({
      kind: "reject",
      position: finalPosition,
      callStack: [],
      depth: 0,
      nonTerminal: startSymbol,
      found: getFoundToken(tokens, finalPosition),
      message: rejectMessage,
    });

return {
  accepted: false,
  tokens,
  finalPosition,
  steps,
  ...(farthestAttempt ? { tree: farthestAttempt.node } : {}),
  leftRecursions,
  errors,
};
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Ocurrió un error desconocido durante el descenso recursivo.";

    errors.push(message);

    steps.push({
      index: steps.length,
      kind: "error",
      position: 0,
      input: tokens,
      remainingInput: tokens,
      callStack: [],
      depth: 0,
      message,
    });

    return {
      accepted: false,
      tokens,
      finalPosition: 0,
      steps,
      leftRecursions,
      errors,
    };
  }
}

export const parseRecursiveDescent = runRecursiveDescent;
export const analyzeRecursiveDescent = runRecursiveDescent;