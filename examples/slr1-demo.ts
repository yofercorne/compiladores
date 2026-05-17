import {
  parseGrammar,
  computeFirstFollow,
  buildSLR1Table,
  simulateSLR1,
  formatSLR1ActionTable,
  formatSLR1GotoTable,
  formatProduction
} from "../src/parser-engine";

const source = `
S -> C C
C -> c C | d
`;

const input = "c d d";

const parsed = parseGrammar(source);

if (!parsed.grammar) {
  console.error(parsed.issues);
  throw new Error("Gramática inválida.");
}

const grammar = parsed.grammar;

const { follow } = computeFirstFollow(grammar);

const slr1 = buildSLR1Table(grammar, follow);

console.log("=== Producciones ===");

for (const production of slr1.automaton.productions) {
  console.log(`${production.id}: ${formatProduction(production)}`);
}

console.log("\n=== FOLLOW ===");
console.table(follow);

console.log("\n=== ACTION ===");
console.table(formatSLR1ActionTable(slr1));

console.log("\n=== GOTO ===");
console.table(formatSLR1GotoTable(slr1));

if (slr1.conflicts.length > 0) {
  console.log("\n=== Conflictos SLR(1) ===");
  console.dir(slr1.conflicts, { depth: null });
}

const simulation = simulateSLR1(grammar, slr1, input);

console.log("\n=== Simulación SLR(1) ===");

console.table(
  simulation.steps.map((step) => ({
    i: step.index,
    action: step.action,
    states: step.stateStack.join(" "),
    symbols: step.symbolStack.join(" "),
    input: step.input.join(" "),
    production: step.production ? formatProduction(step.production) : "",
    toState: step.toState ?? "",
    explanation: step.explanation
  }))
);

console.log("\nResultado:", simulation.accepted ? "ACEPTADA" : "RECHAZADA");