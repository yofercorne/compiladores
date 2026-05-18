"use client";

import { useState, useMemo, useRef, useEffect, type CSSProperties, type ReactElement, type ReactNode } from "react";

import type {
  Grammar,
  GrammarParseIssue,
  FirstFollowResult,
  LL1TableResult,
  LL1SimulationResult,
  LR0Automaton,
  SLR1TableResult,
  SLR1SimulationResult,
  LR1TableResult,
  LR1SimulationResult,
  LALR1TableResult,
  LALR1SimulationResult,
  LR0TableResult,
  LR0SimulationResult,
} from "@/src/parser-engine";

import { FirstFollowPanel } from "@/components/FirstFollowPanel";
import { LL1TableView } from "@/components/LL1TableView";
import { ProductionsPanel } from "@/components/ProductionsPanel";
import { SimulationSteps } from "@/components/SimulationSteps";

import { LR0TableView } from "@/components/LR0TableView";
import { LR0SimulationSteps } from "@/components/LR0SimulationSteps";

import { SLR1TableView } from "@/components/SLR1TableView";
import { SLR1SimulationSteps } from "@/components/SLR1SimulationSteps";

import { LR1TableView } from "@/components/LR1TableView";
import { LR1SimulationSteps } from "@/components/LR1SimulationSteps";

import { LALR1TableView } from "@/components/LALR1TableView";
import { LALR1SimulationSteps } from "@/components/LALR1SimulationSteps";

import type { ParserLabModule } from "./ParserTopbar";

import { AutomataStudioPanel } from "@/components/AutomataStudioPanel";
import { ParserExtraModules } from "@/components/parser-lab/ParserExtraModules";
import type { GrammarExample } from "@/src/parser-engine";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

type ParserCenterResult = {
  grammar?: Grammar;
  issues: GrammarParseIssue[];
  firstFollow?: FirstFollowResult;
  ll1?: LL1TableResult;
  simulation?: LL1SimulationResult;

  lr0Automaton?: LR0Automaton;
  lr0?: LR0TableResult;
  lr0Simulation?: LR0SimulationResult;

  slr1?: SLR1TableResult;
  slr1Simulation?: SLR1SimulationResult;
  lr1?: LR1TableResult;
  lr1Simulation?: LR1SimulationResult;
  lalr1?: LALR1TableResult;
  lalr1Simulation?: LALR1SimulationResult;
};

type LabTab = "productions" | "firstFollow" | "tables" | "simulator" | "tree";

type AnalyzerKind = "recursiveDescent" | "ll1" | "lr0" | "slr1" | "lr1" | "lalr1";

type ConflictInfo = {
  stateId: string;
  symbol: string;
  reason: string;
  analyzerKind: AnalyzerKind;
};

type ParserCenterPanelProps = {
  activeModule: ParserLabModule;
  result: ParserCenterResult | null;
  inputString: string;
  examples?: GrammarExample[];
  selectedExampleId?: string;
  onSelectExample?: (example: GrammarExample) => void;
  onNavigateToAutomata?: (stateId?: string) => void;
};

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const LAB_TABS: Array<{ id: LabTab; label: string; icon: string }> = [
  { id: "productions",  label: "Producciones", icon: "𝑃"  },
  { id: "firstFollow",  label: "FIRST/FOLLOW", icon: "∑"  },
  { id: "tables",       label: "Tablas",        icon: "⊞"  },
  { id: "simulator",    label: "Simulador",     icon: "⏱"  },
  { id: "tree",         label: "Árbol",          icon: "🌳" },
];

const ANALYZERS: Array<{
  id: AnalyzerKind;
  label: string;
  group: "Top-Down" | "Bottom-Up";
  description: string;
}> = [
  { id: "ll1",   label: "LL(1)",    group: "Top-Down",   description: "Tabla predictiva usando FIRST/FOLLOW."        },
  { id: "lr0",   label: "LR(0)",    group: "Bottom-Up",  description: "Ítems, closure, goto y autómata."             },
  { id: "slr1",  label: "SLR(1)",   group: "Bottom-Up",  description: "ACTION/GOTO usando FOLLOW."                   },
  { id: "lr1",   label: "LR(1)",    group: "Bottom-Up",  description: "ACTION/GOTO con lookaheads."                  },
  { id: "lalr1", label: "LALR(1)",  group: "Bottom-Up",  description: "Tabla compacta por fusión de estados."        },
];

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function ParserCenterPanel({
  activeModule,
  result,
  inputString,
  examples,
  selectedExampleId,
  onSelectExample,
}: ParserCenterPanelProps) {
  const [activeLabTab, setActiveLabTab] = useState<LabTab>("firstFollow");
  const [activeTableAnalyzer, setActiveTableAnalyzer] = useState<AnalyzerKind>("ll1");
  const [activeSimulationAnalyzer, setActiveSimulationAnalyzer] = useState<AnalyzerKind>("ll1");


  if (activeModule === "lab") {
    return (
      <div className="module" style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
        {/* ── Tab bar ── */}
        <div className="ctabs" style={{ overflowX: "auto" }}>
          {LAB_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeLabTab === tab.id ? "ctab active" : "ctab"}
              onClick={() => setActiveLabTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="tab-pane active">
          {/* Empty state */}
          {!result ? (
            <EmptyModuleState
              title="Sin análisis"
              description={
                <>
                  Escribe una gramática y presiona{" "}
                  <strong style={{ color: "var(--accent)" }}>Ejecutar</strong>{" "}
                  para construir FIRST/FOLLOW, tablas, simulaciones y árbol.
                </>
              }
            />
          ) : null}

          {/* Issues block */}
          {result?.issues.length ? <IssuesBlock issues={result.issues} /> : null}

          {/* ── Producciones ── */}
          {result && activeLabTab === "productions" ? (
            result.grammar ? (
              <ProductionsPanel grammar={result.grammar} />
            ) : (
              <EmptyModuleState
                title="Producciones no disponibles"
                description="La gramática todavía no pudo convertirse a una estructura válida."
              />
            )
          ) : null}

          {/* ── FIRST/FOLLOW ── */}
          {result && activeLabTab === "firstFollow" ? (
            result.firstFollow ? (
              <FirstFollowPanel firstFollow={result.firstFollow} />
            ) : (
              <EmptyModuleState
                title="FIRST/FOLLOW no disponible"
                description="Ejecuta el análisis con una gramática válida."
              />
            )
          ) : null}

          {/* ── Tablas ── */}
          {result && activeLabTab === "tables" ? (
            <AnalyzerWorkArea
              title="Selecciona la tabla o estructura"
              activeAnalyzer={activeTableAnalyzer}
              onAnalyzerChange={setActiveTableAnalyzer}
            >
              <TableContent
                analyzer={activeTableAnalyzer}
                result={result}
              />
            </AnalyzerWorkArea>
          ) : null}

          {/* ── Simulador ── */}
          {result && activeLabTab === "simulator" ? (
            <AnalyzerWorkArea
              title="Selecciona el simulador"
              activeAnalyzer={activeSimulationAnalyzer}
              onAnalyzerChange={setActiveSimulationAnalyzer}
            >
              <EnhancedSimulationContent
                analyzer={activeSimulationAnalyzer}
                result={result}
                inputString={inputString}
              />
            </AnalyzerWorkArea>
          ) : null}

          {/* ── Árbol ── */}
          {result && activeLabTab === "tree" ? (
            result.grammar ? (
              <DynamicParseTreePanel
                grammar={result.grammar}
                inputString={inputString}
                simulation={result.simulation}
              />
            ) : (
              <EmptyModuleState
                title="Árbol no disponible"
                description="Ejecuta el análisis con una gramática válida."
              />
            )
          ) : null}
        </div>
      </div>
    );
  }

  if (activeModule === "automata") {
    return <AutomataStudioPanel result={result} />;
  }

  return (
    <ParserExtraModules
      activeModule={activeModule}
      result={result}
      inputString={inputString}
      examples={examples ?? []}
      {...(selectedExampleId !== undefined ? { selectedExampleId } : {})}
      {...(onSelectExample !== undefined ? { onSelectExample } : {})}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ANALYZER WORK AREA
// ═══════════════════════════════════════════════════════════════════════

type AnalyzerWorkAreaProps = {
  title: string;
  activeAnalyzer: AnalyzerKind;
  onAnalyzerChange: (analyzer: AnalyzerKind) => void;
  children: ReactNode;
};

function AnalyzerWorkArea({ title, activeAnalyzer, onAnalyzerChange, children }: AnalyzerWorkAreaProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <section
        style={{
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r)",
          padding: 12,
        }}
      >
        <div className="sec-label">{title}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
          {ANALYZERS.map((analyzer) => (
            <button
              key={analyzer.id}
              type="button"
              className={activeAnalyzer === analyzer.id ? "parser-card sel" : "parser-card"}
              onClick={() => onAnalyzerChange(analyzer.id)}
              style={{ textAlign: "left", minHeight: 86 }}
            >
              <span className={analyzer.group === "Top-Down" ? "pc-tag td-tag" : "pc-tag bu-tag"}>
                {analyzer.group}
              </span>
              <span className="pc-name">{analyzer.label}</span>
              <span className="pc-sub" style={{ lineHeight: 1.45 }}>{analyzer.description}</span>
            </button>
          ))}
        </div>
      </section>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TABLE CONTENT — with interactive conflict cells
// ═══════════════════════════════════════════════════════════════════════

function hideInternalConflicts<T extends { conflicts?: unknown[] }>(tableResult: T): T {
  return {
    ...tableResult,
    conflicts: [],
  };
}

type TableContentProps = {
  analyzer: AnalyzerKind;
  result: ParserCenterResult;
};

function TableContent({ analyzer, result }: TableContentProps) {
  if (analyzer === "recursiveDescent") {
    return (
      <EmptyModuleState
        title="Tabla no disponible"
        description="El descenso recursivo no usa tabla predictiva ni ACTION/GOTO. Su vista visual se muestra únicamente en la pestaña Árbol."
      />
    );
  }

  if (analyzer === "ll1") {
    return result.ll1 ? (
      <div className="flex min-w-0 flex-col gap-4">
<LL1TableView result={hideInternalConflicts(result.ll1)} />
        {result.ll1.conflicts.length > 0 && (
          <InteractiveConflictList
            title="Conflictos LL(1)"
            conflicts={result.ll1.conflicts.map((c) => ({
              stateId: c.nonTerminal ?? "",
              symbol: c.terminal ?? "",
              reason: c.reason,
              analyzerKind: "ll1" as AnalyzerKind,
            }))}
          />
        )}
      </div>
    ) : (
      <EmptyModuleState title="Tabla LL(1) no disponible" description="Ejecuta el análisis con una gramática válida." />
    );
  }

  if (analyzer === "lr0") {
    return result.lr0 ? (
      <div className="flex min-w-0 flex-col gap-4">
<LR0TableView result={hideInternalConflicts(result.lr0)} />
        {extractLRConflicts(result.lr0, "lr0").length > 0 && (
          <InteractiveConflictList
            title="Conflictos LR(0)"
            conflicts={extractLRConflicts(result.lr0, "lr0")}
          />
        )}
      </div>
    ) : (
      <EmptyModuleState title="Tabla LR(0) no disponible" description="Ejecuta el análisis con una gramática válida." />
    );
  }

  if (analyzer === "slr1") {
    return result.slr1 ? (
      <div className="flex min-w-0 flex-col gap-4">
<SLR1TableView result={hideInternalConflicts(result.slr1)} />
        {extractLRConflicts(result.slr1, "slr1").length > 0 && (
          <InteractiveConflictList
            title="Conflictos SLR(1)"
            conflicts={extractLRConflicts(result.slr1, "slr1")}
          />
        )}
      </div>
    ) : (
      <EmptyModuleState title="Tabla SLR(1) no disponible" description="Ejecuta el análisis con una gramática válida." />
    );
  }

  if (analyzer === "lr1") {
    return result.lr1 ? (
      <div className="flex min-w-0 flex-col gap-4">
<LR1TableView result={hideInternalConflicts(result.lr1)} />
        {extractLRConflicts(result.lr1, "lr1").length > 0 && (
          <InteractiveConflictList
            title="Conflictos LR(1)"
            conflicts={extractLRConflicts(result.lr1, "lr1")}
          />
        )}
      </div>
    ) : (
      <EmptyModuleState title="Tabla LR(1) no disponible" description="Ejecuta el análisis con una gramática válida." />
    );
  }

  return result.lalr1 ? (
    <div className="flex min-w-0 flex-col gap-4">
<LALR1TableView result={hideInternalConflicts(result.lalr1)} />
      {extractLRConflicts(result.lalr1, "lalr1").length > 0 && (
        <InteractiveConflictList
          title="Conflictos LALR(1)"
          conflicts={extractLRConflicts(result.lalr1, "lalr1")}
        />
      )}
    </div>
  ) : (
    <EmptyModuleState title="Tabla LALR(1) no disponible" description="Ejecuta el análisis con una gramática válida." />
  );
}

// Extract conflicts from LR table results into ConflictInfo
function extractLRConflicts(tableResult: unknown, kind: AnalyzerKind): ConflictInfo[] {
  if (!tableResult || typeof tableResult !== "object") return [];
  const tr = tableResult as Record<string, unknown>;
  const raw = Array.isArray(tr.conflicts) ? tr.conflicts : [];
  return raw.map((c: unknown) => {
    const conf = c as Record<string, unknown>;
    return {
      stateId: String(conf.stateId ?? conf.state ?? conf.from ?? "?"),
      symbol:  String(conf.symbol ?? conf.terminal ?? conf.on ?? "?"),
      reason:  String(conf.reason ?? conf.message ?? conf.description ?? "Conflicto detectado"),
      analyzerKind: kind,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════
// CONFLICT LIST — clear explanation only, without automata navigation
// ═══════════════════════════════════════════════════════════════════════

type InteractiveConflictListProps = {
  title: string;
  conflicts: ConflictInfo[];
};

function InteractiveConflictList({ title, conflicts }: InteractiveConflictListProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  return (
    <section
      style={{
        border: "1px solid rgba(248,113,113,.35)",
        background: "rgba(248,113,113,.05)",
        borderRadius: "var(--r)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid rgba(248,113,113,.2)",
          background: "rgba(248,113,113,.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14 }}>⚠</span>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--red)", margin: 0 }}>{title}</h2>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 99,
              background: "rgba(248,113,113,.15)",
              color: "#f87171",
              border: "1px solid rgba(248,113,113,.3)",
            }}
          >
            {conflicts.length} conflicto{conflicts.length !== 1 ? "s" : ""}
          </span>
        </div>
        <span style={{ fontSize: 10, color: "var(--txt3)" }}>
          Clic en un conflicto para ver la explicación
        </span>
      </div>

      <div
        style={{
          padding: "9px 14px",
          background: "rgba(96,165,250,.05)",
          borderBottom: "1px solid rgba(96,165,250,.1)",
          fontSize: 11,
          color: "var(--txt2)",
          lineHeight: 1.6,
        }}
      >
        💡 Un conflicto significa que la tabla tiene más de una acción posible para la misma situación.
        La app ya no te envía al autómata: aquí se muestra la celda/estado, el símbolo problemático,
        el tipo de choque y qué deberías revisar.
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {conflicts.map((conflict, idx) => {
          const isExpanded = expandedIdx === idx;
          const kindLabel = getConflictKindLabel(conflict);
          const locationLabel = conflict.analyzerKind === "ll1" ? "No terminal" : "Estado";
          const symbolLabel = conflict.analyzerKind === "ll1" ? "Lookahead" : "Símbolo";

          return (
            <div key={`${conflict.analyzerKind}-${conflict.stateId}-${conflict.symbol}-${idx}`}>
              <button
                type="button"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "11px 14px",
                  background:
                    hoveredIdx === idx ? "rgba(248,113,113,.1)" : isExpanded ? "rgba(248,113,113,.07)" : "transparent",
                  border: "none",
                  borderBottom: idx < conflicts.length - 1 ? "1px solid rgba(248,113,113,.1)" : "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background .15s",
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: "rgba(248,113,113,.12)",
                    border: "1px solid rgba(248,113,113,.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                  }}
                >
                  {idx + 1}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 11,
                        padding: "1px 6px",
                        borderRadius: 4,
                        background: "rgba(248,113,113,.12)",
                        color: "#f87171",
                        border: "1px solid rgba(248,113,113,.25)",
                      }}
                    >
                      {kindLabel}
                    </span>
                    {conflict.stateId && conflict.stateId !== "?" ? (
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: 11,
                          padding: "1px 6px",
                          borderRadius: 4,
                          background: "rgba(167,139,250,.12)",
                          color: "#a78bfa",
                          border: "1px solid rgba(167,139,250,.25)",
                        }}
                      >
                        {locationLabel}: {conflict.stateId}
                      </span>
                    ) : null}
                    {conflict.symbol && conflict.symbol !== "?" ? (
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: 11,
                          padding: "1px 6px",
                          borderRadius: 4,
                          background: "rgba(52,211,153,.08)",
                          color: "#34d399",
                          border: "1px solid rgba(52,211,153,.2)",
                        }}
                      >
                        {symbolLabel}: {conflict.symbol}
                      </span>
                    ) : null}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      color: "var(--txt2)",
                      lineHeight: 1.45,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {summarizeConflict(conflict)}
                  </div>
                </div>

                <div
                  style={{
                    flexShrink: 0,
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: isExpanded ? "rgba(96,165,250,.15)" : "rgba(96,165,250,.07)",
                    border: "1px solid rgba(96,165,250,.2)",
                    fontSize: 10,
                    color: "#60a5fa",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isExpanded ? "Ocultar" : "Explicar"}
                </div>
              </button>

              {isExpanded ? (
                <div
                  style={{
                    padding: "11px 14px 13px 54px",
                    background: "rgba(0,0,0,.15)",
                    borderBottom: idx < conflicts.length - 1 ? "1px solid rgba(248,113,113,.1)" : "none",
                  }}
                >
                  <ConflictExplanation conflict={conflict} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function getConflictKindLabel(conflict: ConflictInfo): string {
  const reason = conflict.reason.toLowerCase();
  if (conflict.analyzerKind === "ll1") return "Choque LL(1)";
  if (reason.includes("reduce/reduce") || reason.includes("reduce-reduce")) return "Reduce/Reduce";
  if (reason.includes("shift") && reason.includes("reduce")) return "Shift/Reduce";
  if (reason.includes("accept")) return "Accept/Reduce";
  return "Conflicto de tabla";
}

function summarizeConflict(conflict: ConflictInfo): string {
  if (conflict.analyzerKind === "ll1") {
    return `La celda M[${conflict.stateId || "?"}, ${conflict.symbol || "?"}] recibe más de una producción posible.`;
  }
  return `En el estado ${conflict.stateId || "?"}, con el símbolo ${conflict.symbol || "?"}, hay más de una acción posible.`;
}

function getConflictSuggestion(conflict: ConflictInfo): string {
  const reason = conflict.reason.toLowerCase();

  if (conflict.analyzerKind === "ll1") {
    return "Revisa si dos alternativas empiezan con el mismo FIRST. Usualmente se corrige con factorización izquierda o eliminando recursión izquierda.";
  }

  if (reason.includes("shift") && reason.includes("reduce")) {
    return "Revisa si la gramática necesita precedencia/asociatividad explícita. En expresiones, separa niveles como E, T y F.";
  }

  if (reason.includes("reduce/reduce") || reason.includes("reduce-reduce")) {
    return "Revisa producciones que pueden generar la misma forma. Este caso suele requerir reescribir la gramática, no solo cambiar de parser.";
  }

  if (conflict.analyzerKind === "slr1") {
    return "SLR(1) usa FOLLOW globales. Si el conflicto desaparece en LR(1), la gramática necesita lookaheads más precisos.";
  }

  if (conflict.analyzerKind === "lalr1") {
    return "El conflicto puede venir de fusionar estados LR(1). Compara con LR(1) canónico para verificar si la fusión perdió precisión.";
  }

  return "Prueba una gramática refactorizada o compara con LR(1), que usa más contexto para decidir.";
}

function ConflictExplanation({ conflict }: { conflict: ConflictInfo }) {
  const location = conflict.analyzerKind === "ll1"
    ? `celda M[${conflict.stateId || "?"}, ${conflict.symbol || "?"}]`
    : `estado ${conflict.stateId || "?"} con lookahead/símbolo ${conflict.symbol || "?"}`;

  return (
    <div style={{ display: "grid", gap: 9 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <span className="pill danger">{getConflictKindLabel(conflict)}</span>
        <span className="pill">{conflict.analyzerKind.toUpperCase()}</span>
      </div>

      <div>
        <div style={{ fontSize: 10, fontWeight: 800, color: "var(--txt3)", textTransform: "uppercase", letterSpacing: 1 }}>
          ¿Dónde ocurre?
        </div>
        <p style={{ fontSize: 11, color: "var(--txt2)", lineHeight: 1.65, margin: "4px 0 0" }}>
          Ocurre en la <strong style={{ color: "var(--txt1)" }}>{location}</strong>. En esa posición,
          el parser encontró más de una opción válida y por eso no puede tomar una decisión determinista.
        </p>
      </div>

      <div>
        <div style={{ fontSize: 10, fontWeight: 800, color: "var(--txt3)", textTransform: "uppercase", letterSpacing: 1 }}>
          Evidencia original
        </div>
        <code
          style={{
            display: "block",
            marginTop: 5,
            padding: "7px 9px",
            borderRadius: 6,
            background: "rgba(0,0,0,.22)",
            border: "1px solid rgba(255,255,255,.07)",
            color: "var(--txt1)",
            fontSize: 11,
            whiteSpace: "pre-wrap",
          }}
        >
          {conflict.reason}
        </code>
      </div>

      <div
        style={{
          padding: "7px 10px",
          borderRadius: 7,
          background: "rgba(52,211,153,.06)",
          border: "1px solid rgba(52,211,153,.16)",
          fontSize: 11,
          color: "var(--txt2)",
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: "#34d399" }}>Sugerencia:</strong> {getConflictSuggestion(conflict)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ENHANCED SIMULATION — step-by-step with educational explanations
// ═══════════════════════════════════════════════════════════════════════

type EnhancedSimulationContentProps = {
  analyzer: AnalyzerKind;
  result: ParserCenterResult;
  inputString: string;
};

function EnhancedSimulationContent({ analyzer, result, inputString }: EnhancedSimulationContentProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [speed, setSpeed] = useState(1200);
  const [showLearningMode, setShowLearningMode] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const steps = useMemo(() => extractSimulationSteps(analyzer, result), [analyzer, result]);
  const activeStep = steps[currentStep];
  const hasNativeSimulation = hasSimulation(analyzer, result);
  const analyzerLabel = ANALYZERS.find((a) => a.id === analyzer)?.label ?? analyzer.toUpperCase();

  useEffect(() => {
    setCurrentStep(0);
    setAutoPlay(false);
    setShowLearningMode(false);
  }, [analyzer]);

  useEffect(() => {
    if (autoPlay && steps.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= steps.length - 1) {
            setAutoPlay(false);
            return prev;
          }
          return prev + 1;
        });
      }, speed);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoPlay, speed, steps.length]);

  if (analyzer === "recursiveDescent") {
    return (
      <EmptyModuleState
        title="Simulación no disponible"
        description="La visualización tipo árbol del descenso recursivo se muestra únicamente en la pestaña Árbol."
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {hasNativeSimulation ? (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: 8,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--txt2)", textTransform: "uppercase", letterSpacing: 1 }}>
              Tabla detallada de pasos
            </div>
            {steps.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setShowLearningMode((value) => !value);
                  setAutoPlay(false);
                }}
                style={{
                  border: "1px solid",
                  borderColor: showLearningMode ? "rgba(99,102,241,.45)" : "var(--border)",
                  background: showLearningMode ? "rgba(99,102,241,.14)" : "var(--bg2)",
                  color: showLearningMode ? "#a5b4fc" : "var(--txt2)",
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {showLearningMode ? "Ocultar modo aprendizaje" : "Mostrar modo aprendizaje"}
              </button>
            ) : null}
          </div>
          <NativeSimulationView analyzer={analyzer} result={result} />
        </div>
      ) : (
        <EmptyModuleState
          title={`Simulación ${analyzerLabel} no disponible`}
          description="Solo aparece si la tabla no tiene conflictos y la cadena puede analizarse con este parser."
        />
      )}

      {showLearningMode ? (
        steps.length > 0 ? (
          <section
            style={{
              border: "1px solid rgba(99,102,241,.24)",
              background: "rgba(99,102,241,.055)",
              borderRadius: "var(--r)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid rgba(99,102,241,.18)",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>🎓</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#a5b4fc", marginBottom: 3 }}>
                  Modo aprendizaje — {analyzerLabel}
                </div>
                <div style={{ fontSize: 11, color: "var(--txt2)", lineHeight: 1.6 }}>
                  {getAnalyzerEducationalDescription(analyzer)} Aquí puedes avanzar paso por paso y ver qué cambia en la pila,
                  la entrada y la acción elegida.
                </div>
              </div>
            </div>

            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  padding: "10px 14px",
                  background: "var(--bg2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => { setCurrentStep(0); setAutoPlay(false); }}
                    disabled={currentStep === 0}
                    style={stepBtnStyle(currentStep === 0)}
                    title="Reiniciar"
                  >⏮</button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep((p) => Math.max(0, p - 1))}
                    disabled={currentStep === 0}
                    style={stepBtnStyle(currentStep === 0)}
                    title="Anterior"
                  >◀</button>
                  <button
                    type="button"
                    onClick={() => setAutoPlay((a) => !a)}
                    style={stepBtnStyle(false, true)}
                    title={autoPlay ? "Pausar" : "Reproducir"}
                  >{autoPlay ? "⏸" : "▶"}</button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep((p) => Math.min(steps.length - 1, p + 1))}
                    disabled={currentStep >= steps.length - 1}
                    style={stepBtnStyle(currentStep >= steps.length - 1)}
                    title="Siguiente"
                  >▶</button>
                  <button
                    type="button"
                    onClick={() => { setCurrentStep(steps.length - 1); setAutoPlay(false); }}
                    disabled={currentStep >= steps.length - 1}
                    style={stepBtnStyle(currentStep >= steps.length - 1)}
                    title="Ir al final"
                  >⏭</button>
                </div>

                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 180 }}>
                  <div style={{ flex: 1, height: 4, background: "var(--bg3)", borderRadius: 2, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${((currentStep + 1) / steps.length) * 100}%`,
                        background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
                        borderRadius: 2,
                        transition: "width .3s",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 10, color: "var(--txt3)", fontFamily: "var(--mono)", whiteSpace: "nowrap" }}>
                    {currentStep + 1} / {steps.length}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "var(--txt2)", flexWrap: "wrap" }}>
                  <span>Velocidad</span>
                  {([ ["Lenta", 2000], ["Normal", 1200], ["Rápida", 600] ] as const).map(([label, val]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setSpeed(val)}
                      style={{
                        padding: "2px 7px",
                        borderRadius: 4,
                        border: "1px solid",
                        borderColor: speed === val ? "rgba(99,102,241,.5)" : "var(--border)",
                        background: speed === val ? "rgba(99,102,241,.15)" : "transparent",
                        color: speed === val ? "#a5b4fc" : "var(--txt3)",
                        fontSize: 10,
                        cursor: "pointer",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {activeStep ? (
                <SimulationStepCard step={activeStep} stepIndex={currentStep} totalSteps={steps.length} analyzer={analyzer} />
              ) : null}

              {activeStep && (activeStep.stack !== undefined || activeStep.input !== undefined) ? (
                <StackInputVisualizer step={activeStep} inputString={inputString} />
              ) : null}
            </div>
          </section>
        ) : (
          <InfoBox>
            No hay pasos normalizados para el modo aprendizaje, pero la tabla detallada del simulador sigue disponible arriba.
          </InfoBox>
        )
      ) : null}
    </div>
  );
}

function stepBtnStyle(disabled: boolean, primary = false) {
  return {
    width: 28,
    height: 28,
    borderRadius: 6,
    border: "1px solid",
    borderColor: primary ? "rgba(99,102,241,.4)" : "var(--border)",
    background: primary ? "rgba(99,102,241,.12)" : disabled ? "transparent" : "var(--bg3)",
    color: disabled ? "var(--txt3)" : primary ? "#a5b4fc" : "var(--txt1)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 11,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as CSSProperties;
}

function getAnalyzerEducationalDescription(analyzer: AnalyzerKind): string {
  switch (analyzer) {
    case "ll1":
      return "LL(1) analiza la entrada de izquierda a derecha construyendo una derivación más a la izquierda. En cada paso, usa la tabla predictiva para expandir el no-terminal del tope de la pila según el símbolo actual de entrada.";
    case "lr0":
      return "LR(0) analiza de abajo hacia arriba mediante acciones Shift y Reduce. Shift desplaza el símbolo de entrada a la pila. Reduce aplica una producción gramatical reemplazando símbolos del tope por el lado izquierdo.";
    case "slr1":
      return "SLR(1) es LR(0) reforzado con conjuntos FOLLOW para resolver conflictos. Solo reduce cuando el siguiente símbolo de entrada pertenece al FOLLOW del no-terminal objetivo.";
    case "lr1":
      return "LR(1) usa lookaheads explícitos en cada ítem. Al reducir, verifica que el símbolo actual coincida con el lookahead del ítem completo, eliminando la mayoría de conflictos.";
    case "lalr1":
      return "LALR(1) fusiona estados LR(1) con el mismo núcleo de ítems, obteniendo una tabla compacta. Es el método más usado en generadores de parsers como Bison/Yacc.";
    default:
      return "";
  }
}

// Simulation step card with educational annotations
type SimActionType = "shift" | "reduce" | "accept" | "error" | "expand" | "match";

type SimStep = {
  action?: string;
  actionType?: SimActionType;
  stack?: unknown[];
  input?: string[];
  rule?: string;
  explanation?: string;
  description?: string;
};

type SimulationStepCardProps = {
  step: SimStep;
  stepIndex: number;
  totalSteps: number;
  analyzer: AnalyzerKind;
};

function SimulationStepCard({ step, stepIndex, totalSteps, analyzer }: SimulationStepCardProps) {
  const actionType = step.actionType ?? guessActionType(step.action ?? step.description ?? "");
  const actionColors = {
    shift:  { bg: "rgba(99,102,241,.12)",  border: "rgba(99,102,241,.35)",  text: "#a5b4fc", label: "SHIFT"  },
    reduce: { bg: "rgba(251,191,36,.10)",  border: "rgba(251,191,36,.35)",  text: "#fbbf24", label: "REDUCE" },
    accept: { bg: "rgba(52,211,153,.10)",  border: "rgba(52,211,153,.35)",  text: "#34d399", label: "ACCEPT" },
    error:  { bg: "rgba(248,113,113,.10)", border: "rgba(248,113,113,.35)", text: "#f87171", label: "ERROR"  },
    expand: { bg: "rgba(96,165,250,.10)",  border: "rgba(96,165,250,.35)",  text: "#60a5fa", label: "EXPAND" },
    match:  { bg: "rgba(52,211,153,.08)",  border: "rgba(52,211,153,.25)",  text: "#34d399", label: "MATCH"  },
  };
  const colors = actionColors[actionType] ?? actionColors.shift;

  return (
    <div
      style={{
        borderRadius: "var(--r)",
        border: `1px solid ${colors.border}`,
        background: colors.bg,
        overflow: "hidden",
      }}
    >
      {/* Step header */}
      <div
        style={{
          padding: "8px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: `1px solid ${colors.border}`,
          background: "rgba(0,0,0,.1)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: 4,
            background: colors.bg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
          }}
        >
          {colors.label}
        </span>
        <span style={{ fontSize: 11, color: "var(--txt2)", flex: 1 }}>
          {step.action ?? step.description ?? `Paso ${stepIndex + 1}`}
        </span>
        <span style={{ fontSize: 10, color: "var(--txt3)", fontFamily: "var(--mono)" }}>
          {stepIndex + 1}/{totalSteps}
        </span>
      </div>

      {/* Educational explanation */}
      <div style={{ padding: "10px 14px" }}>
        <div style={{ fontSize: 11, color: colors.text, fontWeight: 600, marginBottom: 5 }}>
          ¿Qué ocurre en este paso?
        </div>
        <p style={{ fontSize: 11, color: "var(--txt2)", lineHeight: 1.65, margin: 0 }}>
          {step.explanation ?? step.description ?? buildStepExplanation(actionType, step, analyzer)}
        </p>

        {/* Rule applied */}
        {step.rule ? (
          <div
            style={{
              marginTop: 8,
              padding: "5px 10px",
              borderRadius: 5,
              background: "rgba(0,0,0,.2)",
              border: "1px solid rgba(255,255,255,.05)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 10, color: "var(--txt3)" }}>Producción:</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt1)" }}>{step.rule}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function guessActionType(action: string): SimActionType {
  const a = action.toLowerCase();
  if (a.includes("accept") || a.includes("aceptar")) return "accept";
  if (a.includes("error")) return "error";
  if (a.includes("reduce") || a.includes("reducir")) return "reduce";
  if (a.includes("shift") || a.includes("desplazar")) return "shift";
  if (a.includes("expand") || a.includes("expandir")) return "expand";
  if (a.includes("match") || a.includes("coincidir")) return "match";
  return "shift";
}

function buildStepExplanation(actionType: SimActionType, step: SimStep, analyzer: AnalyzerKind): string {
  switch (actionType) {
    case "shift":
      return `Se desplaza (Shift) el símbolo de entrada al tope de la pila y se avanza al siguiente estado. La entrada avanza un token.`;
    case "reduce":
      return `Se aplica la producción ${step.rule ?? "..."}, reemplazando los símbolos del tope de la pila por el no-terminal del lado izquierdo. El estado retrocede por la tabla GOTO.`;
    case "accept":
      return `¡La cadena ha sido aceptada! La pila contiene el símbolo inicial y la entrada está vacía. El análisis finalizó con éxito.`;
    case "error":
      return `Se encontró un símbolo inesperado. La cadena no pertenece al lenguaje generado por esta gramática.`;
    case "expand":
      return analyzer === "ll1"
        ? `Se expande el no-terminal del tope de la pila usando la tabla LL(1). La producción seleccionada se coloca en la pila en orden inverso.`
        : `Se expande el símbolo actual según la tabla predictiva.`;
    case "match":
      return `El terminal del tope de la pila coincide con el símbolo de entrada. Se eliminan ambos y la entrada avanza.`;
    default:
      return "Paso de análisis.";
  }
}

// Stack / Input visual strip
function StackInputVisualizer({ step, inputString }: { step: SimStep; inputString: string }) {
  const stack = Array.isArray(step.stack) ? step.stack.map(String) : [];
  const input = Array.isArray(step.input) ? step.input : inputString ? inputString.split(" ") : [];

  return (
    <div
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r)",
        padding: "10px 14px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
      }}
    >
      {/* Stack */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--txt3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
          Pila
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "flex-end" }}>
          {stack.length === 0 ? (
            <span style={{ fontSize: 11, color: "var(--txt3)", fontFamily: "var(--mono)" }}>vacía</span>
          ) : (
            stack.map((sym, i) => (
              <span
                key={i}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  padding: "2px 7px",
                  borderRadius: 4,
                  background: i === stack.length - 1 ? "rgba(99,102,241,.2)" : "rgba(99,102,241,.07)",
                  color: i === stack.length - 1 ? "#a5b4fc" : "var(--txt2)",
                  border: "1px solid",
                  borderColor: i === stack.length - 1 ? "rgba(99,102,241,.4)" : "rgba(99,102,241,.15)",
                  fontWeight: i === stack.length - 1 ? 700 : 400,
                }}
              >
                {sym}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Input */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--txt3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
          Entrada
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {input.length === 0 ? (
            <span style={{ fontSize: 11, color: "var(--txt3)", fontFamily: "var(--mono)" }}>ε (vacía)</span>
          ) : (
            input.map((sym, i) => (
              <span
                key={i}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  padding: "2px 7px",
                  borderRadius: 4,
                  background: i === 0 ? "rgba(52,211,153,.15)" : "rgba(52,211,153,.05)",
                  color: i === 0 ? "#34d399" : "var(--txt2)",
                  border: "1px solid",
                  borderColor: i === 0 ? "rgba(52,211,153,.35)" : "rgba(52,211,153,.1)",
                  fontWeight: i === 0 ? 700 : 400,
                }}
              >
                {sym}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Helpers to extract steps from simulation results
function hasSimulation(analyzer: AnalyzerKind, result: ParserCenterResult): boolean {
  if (analyzer === "ll1")   return Boolean(result.simulation);
  if (analyzer === "lr0")   return Boolean(result.lr0Simulation);
  if (analyzer === "slr1")  return Boolean(result.slr1Simulation);
  if (analyzer === "lr1")   return Boolean(result.lr1Simulation);
  if (analyzer === "lalr1") return Boolean(result.lalr1Simulation);
  return false;
}

function extractSimulationSteps(analyzer: AnalyzerKind, result: ParserCenterResult): SimStep[] {
  let simResult: unknown = null;
  if (analyzer === "ll1") simResult = result.simulation;
  else if (analyzer === "lr0") simResult = result.lr0Simulation;
  else if (analyzer === "slr1") simResult = result.slr1Simulation;
  else if (analyzer === "lr1") simResult = result.lr1Simulation;
  else if (analyzer === "lalr1") simResult = result.lalr1Simulation;

  if (!simResult || typeof simResult !== "object") return [];
  const r = simResult as Record<string, unknown>;
  const rawSteps = Array.isArray(r.steps) ? r.steps : Array.isArray(r.trace) ? r.trace : [];

  return rawSteps.map((s: unknown) => {
    const step = (typeof s === "object" && s !== null ? s : {}) as Record<string, unknown>;
    const action = String(step.action ?? step.description ?? step.move ?? step.kind ?? "Paso de análisis");
    const normalized: SimStep = {
      action,
      actionType: guessActionType(String(step.action ?? step.type ?? step.kind ?? step.description ?? "")),
    };

    const stack = step.stack ?? step.pila;
    const input = step.input ?? step.remainingInput ?? step.entrada;
    const rule = step.rule ?? step.production ?? step.produccion;
    const explanation = step.explanation ?? step.message ?? step.detail;

    if (Array.isArray(stack)) normalized.stack = stack;
    if (Array.isArray(input)) normalized.input = input.map(String);
    if (rule !== undefined && rule !== null && String(rule).trim()) normalized.rule = String(rule);
    if (explanation !== undefined && explanation !== null && String(explanation).trim()) normalized.explanation = String(explanation);

    return normalized;
  });
}

// Native simulation component wrapper
function NativeSimulationView({ analyzer, result }: { analyzer: AnalyzerKind; result: ParserCenterResult }) {
  if (analyzer === "ll1" && result.simulation)        return <SimulationSteps simulation={result.simulation} />;
  if (analyzer === "lr0" && result.lr0Simulation)     return <LR0SimulationSteps simulation={result.lr0Simulation} />;
  if (analyzer === "slr1" && result.slr1Simulation)   return <SLR1SimulationSteps simulation={result.slr1Simulation} />;
  if (analyzer === "lr1" && result.lr1Simulation)     return <LR1SimulationSteps simulation={result.lr1Simulation} />;
  if (analyzer === "lalr1" && result.lalr1Simulation) return <LALR1SimulationSteps simulation={result.lalr1Simulation} />;
  return null;
}

// ═══════════════════════════════════════════════════════════════════════
// DYNAMIC PARSE TREE — built from real grammar and input string
// ═══════════════════════════════════════════════════════════════════════

type DynTreeNode = {
  id: string;
  label: string;
  kind: "nonTerminal" | "terminal" | "epsilon";
  children: DynTreeNode[];
  // Layout coords (set after computation)
  x?: number;
  y?: number;
  width?: number;
};

const NODE_W   = 52;
const NODE_H   = 28;
const H_GAP    = 20;
const V_GAP    = 60;
const ROOT_Y   = 40;


function getGrammarStartSymbol(grammar: Grammar): string {
  const maybeStart = (grammar as unknown as { startSymbol?: unknown }).startSymbol;
  return String(maybeStart ?? grammar.productions[0]?.left ?? "S");
}

function getGrammarNonTerminals(grammar: Grammar): Set<string> {
  const rawNonTerminals = (grammar as unknown as { nonTerminals?: unknown }).nonTerminals;
  if (Array.isArray(rawNonTerminals) && rawNonTerminals.length > 0) {
    return new Set(rawNonTerminals.map(String));
  }
  return new Set(grammar.productions.map((production) => String(production.left)));
}

function tokenizeInput(inputString: string): string[] {
  return inputString.trim().split(/\s+/).filter(Boolean);
}

function isEpsilonSymbol(symbol: string): boolean {
  const value = symbol.trim().toLowerCase();
  return value === "ε" || value === "ϵ" || value === "eps" || value === "epsilon";
}

function getProductionSymbols(production: Grammar["productions"][number]): string[] {
  const right = Array.isArray(production.right) ? production.right.map(String) : [];
  if (right.length === 0) return ["ε"];
  return right;
}

function makeTreeNode(label: string, kind: DynTreeNode["kind"], children: DynTreeNode[] = []): DynTreeNode {
  return {
    id: `${label}_${Math.random().toString(36).slice(2, 8)}`,
    label,
    kind,
    children,
  };
}

function buildMatchedTree(grammar: Grammar, inputString: string): DynTreeNode | null {
  if (!grammar.productions.length) return null;

  const tokens = tokenizeInput(inputString);
  const startSymbol = getGrammarStartSymbol(grammar);
  const nonTerminals = getGrammarNonTerminals(grammar);
  const productionsByLeft = new Map<string, Grammar["productions"][number][]>();

  for (const production of grammar.productions) {
    const left = String(production.left);
    const list = productionsByLeft.get(left) ?? [];
    list.push(production);
    productionsByLeft.set(left, list);
  }

  const maxDepth = Math.max(24, tokens.length * 8 + grammar.productions.length * 3);

  type ParseCandidate = {
    node: DynTreeNode;
    pos: number;
  };

  function parseSymbol(symbol: string, pos: number, depth: number, active: Set<string>): ParseCandidate[] {
    if (depth > maxDepth) return [];

    if (isEpsilonSymbol(symbol)) {
      return [{ node: makeTreeNode("ε", "epsilon"), pos }];
    }

    if (!nonTerminals.has(symbol)) {
      if (tokens[pos] === symbol) {
        return [{ node: makeTreeNode(symbol, "terminal"), pos: pos + 1 }];
      }
      return [];
    }

    const activeKey = `${symbol}@${pos}`;
    if (active.has(activeKey)) return [];

    const productions = productionsByLeft.get(symbol) ?? [];
    const nextActive = new Set(active);
    nextActive.add(activeKey);
    const candidates: ParseCandidate[] = [];

    for (const production of productions) {
      const symbols = getProductionSymbols(production);
      const sequenceCandidates = parseSequence(symbols, pos, depth + 1, nextActive);
      for (const candidate of sequenceCandidates) {
        candidates.push({
          node: makeTreeNode(symbol, "nonTerminal", candidate.children),
          pos: candidate.pos,
        });
      }
    }

    return candidates;
  }

  function parseSequence(
    symbols: string[],
    pos: number,
    depth: number,
    active: Set<string>,
  ): Array<{ children: DynTreeNode[]; pos: number }> {
    if (symbols.length === 0 || symbols.every(isEpsilonSymbol)) {
      return [{ children: [makeTreeNode("ε", "epsilon")], pos }];
    }

    let partials: Array<{ children: DynTreeNode[]; pos: number }> = [{ children: [], pos }];

    for (const symbol of symbols) {
      const nextPartials: Array<{ children: DynTreeNode[]; pos: number }> = [];
      for (const partial of partials) {
        const parsed = parseSymbol(symbol, partial.pos, depth + 1, active);
        for (const candidate of parsed) {
          nextPartials.push({
            children: [...partial.children, candidate.node],
            pos: candidate.pos,
          });
        }
      }
      partials = nextPartials;
      if (partials.length === 0) break;
    }

    return partials;
  }

  const candidates = parseSymbol(startSymbol, 0, 0, new Set());
  const complete = candidates.find((candidate) => candidate.pos === tokens.length);
  return complete?.node ?? null;
}

// Build a derivation tree from LL(1) simulation steps (if available)
// Falls back to a structural tree from the grammar productions
function buildTreeFromSimulation(
  grammar: Grammar,
  simulation: LL1SimulationResult | undefined,
  inputString: string,
): DynTreeNode | null {
  const matchedTree = buildMatchedTree(grammar, inputString);
  if (matchedTree) return matchedTree;

  // If we have a simulation with a derivation tree, use it
  if (simulation) {
    const s = simulation as unknown as Record<string, unknown>;
    if (s.tree && typeof s.tree === "object") {
      return adaptSimTree(s.tree, grammar);
    }
    if (Array.isArray(s.steps) && s.steps.length > 0) {
      return buildTreeFromSteps(s.steps as Record<string, unknown>[], grammar);
    }
  }

  // Fall back: build structural tree from first production of start symbol
  if (!grammar?.productions?.length) return null;
  return buildStructuralTree(grammar, inputString);
}

function adaptSimTree(raw: unknown, grammar: Grammar): DynTreeNode | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const label = String(r.label ?? r.symbol ?? r.value ?? "?");
  const isTerminal = isTerminalSymbol(label, grammar);
  const children = Array.isArray(r.children)
    ? (r.children.map((c: unknown) => adaptSimTree(c, grammar)).filter(Boolean) as DynTreeNode[])
    : [];
  return {
    id: `n_${Math.random().toString(36).slice(2)}`,
    label,
    kind: isEpsilonSymbol(label) ? "epsilon" : isTerminal ? "terminal" : "nonTerminal",
    children,
  };
}

function isTerminalSymbol(sym: string, grammar: Grammar): boolean {
  if (!grammar?.productions) return false;
  return !getGrammarNonTerminals(grammar).has(sym) && !isEpsilonSymbol(sym);
}

// Build tree from LL(1) steps (expand actions)
function buildTreeFromSteps(steps: Record<string, unknown>[], grammar: Grammar): DynTreeNode | null {
  if (!grammar?.productions?.length) return null;
  const startSym = getGrammarStartSymbol(grammar);

  type MutableNode = { id: string; label: string; kind: DynTreeNode["kind"]; children: MutableNode[] };
  const root: MutableNode = { id: "root", label: startSym, kind: "nonTerminal", children: [] };

  // Simple derivation replay — find expand steps and attach children
  let nodeCounter = 0;
  const leaves: MutableNode[] = [root];

  for (const step of steps) {
    const action = String(step.action ?? step.type ?? "").toLowerCase();
    if (!action.includes("expand") && !action.includes("predict") && !action.includes("derivar")) continue;

    const rule = step.rule ?? step.production;
    if (!rule) continue;
    const ruleStr = String(rule);
    const arrow = ruleStr.includes("→") ? "→" : ruleStr.includes("->") ? "->" : null;
    if (!arrow) continue;
    const rhs = ruleStr.slice(ruleStr.indexOf(arrow) + arrow.length).trim().split(/\s+/).filter(Boolean);

    const leaf = leaves.shift();
    if (!leaf) break;

    for (const sym of rhs) {
      const childKind: DynTreeNode["kind"] = isEpsilonSymbol(sym) ? "epsilon" : isTerminalSymbol(sym, grammar) ? "terminal" : "nonTerminal";
      const child: MutableNode = { id: `n${nodeCounter++}`, label: sym, kind: childKind, children: [] };
      leaf.children.push(child);
      if (childKind === "nonTerminal") leaves.push(child);
    }
  }

  return root as DynTreeNode;
}

// Structural tree: expand start symbol using first matching productions (BFS, max depth 4)
function buildStructuralTree(grammar: Grammar, inputString: string): DynTreeNode | null {
  if (!grammar?.productions?.length) return null;
  const startSym = getGrammarStartSymbol(grammar);
  const prodsByLeft = new Map<string, Grammar["productions"][number][]>();
  for (const p of grammar.productions) {
    const k = String(p.left);
    if (!prodsByLeft.has(k)) prodsByLeft.set(k, []);
    prodsByLeft.get(k)!.push(p);
  }

  const tokens = inputString.trim().split(/\s+/).filter(Boolean);
  let tokenIdx = 0;

  function expand(sym: string, depth: number): DynTreeNode {
    const id = `n_${sym}_${depth}_${Math.random().toString(36).slice(2, 6)}`;
    if (depth > 4 || isTerminalSymbol(sym, grammar)) {
      const isEps = isEpsilonSymbol(sym);
      const isMatch = !isEps && tokens[tokenIdx] === sym;
      if (isMatch) tokenIdx++;
      return { id, label: sym, kind: isEps ? "epsilon" : "terminal", children: [] };
    }
    const prods = prodsByLeft.get(sym);
    if (!prods?.length) return { id, label: sym, kind: "nonTerminal", children: [] };
    const prod = prods[0]!;
    const right = Array.isArray(prod.right) ? prod.right.map(String) : [];
    const children = right.map((s) => expand(s, depth + 1));
    return { id, label: sym, kind: "nonTerminal", children };
  }

  return expand(startSym, 0);
}

// Compute Reingold-Tilford-inspired layout
function layoutTree(node: DynTreeNode): { node: DynTreeNode; width: number; height: number } {
  let nodeIdx = 0;

  function measure(n: DynTreeNode, depth: number): number {
    n.id = `ln_${nodeIdx++}`;
    if (n.children.length === 0) {
      n.width = NODE_W;
      return NODE_W;
    }
    let total = 0;
    for (const c of n.children) {
      total += measure(c, depth + 1) + H_GAP;
    }
    total -= H_GAP;
    n.width = Math.max(NODE_W, total);
    return n.width;
  }

  function place(n: DynTreeNode, x: number, depth: number) {
    n.x = x;
    n.y = ROOT_Y + depth * (NODE_H + V_GAP);
    if (n.children.length === 0) return;
    let cx = x - (n.width! - NODE_W) / 2;
    for (const c of n.children) {
      place(c, cx + (c.width! - NODE_W) / 2, depth + 1);
      cx += c.width! + H_GAP;
    }
  }

  const totalW = measure(node, 0);
  const startX = totalW / 2;
  place(node, startX, 0);

  let maxY = 0;
  function walkHeight(n: DynTreeNode) {
    if (n.y !== undefined) maxY = Math.max(maxY, n.y);
    for (const c of n.children) walkHeight(c);
  }
  walkHeight(node);

  return { node, width: Math.max(600, totalW + 80), height: maxY + NODE_H + 40 };
}

// Collect highlighted node path during simulation step walkthrough
function collectPath(node: DynTreeNode, stepIdx: number): Set<string> {
  const ids = new Set<string>();
  let counter = 0;
  function walk(n: DynTreeNode) {
    if (counter <= stepIdx) { ids.add(n.id); counter++; }
    for (const c of n.children) walk(c);
  }
  walk(node);
  return ids;
}


function collectTerminalFrontier(node: DynTreeNode): string[] {
  const leaves: string[] = [];
  function walk(current: DynTreeNode) {
    if (current.children.length === 0) {
      if (current.kind === "terminal") leaves.push(current.label);
      return;
    }
    for (const child of current.children) walk(child);
  }
  walk(node);
  return leaves;
}

type CompactAstNode = {
  label: string;
  children: CompactAstNode[];
};

function buildExpressionAstLabel(inputString: string): string | null {
  const tokens = tokenizeInput(inputString).filter((token) => !isEpsilonSymbol(token));
  if (!tokens.length) return null;

  const precedence = new Map<string, number>([
    ["+", 1],
    ["-", 1],
    ["*", 2],
    ["/", 2],
  ]);

  if (!tokens.some((token) => precedence.has(token))) return null;

  const values: CompactAstNode[] = [];
  const operators: string[] = [];

  function applyOperator(): boolean {
    const operator = operators.pop();
    const right = values.pop();
    const left = values.pop();
    if (!operator || !left || !right) return false;
    values.push({ label: operator, children: [left, right] });
    return true;
  }

  for (const token of tokens) {
    if (token === "(") {
      operators.push(token);
      continue;
    }

    if (token === ")") {
      while (operators.length && operators[operators.length - 1] !== "(") {
        if (!applyOperator()) return null;
      }
      if (operators[operators.length - 1] !== "(") return null;
      operators.pop();
      continue;
    }

    if (precedence.has(token)) {
      while (
        operators.length &&
        operators[operators.length - 1] !== "(" &&
        (precedence.get(operators[operators.length - 1] ?? "") ?? 0) >= (precedence.get(token) ?? 0)
      ) {
        if (!applyOperator()) return null;
      }
      operators.push(token);
      continue;
    }

    values.push({ label: token, children: [] });
  }

  while (operators.length) {
    if (operators[operators.length - 1] === "(") return null;
    if (!applyOperator()) return null;
  }

  if (values.length !== 1) return null;

  function print(node: CompactAstNode): string {
    if (!node.children.length) return node.label;
    return `(${node.label} ${node.children.map(print).join(" ")})`;
  }

  return print(values[0]!);
}

type DynamicParseTreePanelProps = {
  grammar: Grammar;
  inputString: string;
  simulation?: LL1SimulationResult | undefined;
};

function DynamicParseTreePanel({ grammar, inputString, simulation }: DynamicParseTreePanelProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [pathStep, setPathStep] = useState(0);
  const [showPath, setShowPath] = useState(false);

  const treeData = useMemo(() => {
    const root = buildTreeFromSimulation(grammar, simulation, inputString);
    if (!root) return null;
    return layoutTree(root);
  }, [grammar, inputString, simulation]);

  const highlightedIds = useMemo(() => {
    if (!showPath || !treeData) return new Set<string>();
    return collectPath(treeData.node, pathStep);
  }, [showPath, pathStep, treeData]);

  // Count total nodes for path stepping
  const totalNodes = useMemo(() => {
    if (!treeData) return 0;
    let c = 0;
    function count(n: DynTreeNode) { c++; for (const ch of n.children) count(ch); }
    count(treeData.node);
    return c;
  }, [treeData]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !treeData) return null;
    function find(n: DynTreeNode): DynTreeNode | null {
      if (n.id === selectedNodeId) return n;
      for (const c of n.children) { const f = find(c); if (f) return f; }
      return null;
    }
    return find(treeData.node);
  }, [selectedNodeId, treeData]);

  const compactAstLabel = useMemo(() => {
    if (!treeData) return null;
    return buildExpressionAstLabel(inputString) ?? collectTerminalFrontier(treeData.node).join(" ");
  }, [inputString, treeData]);

  if (!treeData) {
    return (
      <EmptyModuleState
        title="Árbol no disponible"
        description="El árbol se genera automáticamente una vez que se analiza una gramática válida."
      />
    );
  }

  const startSym = getGrammarStartSymbol(grammar);
  const simRecord = simulation as unknown as Record<string, unknown> | undefined;
  const hasSimulationTree = Boolean(simRecord?.tree);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Info bar */}
      <div
        style={{
          padding: "8px 14px",
          background: "rgba(52,211,153,.06)",
          border: "1px solid rgba(52,211,153,.18)",
          borderRadius: "var(--r)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 13 }}>🌳</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#34d399" }}>
            Árbol / AST final — símbolo inicial:{" "}
            <span style={{ fontFamily: "var(--mono)" }}>{startSym}</span>
          </span>
          <span style={{ marginLeft: 10, fontSize: 10, color: "var(--txt3)" }}>
            {hasSimulationTree ? "Generado desde árbol de simulación" : `Construido a partir de la cadena: "${inputString || "ε"}"`}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 10,
              padding: "2px 7px",
              borderRadius: 4,
              background: "rgba(52,211,153,.1)",
              color: "#34d399",
              border: "1px solid rgba(52,211,153,.25)",
            }}
          >
            {grammar.productions.length} producciones
          </span>
          <button
            type="button"
            onClick={() => { setShowPath((p) => !p); setPathStep(0); }}
            style={{
              fontSize: 10,
              padding: "3px 9px",
              borderRadius: 5,
              border: "1px solid",
              borderColor: showPath ? "rgba(96,165,250,.45)" : "var(--border)",
              background: showPath ? "rgba(96,165,250,.15)" : "var(--bg3)",
              color: showPath ? "#60a5fa" : "var(--txt2)",
              cursor: "pointer",
            }}
          >
            {showPath ? "✓ Trayectoria activada" : "Mostrar trayectoria"}
          </button>
        </div>
      </div>

      {/* Path stepper */}
      {showPath && (
        <div
          style={{
            padding: "8px 14px",
            background: "var(--bg2)",
            border: "1px solid rgba(96,165,250,.2)",
            borderRadius: "var(--r)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 11, color: "var(--txt2)" }}>Trayectoria de derivación:</span>
          <button type="button" onClick={() => setPathStep(0)} style={stepBtnStyle(pathStep === 0)}>⏮</button>
          <button type="button" onClick={() => setPathStep((p) => Math.max(0, p - 1))} disabled={pathStep === 0} style={stepBtnStyle(pathStep === 0)}>◀</button>
          <div style={{ flex: 1, height: 4, background: "var(--bg3)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${((pathStep + 1) / totalNodes) * 100}%`, background: "#60a5fa", borderRadius: 2, transition: "width .2s" }} />
          </div>
          <button type="button" onClick={() => setPathStep((p) => Math.min(totalNodes - 1, p + 1))} disabled={pathStep >= totalNodes - 1} style={stepBtnStyle(pathStep >= totalNodes - 1)}>▶</button>
          <button type="button" onClick={() => setPathStep(totalNodes - 1)} disabled={pathStep >= totalNodes - 1} style={stepBtnStyle(pathStep >= totalNodes - 1)}>⏭</button>
          <span style={{ fontSize: 10, color: "var(--txt3)", fontFamily: "var(--mono)", whiteSpace: "nowrap" }}>{pathStep + 1}/{totalNodes}</span>
        </div>
      )}

      {/* Main tree area */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 240px",
          gap: 12,
        }}
      >
        {/* SVG canvas */}
        <div
          style={{
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "8px 14px",
              borderBottom: "1px solid var(--border)",
              background: "var(--bg3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--txt0)" }}>Árbol final generado</span>
            <span style={{ fontSize: 9, color: "var(--txt3)" }}>Haz clic en un nodo para inspeccionarlo</span>
          </div>

          <div style={{ overflowX: "auto", overflowY: "auto" }}>
            <svg
              viewBox={`0 0 ${treeData.width} ${treeData.height}`}
              width="100%"
              height={Math.min(480, treeData.height + 10)}
              style={{ display: "block" }}
            >
              {/* Render edges first */}
              <TreeEdges node={treeData.node} />
              {/* Render nodes */}
              <TreeNodes
                node={treeData.node}
                selectedId={selectedNodeId}
                highlightedIds={highlightedIds}
                onSelect={setSelectedNodeId}
              />
              {/* Legend */}
              <TreeLegend x={10} y={treeData.height - 22} />
            </svg>
          </div>
        </div>

        {/* Sidebar */}
        <aside
          style={{
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r)",
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div>
            <div className="sec-label">Nodo seleccionado</div>
            {selectedNode ? (
              <>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 22,
                    fontWeight: 700,
                    color: nodeColor(selectedNode.kind).text,
                  }}
                >
                  {selectedNode.label}
                </div>
                <div style={{ marginTop: 4, fontSize: 11, color: "var(--txt2)" }}>
                  Tipo: <span style={{ color: nodeColor(selectedNode.kind).text }}>
                    {selectedNode.kind === "nonTerminal" ? "No terminal" : selectedNode.kind === "terminal" ? "Terminal" : "ε-producción"}
                  </span>
                </div>
                {selectedNode.children.length > 0 && (
                  <div style={{ marginTop: 4, fontSize: 11, color: "var(--txt2)" }}>
                    Hijos: <span style={{ fontFamily: "var(--mono)", color: "var(--txt1)" }}>
                      {selectedNode.children.map((c) => c.label).join(", ")}
                    </span>
                  </div>
                )}
                <NodeEducationalInfo node={selectedNode} grammar={grammar} />
              </>
            ) : (
              <p style={{ fontSize: 11, color: "var(--txt3)", lineHeight: 1.6, marginTop: 6 }}>
                Haz clic sobre cualquier nodo del árbol para inspeccionarlo.
              </p>
            )}
          </div>

          <div className="divider" />

          <div>
            <div className="sec-label">Cadena analizada</div>
            <div
              style={{
                padding: "6px 10px",
                borderRadius: "var(--r2)",
                background: "var(--bg3)",
                border: "1px solid var(--border)",
                fontFamily: "var(--mono)",
                fontSize: 12,
                color: "var(--txt1)",
              }}
            >
              {inputString || "ε"}
            </div>
          </div>

          <div>
            <div className="sec-label">AST compacto</div>
            <div
              style={{
                padding: "6px 10px",
                borderRadius: "var(--r2)",
                background: "rgba(96,165,250,.06)",
                border: "1px solid rgba(96,165,250,.16)",
                fontFamily: "var(--mono)",
                fontSize: 11,
                color: "var(--txt1)",
                lineHeight: 1.5,
                wordBreak: "break-word",
              }}
            >
              {compactAstLabel || "No disponible para esta cadena"}
            </div>
            <p style={{ margin: "5px 0 0", fontSize: 10, color: "var(--txt3)", lineHeight: 1.45 }}>
              Para expresiones aritméticas se muestra con precedencia; para otras gramáticas se muestra la frontera terminal.
            </p>
          </div>

          <div>
            <div className="sec-label">Gramática</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 160, overflowY: "auto" }}>
              {grammar.productions.slice(0, 10).map((prod, i) => (
                <div
                  key={i}
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    color: "var(--txt2)",
                    padding: "2px 6px",
                    borderRadius: 3,
                    background: "var(--bg3)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {prod.raw ?? `${prod.left} → ${Array.isArray(prod.right) ? prod.right.join(" ") : "?"}`}
                </div>
              ))}
              {grammar.productions.length > 10 && (
                <div style={{ fontSize: 10, color: "var(--txt3)", textAlign: "center" }}>
                  +{grammar.productions.length - 10} más…
                </div>
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function nodeColor(kind: DynTreeNode["kind"]) {
  if (kind === "terminal") return { fill: "rgba(52,211,153,.1)",  stroke: "rgba(52,211,153,.35)",  text: "#34d399" };
  if (kind === "epsilon")  return { fill: "rgba(251,191,36,.08)", stroke: "rgba(251,191,36,.3)",   text: "#fbbf24" };
  return                         { fill: "rgba(167,139,250,.1)", stroke: "rgba(167,139,250,.35)", text: "#a78bfa" };
}

// Render all edges recursively
function TreeEdges({ node }: { node: DynTreeNode }) {
  const lines: ReactElement[] = [];
  function walk(n: DynTreeNode) {
    for (const c of n.children) {
      if (n.x !== undefined && n.y !== undefined && c.x !== undefined && c.y !== undefined) {
        lines.push(
          <line
            key={`${n.id}-${c.id}`}
            x1={n.x + NODE_W / 2}
            y1={n.y + NODE_H}
            x2={c.x + NODE_W / 2}
            y2={c.y}
            stroke="rgba(96,165,250,.2)"
            strokeWidth="1.5"
          />
        );
      }
      walk(c);
    }
  }
  walk(node);
  return <>{lines}</>;
}

// Render all nodes recursively
type TreeNodesProps = {
  node: DynTreeNode;
  selectedId: string | null;
  highlightedIds: Set<string>;
  onSelect: (id: string) => void;
};

function TreeNodes({ node, selectedId, highlightedIds, onSelect }: TreeNodesProps) {
  const elements: ReactElement[] = [];
  function walk(n: DynTreeNode) {
    if (n.x !== undefined && n.y !== undefined) {
      const { fill, stroke, text } = nodeColor(n.kind);
      const isSelected = selectedId === n.id;
      const isHighlighted = highlightedIds.has(n.id);
      const isEps = n.kind === "epsilon";
      elements.push(
        <g
          key={n.id}
          onClick={() => onSelect(n.id)}
          style={{ cursor: "pointer" }}
          role="button"
          aria-label={`Nodo ${n.label}`}
        >
          <rect
            x={n.x}
            y={n.y}
            width={NODE_W}
            height={NODE_H}
            rx={n.children.length > 0 ? 8 : 5}
            fill={isHighlighted ? `${fill.replace(",.1)", ",.25)")}` : fill}
            stroke={isSelected ? "rgba(96,165,250,.8)" : stroke}
            strokeWidth={isSelected ? 2 : 1}
            strokeDasharray={isEps ? "4,2" : undefined}
          />
          <text
            x={n.x + NODE_W / 2}
            y={n.y + NODE_H / 2 + 4}
            textAnchor="middle"
            fill={text}
            fontFamily="Fira Code, monospace"
            fontSize="11"
            fontWeight="600"
          >
            {n.label}
          </text>
          {isSelected && (
            <rect
              x={n.x - 3}
              y={n.y - 3}
              width={NODE_W + 6}
              height={NODE_H + 6}
              rx={10}
              fill="none"
              stroke="rgba(96,165,250,.5)"
              strokeWidth="1.5"
              strokeDasharray="4,3"
            >
              <animate attributeName="stroke-dashoffset" from="0" to="14" dur="1s" repeatCount="indefinite" />
            </rect>
          )}
        </g>
      );
    }
    for (const c of n.children) walk(c);
  }
  walk(node);
  return <>{elements}</>;
}

function TreeLegend({ x, y }: { x: number; y: number }) {
  const items = [
    { color: "rgba(167,139,250,.35)", fill: "rgba(167,139,250,.1)", label: "No terminal" },
    { color: "rgba(52,211,153,.35)",  fill: "rgba(52,211,153,.1)",  label: "Terminal"    },
    { color: "rgba(251,191,36,.3)",   fill: "rgba(251,191,36,.08)", label: "ε-producción" },
    { color: "rgba(96,165,250,.5)",   fill: "none",                 label: "Activo"       },
  ];
  return (
    <g transform={`translate(${x},${y})`}>
      {items.map((it, i) => (
        <g key={it.label} transform={`translate(${i * 110}, 0)`}>
          <rect x={0} y={0} width={12} height={12} rx={3} fill={it.fill} stroke={it.color} strokeWidth="1" />
          <text x={16} y={10} fill="rgba(168,184,216,.55)" fontSize="9" fontFamily="system-ui">
            {it.label}
          </text>
        </g>
      ))}
    </g>
  );
}

function NodeEducationalInfo({ node, grammar }: { node: DynTreeNode; grammar: Grammar }) {
  if (node.kind === "nonTerminal") {
    const prods = grammar.productions.filter((p) => String(p.left) === node.label);
    return (
      <div style={{ marginTop: 8, padding: "7px 10px", borderRadius: 5, background: "rgba(167,139,250,.07)", border: "1px solid rgba(167,139,250,.15)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa", marginBottom: 4 }}>Producciones</div>
        {prods.length === 0 ? (
          <div style={{ fontSize: 10, color: "var(--txt3)" }}>Sin producciones encontradas.</div>
        ) : (
          prods.map((p, i) => (
            <div key={i} style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--txt2)", lineHeight: 1.5 }}>
              {p.raw ?? `${p.left} → ${Array.isArray(p.right) ? p.right.join(" ") : "?"}`}
            </div>
          ))
        )}
      </div>
    );
  }
  if (node.kind === "terminal") {
    return (
      <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 5, background: "rgba(52,211,153,.06)", border: "1px solid rgba(52,211,153,.15)" }}>
        <div style={{ fontSize: 10, color: "#34d399" }}>
          Terminal: símbolo del alfabeto de la gramática que aparece directamente en la cadena de entrada.
        </div>
      </div>
    );
  }
  return (
    <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 5, background: "rgba(251,191,36,.06)", border: "1px solid rgba(251,191,36,.15)" }}>
      <div style={{ fontSize: 10, color: "#fbbf24" }}>
        ε-producción: este no-terminal deriva la cadena vacía en este camino de análisis.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SHARED UTILITY COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

type IssuesBlockProps = { issues: GrammarParseIssue[] };

function IssuesBlock({ issues }: IssuesBlockProps) {
  return (
    <section
      style={{
        marginBottom: 14,
        padding: 14,
        borderRadius: "var(--r)",
        border: "1px solid rgba(251,191,36,.28)",
        background: "rgba(251,191,36,.08)",
      }}
    >
      <h2 style={{ marginBottom: 10, fontSize: 13, fontWeight: 700, color: "var(--amber)" }}>
        Avisos del análisis
      </h2>
      <ul
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          fontSize: 12,
          lineHeight: 1.6,
          color: "var(--txt1)",
        }}
      >
        {issues.map((issue, index) => (
          <li key={`${issue.line}-${index}`}>
            Línea {issue.line}: {issue.message}
          </li>
        ))}
      </ul>
    </section>
  );
}

type InfoBoxProps = { children: ReactNode };

function InfoBox({ children }: InfoBoxProps) {
  return (
    <div
      style={{
        padding: "10px 14px",
        background: "rgba(96,165,250,.06)",
        border: "1px solid rgba(96,165,250,.2)",
        borderRadius: "var(--r)",
        fontSize: 12,
        lineHeight: 1.7,
        color: "var(--txt1)",
      }}
    >
      {children}
    </div>
  );
}

type EmptyModuleStateProps = { title: string; description: ReactNode };

function EmptyModuleState({ title, description }: EmptyModuleStateProps) {
  return (
    <div
      style={{
        minHeight: 260,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          maxWidth: 460,
          padding: 24,
          border: "1px solid var(--border)",
          borderRadius: "var(--r)",
          background: "var(--bg2)",
        }}
      >
        <div
          style={{
            marginBottom: 10,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: "var(--accent)",
          }}
        >
          {title}
        </div>
        <p style={{ fontSize: 12, lineHeight: 1.7, color: "var(--txt2)" }}>{description}</p>
      </div>
    </div>
  );
}

// Suppress unused import warnings — these are kept for future use
const _InfoBox = InfoBox;