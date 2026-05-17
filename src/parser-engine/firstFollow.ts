/**
 * ParserLab Pro - FIRST/FOLLOW Engine
 *
 * Responsabilidad:
 * - Calcular FIRST para terminales, no terminales y secuencias.
 * - Calcular FOLLOW para no terminales.
 * - Mantener resultados deterministas y serializables.
 */

import {
  EOF,
  EPSILON,
  type Grammar,
  type NonTerminal,
  type SymbolName,
  getProductionsFor,
  isNonTerminal,
  isTerminal
} from "./grammar";

export type SymbolSetMap = Record<string, string[]>;

export interface FirstFollowResult {
  first: SymbolSetMap;
  follow: SymbolSetMap;
}

function addToSet(target: Set<string>, values: Iterable<string>): boolean {
  let changed = false;

  for (const value of values) {
    if (!target.has(value)) {
      target.add(value);
      changed = true;
    }
  }

  return changed;
}

function sortedRecord(map: Map<string, Set<string>>): SymbolSetMap {
  const result: SymbolSetMap = {};

  for (const [key, value] of map.entries()) {
    result[key] = [...value].sort((a, b) => {
      if (a === EPSILON) return 1;
      if (b === EPSILON) return -1;
      if (a === EOF) return 1;
      if (b === EOF) return -1;

      return a.localeCompare(b);
    });
  }

  return result;
}

export function computeFirstSets(grammar: Grammar): SymbolSetMap {
  const first = new Map<string, Set<string>>();

  for (const terminal of grammar.terminals) {
    first.set(terminal, new Set([terminal]));
  }

  first.set(EPSILON, new Set([EPSILON]));
  first.set(EOF, new Set([EOF]));

  for (const nonTerminal of grammar.nonTerminals) {
    first.set(nonTerminal, new Set());
  }

  let changed = true;

  while (changed) {
    changed = false;

    for (const production of grammar.productions) {
      const leftFirst = first.get(production.left)!;
      const sequenceFirst = firstOfSequenceInternal(
        grammar,
        production.right,
        first
      );

      if (addToSet(leftFirst, sequenceFirst)) {
        changed = true;
      }
    }
  }

  return sortedRecord(first);
}

export function firstOfSequence(
  grammar: Grammar,
  sequence: SymbolName[],
  firstSets: SymbolSetMap
): string[] {
  const firstMap = new Map<string, Set<string>>();

  for (const [symbol, values] of Object.entries(firstSets)) {
    firstMap.set(symbol, new Set(values));
  }

  return [...firstOfSequenceInternal(grammar, sequence, firstMap)].sort();
}

function firstOfSequenceInternal(
  grammar: Grammar,
  sequence: SymbolName[],
  first: Map<string, Set<string>>
): Set<string> {
  const result = new Set<string>();

  if (sequence.length === 0) {
    result.add(EPSILON);
    return result;
  }

  for (const symbol of sequence) {
    if (symbol === EPSILON) {
      result.add(EPSILON);
      return result;
    }

    if (isTerminal(grammar, symbol)) {
      result.add(symbol);
      return result;
    }

    if (!isNonTerminal(grammar, symbol)) {
      result.add(symbol);
      return result;
    }

    const symbolFirst = first.get(symbol) ?? new Set<string>();

    for (const value of symbolFirst) {
      if (value !== EPSILON) {
        result.add(value);
      }
    }

    if (!symbolFirst.has(EPSILON)) {
      return result;
    }
  }

  result.add(EPSILON);
  return result;
}

export function computeFollowSets(
  grammar: Grammar,
  firstSets: SymbolSetMap
): SymbolSetMap {
  const follow = new Map<NonTerminal, Set<string>>();

  for (const nonTerminal of grammar.nonTerminals) {
    follow.set(nonTerminal, new Set());
  }

  follow.get(grammar.startSymbol)!.add(EOF);

  let changed = true;

  while (changed) {
    changed = false;

    for (const production of grammar.productions) {
      const right = production.right;

    for (let i = 0; i < right.length; i++) {
        const current = right[i];

        if (current === undefined) continue;
        if (!isNonTerminal(grammar, current)) continue;

        const beta = right.slice(i + 1);
        const firstBeta = firstOfSequence(grammar, beta, firstSets);
        const withoutEpsilon = firstBeta.filter(
          (symbol) => symbol !== EPSILON
        );

        if (addToSet(follow.get(current)!, withoutEpsilon)) {
          changed = true;
        }

        if (beta.length === 0 || firstBeta.includes(EPSILON)) {
          const leftFollow = follow.get(production.left)!;

          if (addToSet(follow.get(current)!, leftFollow)) {
            changed = true;
          }
        }
      }
    }
  }

  return sortedRecord(follow);
}

export function computeFirstFollow(grammar: Grammar): FirstFollowResult {
  const first = computeFirstSets(grammar);
  const follow = computeFollowSets(grammar, first);

  return { first, follow };
}

export function explainFirst(
  grammar: Grammar,
  nonTerminal: NonTerminal,
  firstSets: SymbolSetMap
): string {
  const productions = getProductionsFor(grammar, nonTerminal);

  if (productions.length === 0) {
    return `No hay producciones para ${nonTerminal}.`;
  }

  return `FIRST(${nonTerminal}) = { ${
    firstSets[nonTerminal]?.join(", ") ?? ""
  } }`;
}

export function explainFollow(
  grammar: Grammar,
  nonTerminal: NonTerminal,
  followSets: SymbolSetMap
): string {
  const extra =
    nonTerminal === grammar.startSymbol
      ? " Contiene $ porque es el símbolo inicial."
      : "";

  return `FOLLOW(${nonTerminal}) = { ${
    followSets[nonTerminal]?.join(", ") ?? ""
  } }.${extra}`;
}