import {
  parseGrammar,
  buildLR0Automaton,
  formatLR0State
} from "../src/parser-engine";

const source = `
S -> C C
C -> c C | d
`;

const parsed = parseGrammar(source);

if (!parsed.grammar) {
  throw new Error("Gramática inválida.");
}

const { automaton } = buildLR0Automaton(parsed.grammar);

console.log("=== Autómata LR(0) ===");

for (const state of automaton.states) {
  console.log(`\nI${state.id}`);

  for (const item of formatLR0State(state, automaton.productions)) {
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