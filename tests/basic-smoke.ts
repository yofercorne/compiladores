import {
  parseGrammar,
  computeFirstFollow,
  buildLL1Table,
  simulateLL1
} from "../src/parser-engine";

const source = `
S -> A
A -> a A | ε
`;

const parsed = parseGrammar(source);

if (!parsed.grammar) {
  throw new Error("La gramática debería ser válida.");
}

const { first, follow } = computeFirstFollow(parsed.grammar);

const table = buildLL1Table(
  parsed.grammar,
  first,
  follow
);

if (table.conflicts.length > 0) {
  throw new Error("La gramática debería ser LL(1).");
}

const result = simulateLL1(
  parsed.grammar,
  table.table,
  "a a a"
);

if (!result.accepted) {
  throw new Error("La cadena debería ser aceptada.");
}

console.log("Smoke test OK");