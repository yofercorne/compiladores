import {
  parseGrammar,
  computeFirstFollow,
  buildLALR1Table,
  simulateLALR1,
  formatLALR1ActionTable,
  formatLALR1GotoTable,
  formatLALR1State,
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

const lalr1 = buildLALR1Table(grammar, first);

console.log("=== Producciones ===");

for (const production of lalr1.automaton.productions) {
  console.log(`${production.id}: ${formatProduction(production)}`);
}

console.log("\n=== Autómata LALR(1) ===");

for (const state of lalr1.automaton.states) {
  console.log(`\nI${state.id}`);

  console.log(
    `Fusionado desde estados LR(1): ${state.mergedFrom
      .map((id) => `I${id}`)
      .join(", ")}`
  );

  for (const item of formatLALR1State(
    state,
    lalr1.automaton.productions
  )) {
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

console.log("\n=== ACTION LALR(1) ===");
console.table(formatLALR1ActionTable(lalr1));

console.log("\n=== GOTO LALR(1) ===");
console.table(formatLALR1GotoTable(lalr1));

if (lalr1.conflicts.length > 0) {
  console.log("\n=== Conflictos LALR(1) ===");
  console.dir(lalr1.conflicts, { depth: null });
}

const simulation = simulateLALR1(grammar, lalr1, input);

console.log("\n=== Simulación LALR(1) ===");

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

console.log(
  "\nResultado:",
  simulation.accepted ? "ACEPTADA" : "RECHAZADA"
);
