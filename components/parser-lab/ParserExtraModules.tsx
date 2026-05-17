"use client";

import { useMemo, useState, type ReactNode } from "react";

import {
  GRAMMAR_EXAMPLES,
  type Grammar,
  type GrammarExample,
  type GrammarParseIssue,
  type LL1TableResult,
  type LR0TableResult,
  type SLR1TableResult,
  type LR1TableResult,
  type LALR1TableResult,
  type LL1SimulationResult,
  type LR0SimulationResult,
  type SLR1SimulationResult,
  type LR1SimulationResult,
  type LALR1SimulationResult
} from "@/src/parser-engine";


import type { ParserLabModule } from "./ParserTopbar";

type ParserExtraModulesResult = {
  grammar?: Grammar;
  issues: GrammarParseIssue[];

  ll1?: LL1TableResult;
  simulation?: LL1SimulationResult;

  lr0?: LR0TableResult;
  lr0Simulation?: LR0SimulationResult;

  slr1?: SLR1TableResult;
  slr1Simulation?: SLR1SimulationResult;

  lr1?: LR1TableResult;
  lr1Simulation?: LR1SimulationResult;

  lalr1?: LALR1TableResult;
  lalr1Simulation?: LALR1SimulationResult;
};

type ParserExtraModulesProps = {
  activeModule: ParserLabModule;
  result: ParserExtraModulesResult | null;
  inputString: string;
  examples?: GrammarExample[];
  selectedExampleId?: string;
  onSelectExample?: (example: GrammarExample) => void;
};

type GrammarProduction = Grammar["productions"][number];

type UnknownConflict = {
  reason?: string;
  message?: string;
  type?: string;
  parser?: string;
  state?: number;
  stateId?: number;
  symbol?: string;
  terminal?: string;
  nonTerminal?: string;
  action?: unknown;
  actions?: unknown[];
  existingAction?: unknown;
  incomingAction?: unknown;
  production?: unknown;
  productionId?: string;
  item?: unknown;
  items?: unknown[];
};

type UnknownGrammarIssue = {
  message?: string;
  description?: string;
  type?: string;
  severity?: string;
  line?: number;
  column?: number;
};

type ConflictSeverity = "error" | "warn" | "info";

type ConflictCategory =
  | "table-conflict"
  | "left-recursion"
  | "ambiguity-signal"
  | "grammar-issue";

type ConflictDiagnostic = {
  id: string;
  parser: string;
  category: ConflictCategory;
  severity: ConflictSeverity;
  title: string;
  scope: string;
  reason: string;
  evidence: string[];
  suggestion: string;
  refactorHint: string;
};

type RefactorMode =
  | "left-recursion"
  | "left-factoring"
  | "epsilon"
  | "expression-levels";

type RefactorResult = {
  mode: RefactorMode;
  title: string;
  subtitle: string;
  changed: boolean;
  before: string;
  after: string;
  steps: string[];
  warnings: string[];
};

type ParserReportRow = {
  name: string;
  table: string;
  simulation: string;
  conflicts: number;
  status: "ok" | "warn" | "empty";
  recommendation: string;
};

export function ParserExtraModules({
  activeModule,
  result,
  inputString,
  examples = GRAMMAR_EXAMPLES,
  selectedExampleId,
  onSelectExample
}: ParserExtraModulesProps) {
  if (activeModule === "compare") {
    return <ParserCompareModule result={result} />;
  }

  if (activeModule === "conflict") {
    return <ParserConflictModule result={result} />;
  }

  if (activeModule === "refactor") {
    return <ParserRefactorModule result={result} />;
  }
if (activeModule === "gallery") {
  return (
    <ParserGalleryModule
      examples={examples}
      {...(selectedExampleId !== undefined
        ? { selectedExampleId }
        : {})}
      {...(onSelectExample !== undefined
        ? { onSelectExample }
        : {})}
    />
  );
}

  if (activeModule === "tutor") {
    return <ParserTutorModule result={result} inputString={inputString} />;
  }

  if (activeModule === "report") {
    return <ParserReportModule result={result} inputString={inputString} />;
  }

  return (
    <ExtraModuleFrame>
      <EmptyExtraState
        title="Módulo no disponible"
        description="Este módulo todavía no tiene una vista asociada."
      />
    </ExtraModuleFrame>
  );
}

function ParserCompareModule({
  result
}: {
  result: ParserExtraModulesResult | null;
}) {
  const cards = [
    {
      name: "Descenso recursivo",
      status: result?.grammar ? "warn" : "idle",
      detail: result?.grammar
        ? "Disponible como vista conceptual mediante árbol."
        : "Ejecuta una gramática para analizar compatibilidad.",
      score: result?.grammar ? 70 : 0
    },
    {
      name: "LL(1)",
      status: getConflictCount(result?.ll1) === 0 && result?.ll1 ? "pass" : "fail",
      detail: getConflictCount(result?.ll1)
        ? `${getConflictCount(result?.ll1)} conflicto(s) predictivo(s).`
        : result?.ll1
          ? "Tabla predictiva sin conflictos."
          : "Sin análisis.",
      score: result?.ll1 ? (getConflictCount(result.ll1) ? 45 : 100) : 0
    },
    {
      name: "LR(0)",
      status: getConflictCount(result?.lr0) === 0 && result?.lr0 ? "pass" : "fail",
      detail: getConflictCount(result?.lr0)
        ? `${getConflictCount(result?.lr0)} conflicto(s) LR(0).`
        : result?.lr0
          ? "Tabla LR(0) sin conflictos."
          : "Sin análisis.",
      score: result?.lr0 ? (getConflictCount(result.lr0) ? 35 : 100) : 0
    },
    {
      name: "SLR(1)",
      status: getConflictCount(result?.slr1) === 0 && result?.slr1 ? "pass" : "fail",
      detail: getConflictCount(result?.slr1)
        ? `${getConflictCount(result?.slr1)} conflicto(s) SLR(1).`
        : result?.slr1
          ? "Tabla SLR(1) sin conflictos."
          : "Sin análisis.",
      score: result?.slr1 ? (getConflictCount(result.slr1) ? 55 : 100) : 0
    },
    {
      name: "LR(1)",
      status: getConflictCount(result?.lr1) === 0 && result?.lr1 ? "pass" : "fail",
      detail: getConflictCount(result?.lr1)
        ? `${getConflictCount(result?.lr1)} conflicto(s) LR(1).`
        : result?.lr1
          ? "Tabla LR(1) sin conflictos."
          : "Sin análisis.",
      score: result?.lr1 ? (getConflictCount(result.lr1) ? 70 : 100) : 0
    },
    {
      name: "LALR(1)",
      status:
        getConflictCount(result?.lalr1) === 0 && result?.lalr1 ? "pass" : "fail",
      detail: getConflictCount(result?.lalr1)
        ? `${getConflictCount(result?.lalr1)} conflicto(s) LALR(1).`
        : result?.lalr1
          ? "Tabla LALR(1) sin conflictos."
          : "Sin análisis.",
      score: result?.lalr1 ? (getConflictCount(result.lalr1) ? 70 : 100) : 0
    }
  ] as const;

  return (
    <ExtraModuleFrame>
      <ModuleHeader
        eyebrow="Parser Comparison Arena"
        title="Comparación de analizadores"
        description="Evalúa qué analizadores son más adecuados para la gramática actual."
      />

      {!result ? (
        <EmptyExtraState
          title="Sin análisis"
          description="Ejecuta una gramática para comparar compatibilidad entre parsers."
        />
      ) : (
        <>
          <div className="compare-grid">
            {cards.map((card) => (
              <div
                key={card.name}
                className={`compare-card ${
                  card.status === "pass"
                    ? "pass"
                    : card.status === "warn"
                      ? "warn"
                      : card.status === "fail"
                        ? "fail"
                        : ""
                }`}
              >
                <div className="cc-status">
                  {card.status === "pass"
                    ? "✓"
                    : card.status === "warn"
                      ? "~"
                      : card.status === "fail"
                        ? "✗"
                        : "·"}
                </div>

                <div
                  className="cc-name"
                  style={{
                    color:
                      card.status === "pass"
                        ? "var(--green)"
                        : card.status === "warn"
                          ? "var(--amber)"
                          : card.status === "fail"
                            ? "var(--red)"
                            : "var(--txt2)"
                  }}
                >
                  {card.name}
                </div>

                <div className="cc-detail">{card.detail}</div>

                <div className="cc-bar">
                  <div
                    className="cc-fill"
                    style={{
                      width: `${card.score}%`,
                      background:
                        card.status === "pass"
                          ? "var(--green)"
                          : card.status === "warn"
                            ? "var(--amber)"
                            : "var(--red)"
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <InfoBox>
            Recomendación automática: usa el parser más simple que no tenga
            conflictos. Si LL(1) falla pero LALR(1) no, LALR(1) suele ser mejor
            para una implementación bottom-up compacta.
          </InfoBox>
        </>
      )}
    </ExtraModuleFrame>
  );
}

function ParserConflictModule({
  result
}: {
  result: ParserExtraModulesResult | null;
}) {
  const diagnostics = collectConflictDiagnostics(result);
  const errors = diagnostics.filter((item) => item.severity === "error").length;
  const warnings = diagnostics.filter((item) => item.severity === "warn").length;
  const infos = diagnostics.filter((item) => item.severity === "info").length;

  return (
    <ExtraModuleFrame>
      <ModuleHeader
        eyebrow="Conflict Lab"
        title="Laboratorio de conflictos"
        description="Detecta conflictos de tablas, recursión izquierda y señales de posible ambigüedad. Las transformaciones se dejan preparadas para el módulo Refactor."
      />

      {!result ? (
        <EmptyExtraState
          title="Sin análisis"
          description="Ejecuta una gramática para detectar conflictos, recursión izquierda y posibles ambigüedades."
        />
      ) : diagnostics.length === 0 ? (
        <SuccessCard
          title="Sin conflictos detectados"
          description="No se encontraron conflictos de tabla, recursión izquierda ni señales fuertes de ambigüedad en el análisis actual."
        />
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 10
            }}
          >
            <ConflictSummaryCard
              label="Críticos"
              value={errors}
              tone="error"
              detail="Bloquean algún parser o lectura."
            />
            <ConflictSummaryCard
              label="Alertas"
              value={warnings}
              tone="warn"
              detail="Requieren revisión formal."
            />
            <ConflictSummaryCard
              label="Notas"
              value={infos}
              tone="info"
              detail="Observaciones pedagógicas."
            />
          </div>

          <InfoBox>
            Importante: la ambigüedad exacta no siempre se puede decidir de
            forma automática para cualquier gramática. Por eso aquí se muestran
            señales probables: conflictos LR(1), patrones como E → E op E y
            alternativas que compiten por el mismo inicio.
          </InfoBox>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {diagnostics.map((diagnostic) => (
              <div
                key={diagnostic.id}
                className="conflict-card"
                style={{
                  borderColor: getSeverityBorder(diagnostic.severity),
                  background: getSeverityBackground(diagnostic.severity)
                }}
              >
                <div className="conf-head">
                  <span
                    className="conf-type"
                    style={{
                      color: getSeverityColor(diagnostic.severity),
                      borderColor: getSeverityBorder(diagnostic.severity)
                    }}
                  >
                    {getSeverityIcon(diagnostic.severity)} {diagnostic.parser}
                  </span>

                  <span className="conf-state">{diagnostic.scope}</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                    marginBottom: 8
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: 0.7,
                      color: getSeverityColor(diagnostic.severity)
                    }}
                  >
                    {getCategoryLabel(diagnostic.category)}
                  </span>

                  <strong style={{ color: "var(--txt0)", fontSize: 13 }}>
                    {diagnostic.title}
                  </strong>
                </div>

                <div className="conf-explain">{diagnostic.reason}</div>

                {diagnostic.evidence.length > 0 ? (
                  <div
                    style={{
                      marginTop: 10,
                      display: "grid",
                      gap: 6
                    }}
                  >
                    {diagnostic.evidence.map((line) => (
                      <code
                        key={line}
                        style={{
                          display: "block",
                          padding: "7px 9px",
                          borderRadius: 8,
                          background: "var(--bg4)",
                          border: "1px solid var(--border)",
                          color: "var(--txt1)",
                          fontSize: 11,
                          whiteSpace: "pre-wrap"
                        }}
                      >
                        {line}
                      </code>
                    ))}
                  </div>
                ) : null}

                <div className="conf-suggest">
                  💡 {diagnostic.suggestion}
                  {diagnostic.refactorHint ? (
                    <>
                      <br />
                      <span style={{ color: "var(--accent2)" }}>
                        Refactor: {diagnostic.refactorHint}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </ExtraModuleFrame>
  );
}

function ConflictSummaryCard({
  label,
  value,
  tone,
  detail
}: {
  label: string;
  value: number;
  tone: ConflictSeverity;
  detail: string;
}) {
  return (
    <div
      style={{
        border: `1px solid ${getSeverityBorder(tone)}`,
        background: getSeverityBackground(tone),
        borderRadius: "var(--r)",
        padding: 12
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: 0.8,
          textTransform: "uppercase",
          color: getSeverityColor(tone)
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 4,
          fontSize: 24,
          fontWeight: 900,
          color: "var(--txt0)"
        }}
      >
        {value}
      </div>

      <div style={{ marginTop: 2, fontSize: 11, color: "var(--txt2)" }}>
        {detail}
      </div>
    </div>
  );
}

function ParserRefactorModule({
  result
}: {
  result: ParserExtraModulesResult | null;
}) {
  const [mode, setMode] = useState<RefactorMode>("left-recursion");
  const [copied, setCopied] = useState(false);
  const grammar = result?.grammar;
  const refactorResult = useMemo(
    () => (grammar ? buildRefactorResult(grammar, mode) : null),
    [grammar, mode]
  );
  const relatedDiagnostics = useMemo(
    () =>
      collectConflictDiagnostics(result).filter(
        (diagnostic) =>
          diagnostic.category === "left-recursion" ||
          diagnostic.category === "ambiguity-signal" ||
          diagnostic.parser === "LL(1)"
      ),
    [result]
  );

  const options: {
    mode: RefactorMode;
    label: string;
    description: string;
  }[] = [
    {
      mode: "left-recursion",
      label: "Eliminar rec. izquierda",
      description: "Convierte A → A α | β en A → β A' y A' → α A' | ε."
    },
    {
      mode: "left-factoring",
      label: "Factorizar izquierda",
      description: "Extrae prefijos comunes para reducir conflictos LL(1)."
    },
    {
      mode: "epsilon",
      label: "Normalizar ε",
      description: "Reconstruye la gramática usando ε de forma uniforme."
    },
    {
      mode: "expression-levels",
      label: "Separar precedencia",
      description: "Sugiere una forma Expr/Term/Factor para expresiones."
    }
  ];

  async function handleCopy() {
    if (!refactorResult) return;

    const ok = await copyToClipboard(refactorResult.after);
    setCopied(ok);
  }

  function handleDownload() {
    if (!refactorResult) return;

    downloadTextFile(
      "parserlab-grammar-refactor.txt",
      refactorResult.after,
      "text/plain;charset=utf-8"
    );
  }

  return (
    <ExtraModuleFrame>
      <ModuleHeader
        eyebrow="Grammar Refactor Studio"
        title="Refactorización asistida"
        description="Genera transformaciones reales de la gramática y muestra antes/después sin aplicar cambios opacos al editor."
      />

      {!grammar || !refactorResult ? (
        <EmptyExtraState
          title="Sin gramática válida"
          description="Ejecuta una gramática válida para obtener sugerencias de refactorización."
        />
      ) : (
        <>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {options.map((option) => (
                <button
                  key={option.mode}
                  type="button"
                  className={`pill-btn ${mode === option.mode ? "primary" : ""}`}
                  onClick={() => {
                    setMode(option.mode);
                    setCopied(false);
                  }}
                  title={option.description}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <InfoBox>
              {options.find((option) => option.mode === mode)?.description}
            </InfoBox>
          </div>

          {relatedDiagnostics.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: 10
              }}
            >
              {relatedDiagnostics.slice(0, 3).map((diagnostic) => (
                <div
                  key={diagnostic.id}
                  style={{
                    border: `1px solid ${getSeverityBorder(diagnostic.severity)}`,
                    background: getSeverityBackground(diagnostic.severity),
                    borderRadius: "var(--r)",
                    padding: 12
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: 0.7,
                      textTransform: "uppercase",
                      color: getSeverityColor(diagnostic.severity)
                    }}
                  >
                    {getCategoryLabel(diagnostic.category)}
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 12,
                      fontWeight: 800,
                      color: "var(--txt0)"
                    }}
                  >
                    {diagnostic.title}
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 11,
                      lineHeight: 1.6,
                      color: "var(--txt2)"
                    }}
                  >
                    {diagnostic.refactorHint || diagnostic.suggestion}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="diff-block">
            <div className="diff-head">
              <span>{refactorResult.title}</span>
              <span
                style={{
                  color: refactorResult.changed ? "var(--green)" : "var(--amber)",
                  fontSize: 10
                }}
              >
                {refactorResult.changed ? "transformación generada" : "sin cambios necesarios"}
              </span>
            </div>

            <div style={{ padding: "10px 12px", color: "var(--txt2)", fontSize: 12 }}>
              {refactorResult.subtitle}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 10,
                padding: "0 12px 12px"
              }}
            >
              <GrammarPreview title="Antes" tone="remove" text={refactorResult.before} />
              <GrammarPreview title="Después" tone="add" text={refactorResult.after} />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: 10
            }}
          >
            <div className="report-sec">
              <div className="report-sec-title">
                <div className="report-check">✓</div>
                Pasos aplicados
              </div>

              <ul style={{ margin: 0, paddingLeft: 18, color: "var(--txt2)", fontSize: 11, lineHeight: 1.8 }}>
                {refactorResult.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>

            <div className="report-sec">
              <div className="report-sec-title">
                <div className="report-check">!</div>
                Advertencias
              </div>

              <ul style={{ margin: 0, paddingLeft: 18, color: "var(--txt2)", fontSize: 11, lineHeight: 1.8 }}>
                {refactorResult.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="pill-btn primary" onClick={() => void handleCopy()}>
              {copied ? "Gramática copiada" : "Copiar gramática resultante"}
            </button>
            <button type="button" className="pill-btn" onClick={handleDownload}>
              Descargar .txt
            </button>
          </div>

          <InfoBox>
            Por ahora este módulo genera la versión corregida para copiarla al editor. Para aplicarla automáticamente, el siguiente paso sería pasar un prop como <code>onApplyGrammar</code> desde <code>ParserCenterPanel</code>.
          </InfoBox>
        </>
      )}
    </ExtraModuleFrame>
  );
}

function GrammarPreview({
  title,
  tone,
  text
}: {
  title: string;
  tone: "add" | "remove" | "ctx";
  text: string;
}) {
  const lines = text.split("\n").filter((line) => line.trim().length > 0);

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 12,
        background: "var(--bg3)",
        overflow: "hidden"
      }}
    >
      <div
        style={{
          padding: "8px 10px",
          borderBottom: "1px solid var(--border)",
          color: "var(--txt1)",
          fontSize: 11,
          fontWeight: 800
        }}
      >
        {title}
      </div>

      <div style={{ padding: 8, display: "grid", gap: 4 }}>
        {lines.map((line, index) => (
          <div key={`${title}-${line}-${index}`} className={`diff-line ${tone}`}>
            <span className="diff-sign">{tone === "add" ? "+" : tone === "remove" ? "−" : " "}</span>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

function ParserGalleryModule({
  examples,
  selectedExampleId,
  onSelectExample
}: {
  examples: GrammarExample[];
  selectedExampleId?: string;
  onSelectExample?: (example: GrammarExample) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("todos");

  const tags = useMemo(() => {
    const unique = new Set<string>();

    for (const example of examples) {
      for (const tag of example.tags) unique.add(tag);
    }

    return ["todos", ...Array.from(unique).sort((left, right) => left.localeCompare(right))];
  }, [examples]);

  const filteredExamples = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);

    return examples.filter((example) => {
      const matchesTag = activeTag === "todos" || example.tags.includes(activeTag);
      const haystack = normalizeSearchText(
        [example.title, example.description, example.grammar, example.input, ...example.tags].join(" ")
      );
      const matchesQuery = normalizedQuery.length === 0 || haystack.includes(normalizedQuery);

      return matchesTag && matchesQuery;
    });
  }, [activeTag, examples, query]);

  const selectedExample =
    examples.find((example) => example.id === selectedExampleId) ?? filteredExamples[0];

  const totalLl = examples.filter((example) =>
    example.tags.some((tag) => tag.toLowerCase().includes("ll"))
  ).length;
  const totalConflict = examples.filter((example) =>
    example.tags.some((tag) => tag.toLowerCase().includes("conflicto") || tag.toLowerCase().includes("no ll"))
  ).length;

  return (
    <ExtraModuleFrame>
      <ModuleHeader
        eyebrow="Grammar Gallery"
        title="Galería de gramáticas"
        description="Ejemplos precargados desde sampleGrammars para probar casos válidos, ε, conflictos y recursión izquierda."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 10
        }}
      >
        <MiniMetric label="Ejemplos" value={examples.length} detail="Disponibles" />
        <MiniMetric label="Casos LL" value={totalLl} detail="Etiquetados" />
        <MiniMetric label="Casos problema" value={totalConflict} detail="Conflicto/no LL" />
      </div>

      <div
        style={{
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r)",
          padding: 12,
          display: "grid",
          gap: 10
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por título, tag, símbolo o descripción..."
          style={{
            width: "100%",
            border: "1px solid var(--border)",
            borderRadius: 12,
            background: "var(--bg3)",
            color: "var(--txt1)",
            padding: "10px 12px",
            fontSize: 12,
            outline: "none"
          }}
        />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`pill-btn ${activeTag === tag ? "primary" : ""}`}
              onClick={() => setActiveTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12
        }}
      >
        <div style={{ display: "grid", gap: 10 }}>
          {filteredExamples.length === 0 ? (
            <EmptyExtraState
              title="Sin coincidencias"
              description="Prueba con otro tag o limpia la búsqueda."
            />
          ) : (
            filteredExamples.map((example) => {
              const isSelected = example.id === selectedExampleId;

              return (
                <button
                  key={example.id}
                  type="button"
                  onClick={() => onSelectExample?.(example)}
                  style={{
                    textAlign: "left",
                    border: `1px solid ${isSelected ? "rgba(96,165,250,.55)" : "var(--border)"}`,
                    background: isSelected ? "rgba(96,165,250,.09)" : "var(--bg2)",
                    borderRadius: "var(--r)",
                    padding: 12,
                    cursor: onSelectExample ? "pointer" : "default"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ color: "var(--txt0)", fontWeight: 850, fontSize: 13 }}>
                        {example.title}
                      </div>
                      <div style={{ color: "var(--txt2)", fontSize: 11, lineHeight: 1.6, marginTop: 4 }}>
                        {example.description}
                      </div>
                    </div>

                    <span style={{ color: isSelected ? "var(--accent2)" : "var(--txt3)", fontSize: 11 }}>
                      {isSelected ? "Activo" : "Usar"}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                    {example.tags.map((tag) => (
                      <span key={`${example.id}-${tag}`} className="conf-type" style={{ color: "var(--accent2)" }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div
          style={{
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r)",
            padding: 12,
            alignSelf: "start",
            position: "sticky",
            top: 0
          }}
        >
          {selectedExample ? (
            <>
              <div className="sec-label">Vista previa</div>
              <h3 style={{ color: "var(--txt0)", fontSize: 15, fontWeight: 850, marginBottom: 6 }}>
                {selectedExample.title}
              </h3>
              <p style={{ color: "var(--txt2)", fontSize: 11, lineHeight: 1.7 }}>
                {selectedExample.description}
              </p>

              <div style={{ marginTop: 12 }}>
                <div style={{ color: "var(--txt2)", fontSize: 10, fontWeight: 800, marginBottom: 6 }}>
                  Gramática
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: 10,
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    background: "var(--bg4)",
                    color: "var(--txt1)",
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    whiteSpace: "pre-wrap"
                  }}
                >
                  {selectedExample.grammar}
                </pre>
              </div>

              <div style={{ marginTop: 10, color: "var(--txt2)", fontSize: 11 }}>
                Entrada sugerida: <code style={{ color: "var(--accent2)" }}>{selectedExample.input || "ε"}</code>
              </div>

              <button
                type="button"
                className="pill-btn primary"
                style={{ marginTop: 12 }}
                onClick={() => onSelectExample?.(selectedExample)}
              >
                Cargar ejemplo
              </button>
            </>
          ) : (
            <EmptyExtraState
              title="Sin ejemplo"
              description="No hay ejemplos disponibles desde sampleGrammars."
            />
          )}
        </div>
      </div>
    </ExtraModuleFrame>
  );
}

function MiniMetric({
  label,
  value,
  detail
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--r)",
        background: "var(--bg2)",
        padding: 12
      }}
    >
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--txt2)", fontWeight: 800 }}>
        {label}
      </div>
      <div style={{ marginTop: 4, color: "var(--txt0)", fontSize: 24, fontWeight: 900 }}>{value}</div>
      <div style={{ color: "var(--txt3)", fontSize: 11 }}>{detail}</div>
    </div>
  );
}

function ParserTutorModule({
  result,
  inputString
}: {
  result: ParserExtraModulesResult | null;
  inputString: string;
}) {
  return (
    <ExtraModuleFrame>
      <ModuleHeader
        eyebrow="AI Tutor Mode"
        title="Tutor IA"
        description="Versión visual inicial del tutor. La lógica inteligente se conectará después."
      />

      <div
        style={{
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r)",
          padding: 12,
          display: "flex",
          alignItems: "center",
          gap: 10
        }}
      >
        <div className="ai-dot" />

        <div style={{ fontSize: 12, color: "var(--txt1)" }}>
          Tutor IA activo · Modo:{" "}
          <strong style={{ color: "var(--accent2)" }}>
            Paso a paso guiado
          </strong>
        </div>
      </div>

      <div className="tutor-chat">
        <div className="msg ai">
          <div className="msg-ava ai-ava">λ</div>

          <div className="msg-bubble ai-bubble">
            Vamos a analizar la cadena{" "}
            <code
              style={{
                background: "var(--bg4)",
                padding: "1px 6px",
                borderRadius: 3,
                fontSize: 11
              }}
            >
              {inputString || "ε"}
            </code>
            .<br />
            <br />
            {result?.grammar
              ? "La gramática ya fue procesada. Ahora puedes revisar tablas, simulaciones o conflictos."
              : "Primero ejecuta una gramática para que pueda guiarte paso a paso."}
            <div className="tutor-opts">
              <button type="button" className="tutor-opt">
                Ver FIRST/FOLLOW
              </button>
              <button type="button" className="tutor-opt">
                Revisar tabla
              </button>
              <button type="button" className="tutor-opt">
                Explicar conflicto
              </button>
              <button type="button" className="tutor-opt">
                Siguiente paso
              </button>
            </div>
          </div>
        </div>

        <div className="msg ai">
          <div className="msg-ava ai-ava">λ</div>

          <div className="msg-bubble ai-bubble">
            Esta vista todavía es una maqueta funcional. Después se puede
            conectar con el estado real del simulador para preguntar al usuario
            qué acción corresponde: shift, reduce, expandir, match, accept o
            error.
          </div>
        </div>
      </div>
    </ExtraModuleFrame>
  );
}

function ParserReportModule({
  result,
  inputString
}: {
  result: ParserExtraModulesResult | null;
  inputString: string;
}) {
  const [copied, setCopied] = useState(false);
  const diagnostics = useMemo(() => collectConflictDiagnostics(result), [result]);
  const rows = useMemo(() => buildParserReportRows(result), [result]);
  const markdown = useMemo(
    () => buildReportMarkdown(result, inputString, diagnostics, rows),
    [diagnostics, inputString, result, rows]
  );
  const html = useMemo(
    () => buildReportHtml(result, inputString, diagnostics, rows),
    [diagnostics, inputString, result, rows]
  );

  const conflictCount = diagnostics.filter(
    (diagnostic) => diagnostic.category === "table-conflict"
  ).length;
  const leftRecursionCount = diagnostics.filter(
    (diagnostic) => diagnostic.category === "left-recursion"
  ).length;
  const acceptedCount = rows.filter((row) => row.simulation === "Aceptada").length;

  async function handleCopyReport() {
    const ok = await copyToClipboard(markdown);
    setCopied(ok);
  }

  function handleDownloadMarkdown() {
    downloadTextFile("parserlab-report.md", markdown, "text/markdown;charset=utf-8");
  }

  function handleDownloadHtml() {
    downloadTextFile("parserlab-report.html", html, "text/html;charset=utf-8");
  }

  return (
    <ExtraModuleFrame>
      <ModuleHeader
        eyebrow="Generate Compiler Report"
        title="Reporte del análisis"
        description="Genera un informe completo y descargable con gramática, parsers, simulaciones, conflictos y recomendaciones."
      />

      {!result ? (
        <EmptyExtraState
          title="Sin análisis"
          description="Ejecuta una gramática para generar el reporte profesional."
        />
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 10
            }}
          >
            <MiniMetric label="Producciones" value={result.grammar?.productions.length ?? 0} detail="Gramática" />
            <MiniMetric label="Conflictos" value={conflictCount} detail="Tablas" />
            <MiniMetric label="Rec. izquierda" value={leftRecursionCount} detail="Diagnóstico" />
            <MiniMetric label="Aceptadas" value={acceptedCount} detail="Simulaciones" />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="pill-btn primary" onClick={handleDownloadHtml}>
              Descargar reporte HTML
            </button>
            <button type="button" className="pill-btn" onClick={handleDownloadMarkdown}>
              Descargar Markdown
            </button>
            <button type="button" className="pill-btn" onClick={() => void handleCopyReport()}>
              {copied ? "Reporte copiado" : "Copiar reporte"}
            </button>
          </div>

          <InfoBox>
            El archivo HTML queda listo para abrir en el navegador e imprimir como PDF. Así no dependemos todavía de jsPDF ni React PDF.
          </InfoBox>

          <div className="report-sec">
            <div className="report-sec-title">
              <div className="report-check">✓</div>
              Resumen ejecutivo
            </div>

            <div style={{ fontSize: 11, color: "var(--txt2)", lineHeight: 1.8 }}>
              Estado general: <strong style={{ color: diagnostics.length > 0 ? "var(--amber)" : "var(--green)" }}>
                {diagnostics.length > 0 ? "Requiere revisión" : "Sin conflictos detectados"}
              </strong>
              {" · "}
              Entrada: <code style={{ color: "var(--accent2)" }}>{inputString || "ε"}</code>
              {" · "}
              Avisos del lector: {result.issues.length}
            </div>
          </div>

          <div className="report-sec">
            <div className="report-sec-title">
              <div className="report-check">✓</div>
              Gramática normalizada
            </div>

            <pre
              style={{
                margin: 0,
                padding: 10,
                border: "1px solid var(--border)",
                borderRadius: 10,
                background: "var(--bg4)",
                color: "var(--txt1)",
                fontFamily: "var(--mono)",
                fontSize: 11,
                whiteSpace: "pre-wrap"
              }}
            >
              {result.grammar ? grammarToText(result.grammar) : "Gramática no disponible"}
            </pre>
          </div>

          <div className="report-sec">
            <div className="report-sec-title">
              <div className="report-check">✓</div>
              Compatibilidad por parser
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ color: "var(--txt2)", textAlign: "left" }}>
                    <th style={{ padding: 8, borderBottom: "1px solid var(--border)" }}>Parser</th>
                    <th style={{ padding: 8, borderBottom: "1px solid var(--border)" }}>Tabla</th>
                    <th style={{ padding: 8, borderBottom: "1px solid var(--border)" }}>Simulación</th>
                    <th style={{ padding: 8, borderBottom: "1px solid var(--border)" }}>Conflictos</th>
                    <th style={{ padding: 8, borderBottom: "1px solid var(--border)" }}>Recomendación</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.name} style={{ color: "var(--txt1)" }}>
                      <td style={{ padding: 8, borderBottom: "1px solid var(--border)", fontWeight: 800 }}>{row.name}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid var(--border)" }}>{row.table}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid var(--border)" }}>{row.simulation}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid var(--border)", color: row.conflicts > 0 ? "var(--amber)" : "var(--green)" }}>
                        {row.conflicts}
                      </td>
                      <td style={{ padding: 8, borderBottom: "1px solid var(--border)", color: "var(--txt2)" }}>{row.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="report-sec">
            <div className="report-sec-title">
              <div className="report-check">!</div>
              Diagnósticos incluidos
            </div>

            {diagnostics.length === 0 ? (
              <div style={{ fontSize: 11, color: "var(--txt2)" }}>
                No hay conflictos ni advertencias relevantes para reportar.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {diagnostics.slice(0, 8).map((diagnostic) => (
                  <div
                    key={diagnostic.id}
                    style={{
                      border: `1px solid ${getSeverityBorder(diagnostic.severity)}`,
                      background: getSeverityBackground(diagnostic.severity),
                      borderRadius: 10,
                      padding: 10
                    }}
                  >
                    <div style={{ color: getSeverityColor(diagnostic.severity), fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>
                      {diagnostic.parser} · {getCategoryLabel(diagnostic.category)}
                    </div>
                    <div style={{ color: "var(--txt0)", fontSize: 12, fontWeight: 850, marginTop: 3 }}>{diagnostic.title}</div>
                    <div style={{ color: "var(--txt2)", fontSize: 11, lineHeight: 1.6, marginTop: 4 }}>{diagnostic.reason}</div>
                    <div style={{ color: "var(--accent2)", fontSize: 11, lineHeight: 1.6, marginTop: 4 }}>Sugerencia: {diagnostic.suggestion}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </ExtraModuleFrame>
  );
}


function buildRefactorResult(grammar: Grammar, mode: RefactorMode): RefactorResult {
  if (mode === "left-recursion") {
    return eliminateDirectLeftRecursion(grammar);
  }

  if (mode === "left-factoring") {
    return factorLeftCommonPrefixes(grammar);
  }

  if (mode === "expression-levels") {
    return suggestExpressionLevels(grammar);
  }

  return normalizeGrammarText(grammar);
}

function eliminateDirectLeftRecursion(grammar: Grammar): RefactorResult {
  const before = grammarToText(grammar);
  const byLeft = groupProductionsByLeft(grammar);
  const usedSymbols = new Set([...grammar.nonTerminals, ...grammar.terminals]);
  const lines: string[] = [];
  const steps: string[] = [];
  const warnings: string[] = [];
  let changed = false;

  for (const left of grammar.nonTerminals) {
    const productions = byLeft.get(left) ?? [];
    const recursive: string[][] = [];
    const base: string[][] = [];

    for (const production of productions) {
      const right = normalizeRightSymbols(production.right);

      if (right[0] === left) {
        recursive.push(right.slice(1));
      } else {
        base.push(right);
      }
    }

    if (recursive.length > 0 && base.length > 0) {
      const aux = createAuxSymbol(left, usedSymbols);
      const baseAlternatives = base.map((right) => formatRightSymbols([...removeEpsilonOnly(right), aux]));
      const recursiveAlternatives = recursive.map((right) => {
        const alpha = removeEpsilonOnly(right);

        if (alpha.length === 0) {
          warnings.push(
            `${left} tiene una producción ${left} → ${left}. Se conservó como caso especial porque α está vacío.`
          );
          return formatRightSymbols([aux]);
        }

        return formatRightSymbols([...alpha, aux]);
      });

      lines.push(`${left} -> ${baseAlternatives.join(" | ")}`);
      lines.push(`${aux} -> ${recursiveAlternatives.join(" | ")} | ε`);
      steps.push(`Se eliminó la recursión izquierda directa de ${left}.`);
      changed = true;
    } else {
      if (recursive.length > 0 && base.length === 0) {
        warnings.push(
          `${left} solo tiene alternativas recursivas. Se necesita una alternativa base β para eliminar recursión izquierda de forma segura.`
        );
      }

      if (productions.length > 0) {
        lines.push(`${left} -> ${productions.map((production) => formatRightSymbols(production.right)).join(" | ")}`);
      }
    }
  }

  if (!changed) {
    steps.push("No se encontró recursión izquierda directa eliminable.");
  }

  warnings.push(
    "La recursión izquierda indirecta requiere sustitución previa entre no terminales; este botón aplica la transformación directa segura."
  );

  return {
    mode: "left-recursion",
    title: "Eliminación de recursión izquierda directa",
    subtitle:
      "Transforma A → A α | β en A → β A' y A' → α A' | ε cuando existe una alternativa base.",
    changed,
    before,
    after: lines.join("\n") || before,
    steps,
    warnings
  };
}

function factorLeftCommonPrefixes(grammar: Grammar): RefactorResult {
  const before = grammarToText(grammar);
  const byLeft = groupProductionsByLeft(grammar);
  const usedSymbols = new Set([...grammar.nonTerminals, ...grammar.terminals]);
  const lines: string[] = [];
  const steps: string[] = [];
  const warnings: string[] = [];
  let changed = false;

  for (const left of grammar.nonTerminals) {
    const productions = byLeft.get(left) ?? [];
    const alternatives = productions.map((production) => normalizeRightSymbols(production.right));
    const groups = groupByFirstSymbol(alternatives);
    const nextAlternatives: string[] = [];
    const auxLines: string[] = [];

    for (const group of groups) {
      if (group.alternatives.length < 2 || isEpsilonSymbol(group.first)) {
        nextAlternatives.push(...group.alternatives.map(formatRightSymbols));
        continue;
      }

      const prefix = longestCommonPrefix(group.alternatives);

      if (prefix.length === 0) {
        nextAlternatives.push(...group.alternatives.map(formatRightSymbols));
        continue;
      }

      const aux = createAuxSymbol(`${left}Fact`, usedSymbols);
      const remainders = group.alternatives.map((alternative) => {
        const rest = alternative.slice(prefix.length);
        return rest.length > 0 ? rest : ["ε"];
      });

      nextAlternatives.push(formatRightSymbols([...prefix, aux]));
      auxLines.push(`${aux} -> ${remainders.map(formatRightSymbols).join(" | ")}`);
      steps.push(
        `Se factorizó ${left} usando el prefijo común ${formatRightSymbols(prefix)}.`
      );
      changed = true;
    }

    if (productions.length > 0) {
      lines.push(`${left} -> ${nextAlternatives.join(" | ")}`);
      lines.push(...auxLines);
    }
  }

  if (!changed) {
    steps.push("No se encontraron prefijos comunes factorizables por primer símbolo.");
  }

  warnings.push(
    "Esta factorización es conservadora: extrae prefijos comunes evidentes. Para casos más profundos puede requerirse una segunda pasada."
  );

  return {
    mode: "left-factoring",
    title: "Factorización izquierda",
    subtitle:
      "Extrae prefijos compartidos para que el parser LL(1) no tenga que elegir entre alternativas que empiezan igual.",
    changed,
    before,
    after: lines.join("\n") || before,
    steps,
    warnings
  };
}

function normalizeGrammarText(grammar: Grammar): RefactorResult {
  const normalized = grammarToText(grammar);

  return {
    mode: "epsilon",
    title: "Normalización de gramática",
    subtitle:
      "Reconstruye la gramática desde la representación interna usando flecha uniforme, pipes ordenados y ε normalizado.",
    changed: true,
    before: normalized,
    after: normalized,
    steps: [
      "Se agruparon alternativas por no terminal.",
      "Se normalizó la producción vacía como ε.",
      "Se reconstruyó el texto de salida desde el AST interno."
    ],
    warnings: [
      "Como el parser ya normalizó la entrada, este módulo no puede recuperar si el usuario escribió eps, epsilon o λ originalmente."
    ]
  };
}

function suggestExpressionLevels(grammar: Grammar): RefactorResult {
  const before = grammarToText(grammar);
  const operators = collectExpressionOperators(grammar);
  const additive = operators.filter((operator) => ["+", "-"].includes(operator));
  const multiplicative = operators.filter((operator) => ["*", "/"].includes(operator));
  const start = grammar.startSymbol || "E";
  const hasExpressionShape = operators.length > 0;
  const warnings = [
    "Esta transformación es una plantilla pedagógica para expresiones aritméticas; revisa nombres y terminales según tu gramática real."
  ];

  const plusOps = additive.length > 0 ? additive : ["+"];
  const multOps = multiplicative.length > 0 ? multiplicative : ["*"];
  const exprTail = plusOps.map((operator) => `${operator} T ${start}'`).join(" | ");
  const termTail = multOps.map((operator) => `${operator} F T'`).join(" | ");

  const after = [
    `${start} -> T ${start}'`,
    `${start}' -> ${exprTail} | ε`,
    "T -> F T'",
    `T' -> ${termTail} | ε`,
    "F -> ( E ) | id"
  ].join("\n");

  return {
    mode: "expression-levels",
    title: "Separación de precedencia y asociatividad",
    subtitle:
      "Propone niveles Expr/Term/Factor para evitar la ambigüedad típica de E → E op E.",
    changed: hasExpressionShape,
    before,
    after: hasExpressionShape ? after : before,
    steps: hasExpressionShape
      ? [
          "Se detectaron operadores infijos en producciones recursivas.",
          "Se separó la suma/resta en el nivel de expresión.",
          "Se separó la multiplicación/división en el nivel de término.",
          "Se dejó Factor para paréntesis e identificadores."
        ]
      : ["No se detectó un patrón claro de expresión tipo E → E op E."],
    warnings
  };
}

function grammarToText(grammar: Grammar) {
  const byLeft = groupProductionsByLeft(grammar);
  const lines: string[] = [];

  for (const left of grammar.nonTerminals) {
    const productions = byLeft.get(left) ?? [];
    if (productions.length === 0) continue;

    lines.push(`${left} -> ${productions.map((production) => formatRightSymbols(production.right)).join(" | ")}`);
  }

  return lines.join("\n");
}

function groupProductionsByLeft(grammar: Grammar) {
  const byLeft = new Map<string, GrammarProduction[]>();

  for (const production of grammar.productions) {
    const current = byLeft.get(production.left) ?? [];
    current.push(production);
    byLeft.set(production.left, current);
  }

  return byLeft;
}

function normalizeRightSymbols(symbols: string[]) {
  const normalized = symbols.filter((symbol) => !isBlankSymbol(symbol));
  return normalized.length > 0 ? normalized : ["ε"];
}

function removeEpsilonOnly(symbols: string[]) {
  return symbols.filter((symbol) => !isEpsilonSymbol(symbol));
}

function isBlankSymbol(symbol: string) {
  return symbol.trim().length === 0;
}

function formatRightSymbols(symbols: string[]) {
  const right = normalizeRightSymbols(symbols).filter((symbol) => !isEpsilonSymbol(symbol));

  return right.length > 0 ? right.join(" ") : "ε";
}

function createAuxSymbol(base: string, usedSymbols: Set<string>) {
  let candidate = `${base}'`;
  let counter = 1;

  while (usedSymbols.has(candidate)) {
    candidate = `${base}'${counter}`;
    counter += 1;
  }

  usedSymbols.add(candidate);
  return candidate;
}

function groupByFirstSymbol(alternatives: string[][]) {
  const groupsByFirst = new Map<string, string[][]>();

  for (const alternative of alternatives) {
    const first = alternative.find((symbol) => !isEpsilonSymbol(symbol)) ?? "ε";
    const current = groupsByFirst.get(first) ?? [];
    current.push(alternative);
    groupsByFirst.set(first, current);
  }

  return Array.from(groupsByFirst.entries()).map(([first, groupedAlternatives]) => ({
    first,
    alternatives: groupedAlternatives
  }));
}

function longestCommonPrefix(alternatives: string[][]) {
  if (alternatives.length === 0) return [];

  const [first = []] = alternatives;
  const prefix: string[] = [];

  for (let index = 0; index < first.length; index += 1) {
    const symbol = first[index];
    if (!symbol || isEpsilonSymbol(symbol)) break;

    if (alternatives.every((alternative) => alternative[index] === symbol)) {
      prefix.push(symbol);
    } else {
      break;
    }
  }

  return prefix;
}

function collectExpressionOperators(grammar: Grammar) {
  const nonTerminals = new Set(grammar.nonTerminals);
  const operators = new Set<string>();

  for (const production of grammar.productions) {
    const right = production.right.filter((symbol: string) => !isEpsilonSymbol(symbol));
    const first = right[0];
    const last = right[right.length - 1];

    if (right.length >= 3 && first === production.left && last === production.left) {
      for (const symbol of right.slice(1, -1)) {
        if (!nonTerminals.has(symbol)) operators.add(symbol);
      }
    }
  }

  return Array.from(operators);
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function buildParserReportRows(result: ParserExtraModulesResult | null): ParserReportRow[] {
  return [
    buildParserReportRow("LL(1)", result?.ll1, result?.simulation),
    buildParserReportRow("LR(0)", result?.lr0, result?.lr0Simulation),
    buildParserReportRow("SLR(1)", result?.slr1, result?.slr1Simulation),
    buildParserReportRow("LR(1)", result?.lr1, result?.lr1Simulation),
    buildParserReportRow("LALR(1)", result?.lalr1, result?.lalr1Simulation)
  ];
}

function buildParserReportRow(
  name: string,
  table:
    | LL1TableResult
    | LR0TableResult
    | SLR1TableResult
    | LR1TableResult
    | LALR1TableResult
    | undefined,
  simulation:
    | LL1SimulationResult
    | LR0SimulationResult
    | SLR1SimulationResult
    | LR1SimulationResult
    | LALR1SimulationResult
    | undefined
): ParserReportRow {
  const conflicts = getConflictCount(table);
  const tableStatus = table ? (conflicts > 0 ? "Construida con conflictos" : "Construida sin conflictos") : "No construida";
  const simulationStatus = formatAccepted(simulation?.accepted);
  const status: ParserReportRow["status"] = !table ? "empty" : conflicts > 0 ? "warn" : "ok";

  return {
    name,
    table: tableStatus,
    simulation: simulationStatus,
    conflicts,
    status,
    recommendation: getParserReportRecommendation(name, conflicts, simulation?.accepted)
  };
}

function getParserReportRecommendation(
  parser: string,
  conflicts: number,
  accepted: boolean | undefined
) {
  if (conflicts > 0) {
    if (parser === "LL(1)") {
      return "Revisar factorización, FIRST/FOLLOW o recursión izquierda.";
    }

    if (parser === "LR(0)") {
      return "Probar SLR(1), LR(1) o LALR(1) antes de refactorizar.";
    }

    return "Revisar acciones conflictivas y producciones involucradas.";
  }

  if (accepted === true) return "Parser compatible con la cadena probada.";
  if (accepted === false) return "Tabla válida, pero la cadena fue rechazada.";

  return "Ejecutar simulación para completar evidencia.";
}

function buildReportMarkdown(
  result: ParserExtraModulesResult | null,
  inputString: string,
  diagnostics: ConflictDiagnostic[],
  rows: ParserReportRow[]
) {
  const grammarText = result?.grammar ? grammarToText(result.grammar) : "Gramática no disponible";
  const generatedAt = new Date().toLocaleString();
  const status = diagnostics.length > 0 ? "Requiere revisión" : "Sin conflictos detectados";

  return [
    "# ParserLab Pro — Reporte de análisis",
    "",
    `Generado: ${generatedAt}`,
    "",
    "## 1. Resumen ejecutivo",
    "",
    `- Estado general: ${status}`,
    `- Cadena de entrada: ${inputString || "ε"}`,
    `- Producciones: ${result?.grammar?.productions.length ?? 0}`,
    `- No terminales: ${result?.grammar?.nonTerminals.length ?? 0}`,
    `- Terminales: ${result?.grammar?.terminals.length ?? 0}`,
    `- Avisos del lector: ${result?.issues.length ?? 0}`,
    `- Diagnósticos: ${diagnostics.length}`,
    "",
    "## 2. Gramática normalizada",
    "",
    "```",
    grammarText,
    "```",
    "",
    "## 3. Compatibilidad por parser",
    "",
    "| Parser | Tabla | Simulación | Conflictos | Recomendación |",
    "|---|---|---:|---:|---|",
    ...rows.map(
      (row) =>
        `| ${escapeMarkdownCell(row.name)} | ${escapeMarkdownCell(row.table)} | ${escapeMarkdownCell(row.simulation)} | ${row.conflicts} | ${escapeMarkdownCell(row.recommendation)} |`
    ),
    "",
    "## 4. Diagnósticos",
    "",
    diagnostics.length === 0
      ? "No se detectaron conflictos ni advertencias relevantes."
      : diagnostics
          .map(
            (diagnostic, index) =>
              `${index + 1}. **${diagnostic.parser} · ${diagnostic.title}**\n   - Alcance: ${diagnostic.scope}\n   - Motivo: ${diagnostic.reason}\n   - Sugerencia: ${diagnostic.suggestion}`
          )
          .join("\n"),
    "",
    "## 5. Recomendación final",
    "",
    getFinalReportRecommendation(diagnostics, rows)
  ].join("\n");
}

function buildReportHtml(
  result: ParserExtraModulesResult | null,
  inputString: string,
  diagnostics: ConflictDiagnostic[],
  rows: ParserReportRow[]
) {
  const grammarText = result?.grammar ? grammarToText(result.grammar) : "Gramática no disponible";
  const generatedAt = new Date().toLocaleString();
  const status = diagnostics.length > 0 ? "Requiere revisión" : "Sin conflictos detectados";
  const statusClass = diagnostics.length > 0 ? "warn" : "ok";

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>ParserLab Pro - Reporte de análisis</title>
<style>
  :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  body { margin: 0; background: #f6f8fb; color: #172033; }
  main { max-width: 980px; margin: 32px auto; padding: 0 18px 48px; }
  .hero { background: linear-gradient(135deg, #0f172a, #1d4ed8); color: white; border-radius: 24px; padding: 28px; box-shadow: 0 20px 60px rgba(15,23,42,.18); }
  .eyebrow { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; opacity: .75; font-weight: 800; }
  h1 { margin: 8px 0 4px; font-size: 32px; line-height: 1.1; }
  .muted { color: #657083; line-height: 1.6; }
  .hero .muted { color: rgba(255,255,255,.76); }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin: 18px 0; }
  .metric, section { background: white; border: 1px solid #e3e8f0; border-radius: 18px; padding: 16px; box-shadow: 0 10px 30px rgba(15,23,42,.05); }
  .metric b { display: block; font-size: 26px; color: #0f172a; }
  .metric span { font-size: 11px; color: #657083; text-transform: uppercase; letter-spacing: .08em; font-weight: 800; }
  section { margin-top: 14px; }
  h2 { margin: 0 0 10px; font-size: 17px; }
  pre { white-space: pre-wrap; overflow-x: auto; background: #0f172a; color: #dbeafe; border-radius: 14px; padding: 14px; font-size: 13px; line-height: 1.55; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { border-bottom: 1px solid #e3e8f0; text-align: left; padding: 10px 8px; vertical-align: top; }
  th { color: #657083; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
  .badge { display: inline-flex; border-radius: 999px; padding: 4px 9px; font-size: 11px; font-weight: 800; }
  .ok { background: #dcfce7; color: #166534; }
  .warn { background: #fef3c7; color: #92400e; }
  .diag { border-left: 4px solid #f59e0b; padding: 10px 12px; background: #fffbeb; border-radius: 12px; margin-top: 8px; }
  .diag.error { border-left-color: #ef4444; background: #fef2f2; }
  @media print { body { background: white; } main { margin: 0 auto; } .hero, .metric, section { box-shadow: none; } }
</style>
</head>
<body>
<main>
  <div class="hero">
    <div class="eyebrow">ParserLab Pro</div>
    <h1>Reporte de análisis sintáctico</h1>
    <p class="muted">Generado: ${escapeHtml(generatedAt)} · Estado: <strong>${escapeHtml(status)}</strong></p>
  </div>

  <div class="grid">
    <div class="metric"><span>Producciones</span><b>${result?.grammar?.productions.length ?? 0}</b></div>
    <div class="metric"><span>No terminales</span><b>${result?.grammar?.nonTerminals.length ?? 0}</b></div>
    <div class="metric"><span>Terminales</span><b>${result?.grammar?.terminals.length ?? 0}</b></div>
    <div class="metric"><span>Diagnósticos</span><b>${diagnostics.length}</b></div>
  </div>

  <section>
    <h2>1. Resumen ejecutivo</h2>
    <p>Estado general: <span class="badge ${statusClass}">${escapeHtml(status)}</span></p>
    <p class="muted">Cadena de entrada: <code>${escapeHtml(inputString || "ε")}</code></p>
    <p class="muted">Avisos del lector: ${result?.issues.length ?? 0}</p>
  </section>

  <section>
    <h2>2. Gramática normalizada</h2>
    <pre>${escapeHtml(grammarText)}</pre>
  </section>

  <section>
    <h2>3. Compatibilidad por parser</h2>
    <table>
      <thead><tr><th>Parser</th><th>Tabla</th><th>Simulación</th><th>Conflictos</th><th>Recomendación</th></tr></thead>
      <tbody>
        ${rows
          .map(
            (row) =>
              `<tr><td><strong>${escapeHtml(row.name)}</strong></td><td>${escapeHtml(row.table)}</td><td>${escapeHtml(row.simulation)}</td><td>${row.conflicts}</td><td>${escapeHtml(row.recommendation)}</td></tr>`
          )
          .join("")}
      </tbody>
    </table>
  </section>

  <section>
    <h2>4. Diagnósticos y sugerencias</h2>
    ${
      diagnostics.length === 0
        ? `<p class="muted">No se detectaron conflictos ni advertencias relevantes.</p>`
        : diagnostics
            .map(
              (diagnostic) =>
                `<div class="diag ${diagnostic.severity === "error" ? "error" : ""}"><strong>${escapeHtml(diagnostic.parser)} · ${escapeHtml(diagnostic.title)}</strong><p>${escapeHtml(diagnostic.reason)}</p><p class="muted">Sugerencia: ${escapeHtml(diagnostic.suggestion)}</p></div>`
            )
            .join("")
    }
  </section>

  <section>
    <h2>5. Recomendación final</h2>
    <p class="muted">${escapeHtml(getFinalReportRecommendation(diagnostics, rows))}</p>
  </section>
</main>
</body>
</html>`;
}

function getFinalReportRecommendation(
  diagnostics: ConflictDiagnostic[],
  rows: ParserReportRow[]
) {
  const noConflictParser = rows.find((row) => row.status === "ok");
  const hasLeftRecursion = diagnostics.some(
    (diagnostic) => diagnostic.category === "left-recursion"
  );
  const hasAmbiguitySignal = diagnostics.some(
    (diagnostic) => diagnostic.category === "ambiguity-signal"
  );

  if (hasLeftRecursion) {
    return "Prioriza el módulo Refactor para eliminar recursión izquierda antes de intentar LL(1) o descenso recursivo.";
  }

  if (hasAmbiguitySignal) {
    return "Revisa la estructura de expresiones y separa precedencia/asociatividad si aparecen conflictos o patrones E → E op E.";
  }

  if (noConflictParser) {
    return `El parser recomendado para demostrar esta gramática es ${noConflictParser.name}, porque su tabla no presenta conflictos.`;
  }

  return "Completa la construcción de tablas y simulaciones para obtener una recomendación más precisa.";
}

function escapeMarkdownCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function copyToClipboard(value: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  if (typeof document === "undefined") return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function ExtraModuleFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className="module"
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        overflowY: "auto",
        padding: 16,
        gap: 14
      }}
    >
      {children}
    </div>
  );
}

function ModuleHeader({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r)",
        padding: 14
      }}
    >
      <div className="sec-label">{eyebrow}</div>

      <h2
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: "var(--txt0)",
          marginBottom: 4
        }}
      >
        {title}
      </h2>

      <p
        style={{
          fontSize: 12,
          lineHeight: 1.7,
          color: "var(--txt2)"
        }}
      >
        {description}
      </p>
    </section>
  );
}

function EmptyExtraState({
  title,
  description
}: {
  title: string;
  description: ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: 260,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center"
      }}
    >
      <div
        style={{
          maxWidth: 460,
          padding: 24,
          border: "1px solid var(--border)",
          borderRadius: "var(--r)",
          background: "var(--bg2)"
        }}
      >
        <div
          style={{
            marginBottom: 10,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: "var(--accent)"
          }}
        >
          {title}
        </div>

        <p
          style={{
            fontSize: 12,
            lineHeight: 1.7,
            color: "var(--txt2)"
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: "10px 14px",
        background: "rgba(96,165,250,.06)",
        border: "1px solid rgba(96,165,250,.2)",
        borderRadius: "var(--r)",
        fontSize: 12,
        lineHeight: 1.7,
        color: "var(--txt1)"
      }}
    >
      {children}
    </div>
  );
}

function SuccessCard({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="result-card rc-accept">
      <div className="rc-icon" style={{ color: "var(--green)" }}>
        ✓
      </div>

      <div className="rc-info">
        <span className="rc-title" style={{ color: "var(--green)" }}>
          {title}
        </span>

        <span className="rc-sub">{description}</span>
      </div>
    </div>
  );
}

function getConflictCount(
  table:
    | LL1TableResult
    | LR0TableResult
    | SLR1TableResult
    | LR1TableResult
    | LALR1TableResult
    | undefined
) {
  return table?.conflicts.length ?? 0;
}

function collectConflicts(result: ParserExtraModulesResult | null) {
  return collectConflictDiagnostics(result);
}

function collectConflictDiagnostics(
  result: ParserExtraModulesResult | null
): ConflictDiagnostic[] {
  if (!result) return [];

  const diagnostics: ConflictDiagnostic[] = [
    ...normalizeGrammarIssues(result.issues),
    ...normalizeTableConflicts("LL(1)", result.ll1?.conflicts),
    ...normalizeTableConflicts("LR(0)", result.lr0?.conflicts),
    ...normalizeTableConflicts("SLR(1)", result.slr1?.conflicts),
    ...normalizeTableConflicts("LR(1)", result.lr1?.conflicts),
    ...normalizeTableConflicts("LALR(1)", result.lalr1?.conflicts)
  ];

  if (result.grammar) {
    diagnostics.push(...detectLeftRecursion(result.grammar));
    diagnostics.push(...detectAmbiguitySignals(result.grammar, result));
  }

  return diagnostics.sort((left, right) => {
    const severityOrder: Record<ConflictSeverity, number> = {
      error: 0,
      warn: 1,
      info: 2
    };

    return severityOrder[left.severity] - severityOrder[right.severity];
  });
}

function normalizeGrammarIssues(
  issues: GrammarParseIssue[] | undefined
): ConflictDiagnostic[] {
  if (!issues?.length) return [];

  return issues.map((issue, index) => {
    const item = issue as UnknownGrammarIssue;
    const location = [
      item.line !== undefined ? `línea ${item.line}` : "",
      item.column !== undefined ? `columna ${item.column}` : ""
    ]
      .filter(Boolean)
      .join(", ");

    return {
      id: `grammar-issue-${index}`,
      parser: "Gramática",
      category: "grammar-issue",
      severity: item.severity === "warning" ? "warn" : "error",
      title: item.type ?? "Problema de lectura",
      scope: location || "Entrada de gramática",
      reason:
        item.message ??
        item.description ??
        "Se detectó un problema al leer o normalizar la gramática.",
      evidence: [],
      suggestion:
        "Corrige primero este problema, porque puede afectar todas las tablas y simulaciones.",
      refactorHint: "Normalizar símbolos, flechas, ε y formato de producciones."
    };
  });
}

function normalizeTableConflicts(
  parser: string,
  conflicts: unknown
): ConflictDiagnostic[] {
  if (!Array.isArray(conflicts)) return [];

  return conflicts.map((conflict, index) => {
    const item = conflict as UnknownConflict;
    const state =
      item.stateId !== undefined
        ? `Estado ${item.stateId}`
        : item.state !== undefined
          ? `Estado ${item.state}`
          : "Tabla de análisis";

    const symbol =
      item.symbol ?? item.terminal ?? item.nonTerminal ?? "símbolo no especificado";

    const type = item.type ?? inferConflictType(item);

    return {
      id: `${parser}-table-conflict-${index}`,
      parser,
      category: "table-conflict",
      severity: "error",
      title: formatConflictTitle(type),
      scope: `${state} · ${symbol}`,
      reason:
        item.reason ??
        item.message ??
        explainTableConflict(parser, type, symbol),
      evidence: getConflictEvidence(item),
      suggestion: getParserConflictSuggestion(parser, type),
      refactorHint: getParserConflictRefactorHint(parser, type)
    };
  });
}

function inferConflictType(conflict: UnknownConflict) {
  const actions = Array.isArray(conflict.actions)
    ? conflict.actions.map((action) => stringifyCompact(action).toLowerCase())
    : [];

  const allActions = [
    ...actions,
    stringifyCompact(conflict.action).toLowerCase(),
    stringifyCompact(conflict.existingAction).toLowerCase(),
    stringifyCompact(conflict.incomingAction).toLowerCase()
  ].join(" ");

  if (allActions.includes("shift") && allActions.includes("reduce")) {
    return "shift/reduce";
  }

  if ((allActions.match(/reduce/g) ?? []).length >= 2) {
    return "reduce/reduce";
  }

  return "conflicto de tabla";
}

function formatConflictTitle(type: string) {
  const normalized = type.toLowerCase();

  if (normalized.includes("shift") && normalized.includes("reduce")) {
    return "Conflicto shift/reduce";
  }

  if (normalized.includes("reduce/reduce")) {
    return "Conflicto reduce/reduce";
  }

  if (normalized.includes("first") || normalized.includes("follow")) {
    return "Conflicto FIRST/FOLLOW";
  }

  return "Conflicto de tabla";
}

function explainTableConflict(parser: string, type: string, symbol: string) {
  if (parser === "LL(1)") {
    return `Dos o más producciones compiten por la misma celda predictiva con el símbolo ${symbol}.`;
  }

  if (type.toLowerCase().includes("shift")) {
    return `El parser no puede decidir si debe desplazar el símbolo ${symbol} o reducir una producción.`;
  }

  if (type.toLowerCase().includes("reduce")) {
    return `El parser tiene más de una reducción posible para el símbolo ${symbol}.`;
  }

  return `Se detectó una decisión no determinista en la tabla para el símbolo ${symbol}.`;
}

function getConflictEvidence(conflict: UnknownConflict) {
  const evidence = [
    conflict.productionId ? `Producción: ${conflict.productionId}` : "",
    conflict.production ? `Producción: ${stringifyCompact(conflict.production)}` : "",
    conflict.item ? `Ítem: ${stringifyCompact(conflict.item)}` : "",
    Array.isArray(conflict.items) && conflict.items.length > 0
      ? `Ítems: ${conflict.items.map((item) => stringifyCompact(item)).join(" | ")}`
      : "",
    Array.isArray(conflict.actions) && conflict.actions.length > 0
      ? `Acciones: ${conflict.actions.map((action) => stringifyCompact(action)).join(" | ")}`
      : "",
    conflict.existingAction
      ? `Acción existente: ${stringifyCompact(conflict.existingAction)}`
      : "",
    conflict.incomingAction
      ? `Acción nueva: ${stringifyCompact(conflict.incomingAction)}`
      : ""
  ].filter(Boolean);

  return evidence.length > 0 ? evidence : ["La tabla reportó más de una acción posible en la misma celda."];
}

function getParserConflictSuggestion(parser: string, type: string) {
  if (parser === "LL(1)") {
    return "Revisa recursión izquierda, prefijos comunes y choques FIRST/FOLLOW. Puede requerir factorización o eliminación de recursión izquierda.";
  }

  if (parser === "LR(0)") {
    return "LR(0) es muy restrictivo. Prueba SLR(1), LR(1) o LALR(1) para usar lookahead antes de refactorizar.";
  }

  if (type.toLowerCase().includes("shift")) {
    return "Define precedencia/asociatividad en la gramática o separa niveles de expresiones para que la decisión sea determinista.";
  }

  if (type.toLowerCase().includes("reduce")) {
    return "Busca producciones que derivan formas parecidas y separa los casos para evitar dos reducciones con el mismo lookahead.";
  }

  return "Compara con un parser más potente y revisa las producciones involucradas.";
}

function getParserConflictRefactorHint(parser: string, type: string) {
  if (parser === "LL(1)") {
    return "eliminar recursión izquierda o aplicar factorización izquierda.";
  }

  if (type.toLowerCase().includes("shift")) {
    return "separar precedencia y asociatividad, por ejemplo Expr → Term Expr'.";
  }

  if (type.toLowerCase().includes("reduce")) {
    return "reducir solapamiento entre alternativas o crear no terminales intermedios.";
  }

  return "probar una transformación mínima y volver a construir tablas.";
}

function detectLeftRecursion(grammar: Grammar): ConflictDiagnostic[] {
  const diagnostics: ConflictDiagnostic[] = [];
  const direct = new Map<string, GrammarProduction[]>();

  for (const production of grammar.productions) {
    const first = getFirstMeaningfulSymbol(production.right);

    if (first === production.left) {
      const current = direct.get(production.left) ?? [];
      current.push(production);
      direct.set(production.left, current);
    }
  }

  for (const [nonTerminal, productions] of direct.entries()) {
    diagnostics.push({
      id: `left-recursion-direct-${nonTerminal}`,
      parser: "Gramática",
      category: "left-recursion",
      severity: "error",
      title: "Recursión izquierda directa",
      scope: `No terminal ${nonTerminal}`,
      reason:
        "Una producción vuelve a invocar el mismo no terminal al inicio. Esto bloquea descenso recursivo y suele generar conflictos LL(1).",
      evidence: productions.map(formatProductionLine),
      suggestion:
        "Pasa las repeticiones a un nuevo no terminal auxiliar para convertir la recursión izquierda en recursión derecha o iteración.",
      refactorHint: `${nonTerminal} → β ${nonTerminal}' y ${nonTerminal}' → α ${nonTerminal}' | ε.`
    });
  }

  for (const cycle of findIndirectLeftRecursion(grammar)) {
    diagnostics.push({
      id: `left-recursion-indirect-${cycle.key}`,
      parser: "Gramática",
      category: "left-recursion",
      severity: "error",
      title: "Recursión izquierda indirecta",
      scope: cycle.symbols.join(" ⇒ "),
      reason:
        "El primer símbolo de una derivación puede regresar al no terminal inicial por medio de otros no terminales.",
      evidence: cycle.evidence.map(formatProductionLine),
      suggestion:
        "Ordena los no terminales y sustituye derivaciones indirectas antes de aplicar la eliminación de recursión izquierda directa.",
      refactorHint: "sustituir producciones intermedias y luego eliminar la recursión directa resultante."
    });
  }

  return diagnostics;
}

function findIndirectLeftRecursion(grammar: Grammar) {
  const nonTerminals = new Set(grammar.nonTerminals);
  const adjacency = new Map<string, { to: string; production: GrammarProduction }[]>();

  for (const nonTerminal of grammar.nonTerminals) {
    adjacency.set(nonTerminal, []);
  }

  for (const production of grammar.productions) {
    const first = getFirstMeaningfulSymbol(production.right);

    if (first && nonTerminals.has(first)) {
      adjacency.get(production.left)?.push({ to: first, production });
    }
  }

  const cycles: {
    key: string;
    symbols: string[];
    evidence: GrammarProduction[];
  }[] = [];
  const seen = new Set<string>();

  for (const start of grammar.nonTerminals) {
    walkLeftRecursion(start, start, [start], [], adjacency, seen, cycles);
  }

  return cycles;
}

function walkLeftRecursion(
  start: string,
  current: string,
  chain: string[],
  evidence: GrammarProduction[],
  adjacency: Map<string, { to: string; production: GrammarProduction }[]>,
  seen: Set<string>,
  cycles: {
    key: string;
    symbols: string[];
    evidence: GrammarProduction[];
  }[]
) {
  for (const edge of adjacency.get(current) ?? []) {
    if (edge.to === start && chain.length > 1) {
      const symbols = [...chain, start];
      const key = canonicalCycleKey(symbols);

      if (!seen.has(key)) {
        seen.add(key);
        cycles.push({
          key,
          symbols,
          evidence: [...evidence, edge.production]
        });
      }

      continue;
    }

    if (chain.includes(edge.to)) continue;

    walkLeftRecursion(
      start,
      edge.to,
      [...chain, edge.to],
      [...evidence, edge.production],
      adjacency,
      seen,
      cycles
    );
  }
}

function canonicalCycleKey(symbols: string[]) {
  const uniqueCycle = symbols.slice(0, -1);
  const rotations = uniqueCycle.map((_, index) => [
    ...uniqueCycle.slice(index),
    ...uniqueCycle.slice(0, index)
  ]);

  return (
    rotations
      .map((rotation) => rotation.join("→"))
      .sort((left, right) => left.localeCompare(right))[0] ?? symbols.join("→")
  );
}

function detectAmbiguitySignals(
  grammar: Grammar,
  result: ParserExtraModulesResult
): ConflictDiagnostic[] {
  const diagnostics: ConflictDiagnostic[] = [];
  const expressionSignals = detectExpressionAmbiguityPatterns(grammar);
  const prefixSignals = detectCompetingPrefixSignals(grammar);
  const hasLr1Conflicts = getConflictCount(result.lr1) > 0;

  diagnostics.push(...expressionSignals);
  diagnostics.push(...prefixSignals);

  if (hasLr1Conflicts) {
    diagnostics.push({
      id: "ambiguity-lr1-conflict-signal",
      parser: "LR(1)",
      category: "ambiguity-signal",
      severity: "warn",
      title: "Posible ambigüedad o gramática no LR(1)",
      scope: "Tabla LR(1)",
      reason:
        "Si incluso LR(1) presenta conflictos, la gramática puede ser ambigua o necesitar una reescritura estructural.",
      evidence: [`Conflictos LR(1): ${getConflictCount(result.lr1)}`],
      suggestion:
        "Revisa si una misma cadena puede tener dos árboles de derivación. Para expresiones, separa niveles de precedencia.",
      refactorHint: "crear niveles como Expr, Term y Factor."
    });
  }

  return removeDuplicateDiagnostics(diagnostics);
}

function detectExpressionAmbiguityPatterns(
  grammar: Grammar
): ConflictDiagnostic[] {
  const nonTerminals = new Set(grammar.nonTerminals);
  const byLeft = new Map<string, GrammarProduction[]>();

  for (const production of grammar.productions) {
    const current = byLeft.get(production.left) ?? [];
    current.push(production);
    byLeft.set(production.left, current);
  }

  const diagnostics: ConflictDiagnostic[] = [];

  for (const [left, productions] of byLeft.entries()) {
    const infixProductions = productions.filter((production) => {
      const right = production.right.filter((symbol: string) => !isEpsilonSymbol(symbol));
      const first = right[0];
      const last = right[right.length - 1];
      const middle = right.slice(1, -1);

      return (
        right.length >= 3 &&
        first === left &&
        last === left &&
        middle.some((symbol: string) => !nonTerminals.has(symbol))
      );
    });

    if (infixProductions.length > 0) {
      diagnostics.push({
        id: `ambiguity-expression-${left}`,
        parser: "Gramática",
        category: "ambiguity-signal",
        severity: "warn",
        title: "Patrón clásico de ambigüedad en expresiones",
        scope: `No terminal ${left}`,
        reason:
          "Producciones del tipo E → E op E suelen permitir más de un árbol para cadenas como id + id * id si no hay niveles de precedencia.",
        evidence: infixProductions.map(formatProductionLine),
        suggestion:
          "Separa la gramática por niveles: expresión, término y factor. Así la precedencia queda codificada en la estructura.",
        refactorHint: "Expr → Expr + Term | Term; Term → Term * Factor | Factor; luego eliminar recursión izquierda si buscas LL(1)."
      });
    }
  }

  return diagnostics;
}

function detectCompetingPrefixSignals(grammar: Grammar): ConflictDiagnostic[] {
  const byLeftAndFirst = new Map<string, GrammarProduction[]>();

  for (const production of grammar.productions) {
    const first = getFirstMeaningfulSymbol(production.right);
    if (!first) continue;

    const key = `${production.left}::${first}`;
    const current = byLeftAndFirst.get(key) ?? [];
    current.push(production);
    byLeftAndFirst.set(key, current);
  }

  const diagnostics: ConflictDiagnostic[] = [];

  for (const [key, productions] of byLeftAndFirst.entries()) {
    if (productions.length < 2) continue;

    const [left = "?", first = "?"] = key.split("::");

    diagnostics.push({
      id: `ambiguity-prefix-${left}-${first}`,
      parser: "Gramática",
      category: "ambiguity-signal",
      severity: "info",
      title: "Alternativas con el mismo inicio",
      scope: `${left} empieza con ${first}`,
      reason:
        "Varias alternativas del mismo no terminal empiezan igual. Esto no prueba ambigüedad, pero puede causar conflictos LL(1) o indicar necesidad de factorización.",
      evidence: productions.map(formatProductionLine),
      suggestion:
        "Extrae el prefijo común hacia una sola producción y deja la decisión para un nuevo no terminal auxiliar.",
      refactorHint: `${left} → ${first} ${left}' y ${left}' → ...`
    });
  }

  return diagnostics;
}

function removeDuplicateDiagnostics(diagnostics: ConflictDiagnostic[]) {
  const seen = new Set<string>();
  const filtered: ConflictDiagnostic[] = [];

  for (const diagnostic of diagnostics) {
    const key = `${diagnostic.category}-${diagnostic.scope}-${diagnostic.evidence.join("|")}`;

    if (seen.has(key)) continue;

    seen.add(key);
    filtered.push(diagnostic);
  }

  return filtered;
}

function getFirstMeaningfulSymbol(symbols: string[]) {
  return symbols.find((symbol) => !isEpsilonSymbol(symbol)) ?? null;
}

function isEpsilonSymbol(symbol: string) {
  return ["ε", "ϵ", "eps", "epsilon", "lambda", "λ"].includes(
    symbol.trim().toLowerCase()
  );
}

function formatProductionLine(production: GrammarProduction) {
  const right = production.right.filter((symbol: string) => !isEpsilonSymbol(symbol));

  return `${production.left} → ${right.length > 0 ? right.join(" ") : "ε"}`;
}

function stringifyCompact(value: unknown) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getSeverityIcon(severity: ConflictSeverity) {
  if (severity === "error") return "!";
  if (severity === "warn") return "~";

  return "i";
}

function getSeverityColor(severity: ConflictSeverity) {
  if (severity === "error") return "var(--red)";
  if (severity === "warn") return "var(--amber)";

  return "var(--accent2)";
}

function getSeverityBorder(severity: ConflictSeverity) {
  if (severity === "error") return "rgba(248,113,113,.35)";
  if (severity === "warn") return "rgba(251,191,36,.35)";

  return "rgba(96,165,250,.28)";
}

function getSeverityBackground(severity: ConflictSeverity) {
  if (severity === "error") return "rgba(248,113,113,.07)";
  if (severity === "warn") return "rgba(251,191,36,.07)";

  return "rgba(96,165,250,.06)";
}

function getCategoryLabel(category: ConflictCategory) {
  if (category === "table-conflict") return "Tabla";
  if (category === "left-recursion") return "Recursión izquierda";
  if (category === "ambiguity-signal") return "Posible ambigüedad";

  return "Gramática";
}

function formatAccepted(value: boolean | undefined) {
  if (value === true) return "Aceptada";
  if (value === false) return "Rechazada";

  return "No ejecutada";
}
