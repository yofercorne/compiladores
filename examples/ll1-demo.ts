import {
  parseGrammar,
  computeFirstFollow,
  buildLL1Table,
  formatLL1Table,
  simulateLL1,
  formatProduction
} from "../src/parser-engine";

const source = `
S -> a A | a B
A -> b
B -> c
`;

const parsed = parseGrammar(source);

if (!parsed.grammar) {
  console.error("Errores de gramática:");
  console.error(parsed.issues);

  throw new Error("No se pudo parsear la gramática.");
}

const grammar = parsed.grammar;

const { first, follow } = computeFirstFollow(grammar);

const ll1 = buildLL1Table(grammar, first, follow);

console.log("=== Producciones ===");

for (const production of grammar.productions) {
  console.log(`${production.id}: ${formatProduction(production)}`);
}

console.log("\n=== Terminales ===");
console.log(grammar.terminals);

console.log("\n=== No terminales ===");
console.log(grammar.nonTerminals);

console.log("\n=== FIRST ===");
console.table(first);

console.log("\n=== FOLLOW ===");
console.table(follow);

console.log("\n=== Tabla LL(1) ===");
console.table(formatLL1Table(ll1));

if (ll1.conflicts.length > 0) {
  console.log("\n=== Conflictos ===");
  console.dir(ll1.conflicts, { depth: null });
}

const simulation = simulateLL1(grammar, ll1.table, "id + * id");

console.log("\n=== Simulación ===");

console.table(
  simulation.steps.map((step) => ({
    i: step.index,
    action: step.action,
    stack: step.stack.join(" "),
    input: step.input.join(" "),
    explanation: step.explanation
  }))
);

console.log(
  "\nResultado:",
  simulation.accepted ? "ACEPTADA" : "RECHAZADA"
);