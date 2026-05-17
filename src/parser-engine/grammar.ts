/**
 * ParserLab Pro - Grammar Engine
 *
 * Responsabilidad:
 * - Leer gramáticas escritas por el usuario.
 * - Normalizar flechas, epsilon y alternativas.
 * - Detectar terminales, no terminales y símbolo inicial.
 * - Generar una representación tipada y reutilizable por todos los parsers.
 */

export const EPSILON = "ε" as const;
export const EOF = "$" as const;
export const AUGMENTED_START_SUFFIX = "'" as const;

export type SymbolName = string;
export type Terminal = string;
export type NonTerminal = string;

export interface Production {
  id: string;
  left: NonTerminal;
  right: SymbolName[];
  raw: string;
}

export interface Grammar {
  startSymbol: NonTerminal;
  augmentedStartSymbol: NonTerminal;
  productions: Production[];
  terminals: Terminal[];
  nonTerminals: NonTerminal[];
}

export interface GrammarParseIssue {
  line: number;
  message: string;
  severity: "error" | "warning";
}

export interface GrammarParseResult {
  grammar?: Grammar;
  issues: GrammarParseIssue[];
}

interface RawRule {
  line: number;
  left: string;
  alternatives: string[][];
  raw: string;
}

const ARROW_REGEX = /\s*(->|→|::=)\s*/;
const EPSILON_ALIASES = new Set(["ε", "eps", "epsilon", "lambda", "λ"]);

function cleanLine(line: string): string {
  return line
    .replace(/\/\/.*$/g, "")
    .replace(/#.*$/g, "")
    .trim();
}

function normalizeSymbol(symbol: string): string {
  const trimmed = symbol.trim();
  return EPSILON_ALIASES.has(trimmed.toLowerCase()) ? EPSILON : trimmed;
}

function tokenizeAlternative(alt: string): string[] {
  const trimmed = alt.trim();

  if (!trimmed || EPSILON_ALIASES.has(trimmed.toLowerCase())) {
    return [EPSILON];
  }

  return trimmed
    .split(/\s+/)
    .map(normalizeSymbol)
    .filter(Boolean);
}

export function parseGrammar(
  input: string,
  explicitStartSymbol?: string
): GrammarParseResult {
  const issues: GrammarParseIssue[] = [];
  const rules: RawRule[] = [];

  const lines = input.split(/\r?\n/);

  lines.forEach((originalLine, index) => {
    const lineNumber = index + 1;
    const line = cleanLine(originalLine);

    if (!line) return;

    const arrowMatch = line.match(ARROW_REGEX);

    if (!arrowMatch || arrowMatch.index === undefined) {
      issues.push({
        line: lineNumber,
        severity: "error",
        message: "La producción debe usar una flecha válida: ->, → o ::=."
      });
      return;
    }

    const left = line.slice(0, arrowMatch.index).trim();
    const rightText = line
      .slice(arrowMatch.index + arrowMatch[0].length)
      .trim();

    if (!left) {
      issues.push({
        line: lineNumber,
        severity: "error",
        message: "La producción no tiene lado izquierdo."
      });
      return;
    }

    if (/\s/.test(left)) {
      issues.push({
        line: lineNumber,
        severity: "error",
        message: `El lado izquierdo "${left}" debe ser un único no terminal.`
      });
      return;
    }

    if (!rightText) {
      issues.push({
        line: lineNumber,
        severity: "error",
        message: `La producción de "${left}" no tiene lado derecho. Usa ε si representa vacío.`
      });
      return;
    }

    const alternatives = rightText.split("|").map(tokenizeAlternative);

    for (const alt of alternatives) {
      if (alt.includes(EPSILON) && alt.length > 1) {
        issues.push({
          line: lineNumber,
          severity: "error",
          message: `La alternativa de "${left}" mezcla ε con otros símbolos. ε debe aparecer sola.`
        });
      }
    }

    rules.push({
      line: lineNumber,
      left,
      alternatives,
      raw: line
    });
  });

  if (issues.some((issue) => issue.severity === "error")) {
    return { issues };
  }

  if (rules.length === 0) {
    return {
      issues: [
        {
          line: 1,
          severity: "error",
          message: "No se encontró ninguna producción válida."
        }
      ]
    };
  }

  const nonTerminalSet = new Set<NonTerminal>();

  for (const rule of rules) {
    nonTerminalSet.add(rule.left);
  }

  const startSymbol = explicitStartSymbol?.trim() || rules[0]!.left;

  if (!nonTerminalSet.has(startSymbol)) {
    issues.push({
      line: 1,
      severity: "error",
      message: `El símbolo inicial "${startSymbol}" no aparece como no terminal.`
    });

    return { issues };
  }

  const productions: Production[] = [];
  const seenProductionKeys = new Set<string>();

  for (const rule of rules) {
    rule.alternatives.forEach((right, altIndex) => {
      const key = `${rule.left}->${right.join(" ")}`;

      if (seenProductionKeys.has(key)) {
        issues.push({
          line: rule.line,
          severity: "warning",
          message: `Producción duplicada ignorada: ${key}`
        });

        return;
      }

      seenProductionKeys.add(key);

      productions.push({
        id: `P${productions.length + 1}`,
        left: rule.left,
        right,
        raw: altIndex === 0 ? rule.raw : `${rule.left} -> ${right.join(" ")}`
      });
    });
  }

  const terminalSet = new Set<Terminal>();

  for (const production of productions) {
    for (const symbol of production.right) {
      if (symbol === EPSILON) continue;

      if (!nonTerminalSet.has(symbol)) {
        terminalSet.add(symbol);
      }
    }
  }

  const augmentedStartSymbol = makeAugmentedStartSymbol(
    startSymbol,
    nonTerminalSet
  );

  return {
    grammar: {
      startSymbol,
      augmentedStartSymbol,
      productions,
      terminals: [...terminalSet].sort(),
      nonTerminals: [...nonTerminalSet]
    },
    issues
  };
}

function makeAugmentedStartSymbol(
  startSymbol: NonTerminal,
  nonTerminals: Set<NonTerminal>
): NonTerminal {
  let candidate = `${startSymbol}${AUGMENTED_START_SUFFIX}`;

  while (nonTerminals.has(candidate)) {
    candidate += AUGMENTED_START_SUFFIX;
  }

  return candidate;
}

export function isTerminal(grammar: Grammar, symbol: SymbolName): boolean {
  return grammar.terminals.includes(symbol);
}

export function isNonTerminal(grammar: Grammar, symbol: SymbolName): boolean {
  return grammar.nonTerminals.includes(symbol);
}

export function getProductionsFor(
  grammar: Grammar,
  nonTerminal: NonTerminal
): Production[] {
  return grammar.productions.filter(
    (production) => production.left === nonTerminal
  );
}

export function formatProduction(production: Production): string {
  return `${production.left} -> ${production.right.join(" ")}`;
}