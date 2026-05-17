/**
 * ParserLab Pro - LL(1) Engine
 *
 * Responsabilidad:
 * - Construir tabla predictiva LL(1).
 * - Detectar conflictos de tabla.
 * - Exponer evidencia útil para UI, Conflict Lab e IA Grammar Doctor.
 */

import {
  EOF,
  EPSILON,
  formatProduction,
  type Grammar,
  type NonTerminal,
  type Production,
  type Terminal
} from "./grammar";

import {
  firstOfSequence,
  type SymbolSetMap
} from "./firstFollow";

export interface LL1Conflict {
  nonTerminal: NonTerminal;
  terminal: Terminal;
  existingProduction: Production;
  incomingProduction: Production;
  reason: string;
}

export type LL1Table = Record<
  NonTerminal,
  Record<Terminal, Production | undefined>
>;

export interface LL1TableResult {
  table: LL1Table;
  conflicts: LL1Conflict[];
  terminals: Terminal[];
}

export function buildLL1Table(
  grammar: Grammar,
  firstSets: SymbolSetMap,
  followSets: SymbolSetMap
): LL1TableResult {
  const terminals = [...grammar.terminals, EOF];
  const table: LL1Table = {};
  const conflicts: LL1Conflict[] = [];

  for (const nonTerminal of grammar.nonTerminals) {
    table[nonTerminal] = {};

    for (const terminal of terminals) {
      table[nonTerminal]![terminal] = undefined;
    }
  }

  for (const production of grammar.productions) {
    const firstAlpha = firstOfSequence(
      grammar,
      production.right,
      firstSets
    );

    for (const terminal of firstAlpha) {
      if (terminal === EPSILON) continue;

      insertProduction(
        table,
        conflicts,
        production,
        production.left,
        terminal
      );
    }

    if (firstAlpha.includes(EPSILON)) {
      for (const terminal of followSets[production.left] ?? []) {
        insertProduction(
          table,
          conflicts,
          production,
          production.left,
          terminal
        );
      }
    }
  }

  return {
    table,
    conflicts,
    terminals
  };
}

function insertProduction(
  table: LL1Table,
  conflicts: LL1Conflict[],
  production: Production,
  nonTerminal: NonTerminal,
  terminal: Terminal
): void {
  const row = table[nonTerminal];

  if (!row) {
    throw new Error(
      `No existe fila LL(1) para el no terminal ${nonTerminal}.`
    );
  }

  const existing = row[terminal];

  if (!existing) {
    row[terminal] = production;
    return;
  }

  if (existing.id === production.id) return;

  conflicts.push({
    nonTerminal,
    terminal,
    existingProduction: existing,
    incomingProduction: production,
    reason:
      `Conflicto LL(1) en M[${nonTerminal}, ${terminal}]: ` +
      `${formatProduction(existing)} y ${formatProduction(production)} ` +
      `compiten por la misma celda.`
  });
}

export function isLL1(result: LL1TableResult): boolean {
  return result.conflicts.length === 0;
}

export function formatLL1Table(result: LL1TableResult): string[][] {
  const header = ["No terminal", ...result.terminals];
  const rows: string[][] = [header];

  for (const [nonTerminal, row] of Object.entries(result.table)) {
    rows.push([
      nonTerminal,
      ...result.terminals.map((terminal) => {
        const production = row[terminal];

        return production ? formatProduction(production) : "";
      })
    ]);
  }

  return rows;
}

export function explainLL1Conflict(conflict: LL1Conflict): string {
  return [
    `En la celda M[${conflict.nonTerminal}, ${conflict.terminal}] aparecen dos producciones posibles.`,
    `Primera: ${formatProduction(conflict.existingProduction)}.`,
    `Segunda: ${formatProduction(conflict.incomingProduction)}.`,
    "Esto significa que con un solo token de mirada hacia adelante el parser no puede decidir de forma única."
  ].join(" ");
}