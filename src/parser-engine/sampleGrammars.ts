export interface GrammarExample {
  id: string;
  title: string;
  description: string;
  grammar: string;
  input: string;
  tags: string[];
}

export const GRAMMAR_EXAMPLES: GrammarExample[] = [
  {
    id: "ll1-expressions",
    title: "Expresiones aritméticas LL(1)",
    description: "Gramática clásica para probar precedencia de + y *.",
    grammar: `E -> T E'
E' -> + T E' | ε
T -> F T'
T' -> * F T' | ε
F -> ( E ) | id`,
    input: "id + id * id",
    tags: ["LL(1)", "expresiones", "válida"]
  },
  {
    id: "simple-epsilon",
    title: "Gramática simple con ε",
    description: "Caso pequeño para verificar FIRST, FOLLOW y producciones vacías.",
    grammar: `S -> A
A -> a A | ε`,
    input: "a a a",
    tags: ["LL(1)", "epsilon"]
  },
  {
    id: "ll1-conflict",
    title: "Conflicto LL(1)",
    description: "Dos alternativas empiezan igual, por eso compiten en la misma celda.",
    grammar: `S -> a A | a B
A -> b
B -> c`,
    input: "a b",
    tags: ["conflicto", "no LL(1)"]
  },
  {
    id: "left-recursion",
    title: "Recursión izquierda",
    description: "Ejemplo típico que no es adecuado para LL(1).",
    grammar: `E -> E + T | T
T -> id`,
    input: "id + id",
    tags: ["recursión izquierda", "no LL(1)"]
  }
];