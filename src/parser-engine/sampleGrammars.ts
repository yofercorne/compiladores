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
    id: "ll1-basic-arithmetic",
    title: "Expresiones LL(1) corregidas",
    description: "Gramática clásica de expresiones con precedencia entre suma y multiplicación.",
    grammar: `E -> T E'
E' -> + T E' | ε
T -> F T'
T' -> * F T' | ε
F -> ( E ) | id`,
    input: "id + id * id",
    tags: ["LL(1)", "expresiones", "precedencia", "demo"],
  },
  {
    id: "ll1-parentheses-only",
    title: "Paréntesis balanceados",
    description: "Caso pequeño para probar ε, derivación y cadena vacía controlada.",
    grammar: `S -> ( S ) S | ε`,
    input: "( ( ) )",
    tags: ["LL(1)", "ε", "recursiva", "práctica"],
  },
  {
    id: "ll1-if-optional-else",
    title: "Sentencia if simplificada",
    description: "Ejemplo con parte opcional usando ε para analizar estructuras condicionales.",
    grammar: `S -> if E then S O | other
O -> else S | ε
E -> true | false`,
    input: "if true then other else other",
    tags: ["LL(1)", "ε", "sentencias", "opcional"],
  },
  {
    id: "ll1-list-comma",
    title: "Lista separada por comas",
    description: "Útil para mostrar repetición, FOLLOW y terminación por ε.",
    grammar: `L -> id R
R -> , id R | ε`,
    input: "id , id , id",
    tags: ["LL(1)", "ε", "listas", "FOLLOW"],
  },
  {
    id: "ll1-assignment",
    title: "Asignación simple",
    description: "Gramática corta para probar una cadena de asignación y una expresión mínima.",
    grammar: `S -> id = E
E -> T E'
E' -> + T E' | ε
T -> id | num`,
    input: "id = id + num",
    tags: ["LL(1)", "expresiones", "básica"],
  },
  {
    id: "not-ll1-left-recursion",
    title: "No LL(1): recursión izquierda",
    description: "Caso intencionalmente problemático para probar diagnóstico y refactorización.",
    grammar: `E -> E + T | T
T -> T * F | F
F -> ( E ) | id`,
    input: "id + id * id",
    tags: ["conflicto", "recursión izquierda", "refactor", "expresiones"],
  },
  {
    id: "not-ll1-left-factoring",
    title: "No LL(1): requiere factorización",
    description: "Dos alternativas empiezan igual; sirve para explicar FIRST/FIRST.",
    grammar: `S -> id = E | id ( A )
A -> id | ε
E -> id | num`,
    input: "id = num",
    tags: ["conflicto", "factorización", "LL(1)", "refactor"],
  },
  {
    id: "ambiguous-expression",
    title: "Ambigua: expresiones sin precedencia",
    description: "Genera conflictos porque no separa niveles de operadores.",
    grammar: `E -> E + E | E * E | ( E ) | id`,
    input: "id + id * id",
    tags: ["ambigua", "conflicto", "shift/reduce", "expresiones"],
  },
  {
    id: "lr0-balanced-a",
    title: "LR(0) simple",
    description: "Gramática pequeña para probar colección canónica LR(0) sin demasiada complejidad visual.",
    grammar: `S -> A
A -> a A | b`,
    input: "a a b",
    tags: ["LR(0)", "Bottom-Up", "autómata", "práctica"],
  },
  {
    id: "slr1-expression-corrected",
    title: "SLR(1): expresiones corregidas",
    description: "La versión estratificada funciona bien con ACTION/GOTO y FOLLOW.",
    grammar: `E -> E + T | T
T -> T * F | F
F -> ( E ) | id`,
    input: "id + id * id",
    tags: ["SLR(1)", "Bottom-Up", "expresiones", "FOLLOW"],
  },
  {
    id: "lr1-not-slr-classic",
    title: "LR(1) pero no SLR(1)",
    description: "Ejemplo clásico donde LR(1) necesita lookaheads más precisos que FOLLOW global.",
    grammar: `S -> A a | b A c | B c | b B a
A -> d
B -> d`,
    input: "b d a",
    tags: ["LR(1)", "no SLR(1)", "lookahead", "avanzado"],
  },
  {
    id: "lalr-merge-demo",
    title: "LALR(1): fusión compacta",
    description: "Ejemplo útil para comparar LR(1) canónico contra LALR(1).",
    grammar: `S -> C C
C -> c C | d`,
    input: "c d d",
    tags: ["LALR(1)", "LR(1)", "fusión", "Bottom-Up"],
  },
  {
    id: "reduce-reduce-demo",
    title: "Reduce/Reduce intencional",
    description: "Dos no terminales pueden reducir al mismo símbolo en una situación parecida.",
    grammar: `S -> A | B
A -> id
B -> id`,
    input: "id",
    tags: ["conflicto", "reduce/reduce", "LR", "diagnóstico"],
  },
  {
    id: "valid-invalid-contrast",
    title: "Cadena inválida controlada",
    description: "La gramática es correcta, pero la cadena inicial está mal para probar errores de simulación.",
    grammar: `S -> id = E
E -> id | num`,
    input: "id = + num",
    tags: ["error", "simulación", "práctica", "diagnóstico"],
  },
  {
    id: "epsilon-first-follow",
    title: "FIRST/FOLLOW con ε",
    description: "Ejemplo pequeño para verificar propagación de ε en FIRST y FOLLOW.",
    grammar: `S -> A B
A -> a A | ε
B -> b B | ε`,
    input: "a a b",
    tags: ["FIRST", "FOLLOW", "ε", "LL(1)"],
  },
  {
    id: "recursive-descent-friendly",
    title: "Descenso recursivo amigable",
    description: "Sin recursión izquierda y con alternativas fáciles de seguir como llamadas de funciones.",
    grammar: `S -> a S b | c`,
    input: "a a c b b",
    tags: ["descenso recursivo", "Top-Down", "práctica"],
  },
  {
    id: "grammar-with-empty-input",
    title: "Acepta cadena vacía",
    description: "Caso mínimo para probar entrada ε y aceptar sin consumir tokens.",
    grammar: `S -> A
A -> ε | a A`,
    input: "",
    tags: ["ε", "cadena vacía", "LL(1)", "básica"],
  },
  {
    id: "mini-json-like",
    title: "Mini JSON de listas",
    description: "Gramática tipo estructura anidada para una demo más cercana a lenguajes reales.",
    grammar: `V -> id | [ L ]
L -> V R | ε
R -> , V R | ε`,
    input: "[ id , [ id ] ]",
    tags: ["LL(1)", "listas", "anidado", "demo"],
  },
];
