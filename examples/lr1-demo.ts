import {
  parseGrammar,
  computeFirstFollow,
  buildLR1Table,
  simulateLR1,
  formatLR1ActionTable,
  formatLR1GotoTable,
  formatLR1State,
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

const { first } = computeFirstFollow(grammar);

const lr1 = buildLR1Table(grammar, first);

console.log("=== Producciones ===");

for (const production of lr1.automaton.productions) {
  console.log(`${production.id}: ${formatProduction(production)}`);
}

console.log("\n=== Autómata LR(1) ===");

for (const state of lr1.automaton.states) {
  console.log(`\nI${state.id}`);

  for (const item of formatLR1State(state, lr1.automaton.productions)) {
    console.log(`  ${item}`);
  }

  console.log("Transiciones:", state.transitions);

  if (state.isAcceptState) {
    console.log("Estado de aceptación");
  }

  if (state.isReduceState) {
    console.log("Estado de reducción");
  }
}

console.log("\n=== ACTION LR(1) ===");
console.table(formatLR1ActionTable(lr1));

console.log("\n=== GOTO LR(1) ===");
console.table(formatLR1GotoTable(lr1));

if (lr1.conflicts.length > 0) {
  console.log("\n=== Conflictos LR(1) ===");
  console.dir(lr1.conflicts, { depth: null });
}

const simulation = simulateLR1(grammar, lr1, input);

console.log("\n=== Simulación LR(1) ===");

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