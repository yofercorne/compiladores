"use client";

import { useState, type ReactNode } from "react";

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

type LabTab =
  | "productions"
  | "firstFollow"
  | "tables"
  | "simulator"
  | "tree";

type AnalyzerKind =
  | "recursiveDescent"
  | "ll1"
  | "lr0"
  | "slr1"
  | "lr1"
  | "lalr1";


type ParserCenterPanelProps = {
  activeModule: ParserLabModule;
  result: ParserCenterResult | null;
  inputString: string;
  examples?: GrammarExample[];
  selectedExampleId?: string;
  onSelectExample?: (example: GrammarExample) => void;
};

const LAB_TABS: Array<{
  id: LabTab;
  label: string;
  icon: string;
}> = [
  {
    id: "productions",
    label: "Producciones",
    icon: "𝑃"
  },
  {
    id: "firstFollow",
    label: "FIRST/FOLLOW",
    icon: "∑"
  },
  {
    id: "tables",
    label: "Tablas",
    icon: "⊞"
  },
  {
    id: "simulator",
    label: "Simulador",
    icon: "⏱"
  },
  {
    id: "tree",
    label: "Árbol",
    icon: "🌳"
  }
];

const ANALYZERS: Array<{
  id: AnalyzerKind;
  label: string;
  group: "Top-Down" | "Bottom-Up";
  description: string;
}> = [

  {
    id: "ll1",
    label: "LL(1)",
    group: "Top-Down",
    description: "Tabla predictiva usando FIRST/FOLLOW."
  },
  {
    id: "lr0",
    label: "LR(0)",
    group: "Bottom-Up",
    description: "Ítems, closure, goto y autómata."
  },
  {
    id: "slr1",
    label: "SLR(1)",
    group: "Bottom-Up",
    description: "ACTION/GOTO usando FOLLOW."
  },
  {
    id: "lr1",
    label: "LR(1)",
    group: "Bottom-Up",
    description: "ACTION/GOTO con lookaheads."
  },
  {
    id: "lalr1",
    label: "LALR(1)",
    group: "Bottom-Up",
    description: "Tabla compacta por fusión de estados."
  }
];


export function ParserCenterPanel({
  activeModule,
  result,
  inputString,
  examples,
  selectedExampleId,
  onSelectExample
}: ParserCenterPanelProps) {
  const [activeLabTab, setActiveLabTab] = useState<LabTab>("firstFollow");
  const [activeTableAnalyzer, setActiveTableAnalyzer] =
    useState<AnalyzerKind>("ll1");
  const [activeSimulationAnalyzer, setActiveSimulationAnalyzer] =
    useState<AnalyzerKind>("ll1");

  if (activeModule === "lab") {
    return (
      <div
        className="module"
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflow: "hidden"
        }}
      >
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

          {result?.issues.length ? (
            <IssuesBlock issues={result.issues} />
          ) : null}

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

          {result && activeLabTab === "tables" ? (
            <AnalyzerWorkArea
              title="Selecciona la tabla o estructura"
              activeAnalyzer={activeTableAnalyzer}
              onAnalyzerChange={setActiveTableAnalyzer}
            >
              <TableContent
                analyzer={activeTableAnalyzer}
                result={result}
                inputString={inputString}
              />
            </AnalyzerWorkArea>
          ) : null}

          {result && activeLabTab === "simulator" ? (
            <AnalyzerWorkArea
              title="Selecciona el simulador"
              activeAnalyzer={activeSimulationAnalyzer}
              onAnalyzerChange={setActiveSimulationAnalyzer}
            >
              <SimulationContent
                analyzer={activeSimulationAnalyzer}
                result={result}
                inputString={inputString}
              />
            </AnalyzerWorkArea>
          ) : null}

          {result?.grammar && activeLabTab === "tree" ? (
            <VisualParseTreePanel
              grammar={result.grammar}
              inputString={inputString}
            />
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
    {...(selectedExampleId !== undefined
      ? { selectedExampleId }
      : {})}
    {...(onSelectExample !== undefined
      ? { onSelectExample }
      : {})}
  />
);

}

type AnalyzerWorkAreaProps = {
  title: string;
  activeAnalyzer: AnalyzerKind;
  onAnalyzerChange: (analyzer: AnalyzerKind) => void;
  children: ReactNode;
};

function AnalyzerWorkArea({
  title,
  activeAnalyzer,
  onAnalyzerChange,
  children
}: AnalyzerWorkAreaProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <section
        style={{
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r)",
          padding: 12
        }}
      >
        <div className="sec-label">{title}</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 8
          }}
        >
          {ANALYZERS.map((analyzer) => (
            <button
              key={analyzer.id}
              type="button"
              className={
                activeAnalyzer === analyzer.id
                  ? "parser-card sel"
                  : "parser-card"
              }
              onClick={() => onAnalyzerChange(analyzer.id)}
              style={{ textAlign: "left", minHeight: 86 }}
            >
              <span
                className={
                  analyzer.group === "Top-Down"
                    ? "pc-tag td-tag"
                    : "pc-tag bu-tag"
                }
              >
                {analyzer.group}
              </span>

              <span className="pc-name">{analyzer.label}</span>

              <span className="pc-sub" style={{ lineHeight: 1.45 }}>
                {analyzer.description}
              </span>
            </button>
          ))}
        </div>
      </section>

      {children}
    </div>
  );
}

type AnalyzerContentProps = {
  analyzer: AnalyzerKind;
  result: ParserCenterResult;
  inputString: string;
};

function TableContent({
  analyzer,
  result
}: AnalyzerContentProps) {
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
        <LL1TableView result={result.ll1} />

        {result.ll1.conflicts.length ? (
          <ConflictList
            title="Conflictos LL(1)"
            conflicts={result.ll1.conflicts.map((conflict) => conflict.reason)}
          />
        ) : null}
      </div>
    ) : (
      <EmptyModuleState
        title="Tabla LL(1) no disponible"
        description="Ejecuta el análisis con una gramática válida."
      />
    );
  }

if (analyzer === "lr0") {
  return result.lr0 ? (
    <LR0TableView result={result.lr0} />
  ) : (
    <EmptyModuleState
      title="Tabla LR(0) no disponible"
      description="Ejecuta el análisis con una gramática válida."
    />
  );
}

  if (analyzer === "slr1") {
    return result.slr1 ? (
      <SLR1TableView result={result.slr1} />
    ) : (
      <EmptyModuleState
        title="Tabla SLR(1) no disponible"
        description="Ejecuta el análisis con una gramática válida."
      />
    );
  }

  if (analyzer === "lr1") {
    return result.lr1 ? (
      <LR1TableView result={result.lr1} />
    ) : (
      <EmptyModuleState
        title="Tabla LR(1) no disponible"
        description="Ejecuta el análisis con una gramática válida."
      />
    );
  }

  return result.lalr1 ? (
    <LALR1TableView result={result.lalr1} />
  ) : (
    <EmptyModuleState
      title="Tabla LALR(1) no disponible"
      description="Ejecuta el análisis con una gramática válida."
    />
  );
}

function SimulationContent({
  analyzer,
  result
}: AnalyzerContentProps) {
  if (analyzer === "recursiveDescent") {
    return (
      <EmptyModuleState
        title="Simulación no disponible"
        description="La visualización tipo árbol del descenso recursivo se muestra únicamente en la pestaña Árbol."
      />
    );
  }

  if (analyzer === "ll1") {
    return result.simulation ? (
      <SimulationSteps simulation={result.simulation} />
    ) : (
      <EmptyModuleState
        title="Simulación LL(1) no disponible"
        description="Solo aparece si la tabla LL(1) no tiene conflictos."
      />
    );
  }

if (analyzer === "lr0") {
  return result.lr0Simulation ? (
    <LR0SimulationSteps simulation={result.lr0Simulation} />
  ) : (
    <EmptyModuleState
      title="Simulación LR(0) no disponible"
      description="Solo aparece si la tabla LR(0) no tiene conflictos."
    />
  );
}

  if (analyzer === "slr1") {
    return result.slr1Simulation ? (
      <SLR1SimulationSteps simulation={result.slr1Simulation} />
    ) : (
      <EmptyModuleState
        title="Simulación SLR(1) no disponible"
        description="Solo aparece si la tabla SLR(1) no tiene conflictos."
      />
    );
  }

  if (analyzer === "lr1") {
    return result.lr1Simulation ? (
      <LR1SimulationSteps simulation={result.lr1Simulation} />
    ) : (
      <EmptyModuleState
        title="Simulación LR(1) no disponible"
        description="Solo aparece si la tabla LR(1) no tiene conflictos."
      />
    );
  }

  return result.lalr1Simulation ? (
    <LALR1SimulationSteps simulation={result.lalr1Simulation} />
  ) : (
    <EmptyModuleState
      title="Simulación LALR(1) no disponible"
      description="Solo aparece si la tabla LALR(1) no tiene conflictos."
    />
  );
}

type VisualParseTreePanelProps = {
  grammar?: Grammar;
  inputString: string;
  title?: string;
  subtitle?: string;
};

function VisualParseTreePanel({
  grammar,
  inputString,
  title = "Árbol de derivación",
  subtitle = "Vista visual inspirada en el mockup original, con nodos diferenciados por tipo y nodo activo resaltado."
}: VisualParseTreePanelProps) {
  const [selectedNode, setSelectedNode] = useState("E");

  const productionCount = grammar?.productions.length ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 240px",
          gap: 12
        }}
      >
        <div className="tree-wrap">
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--border)",
              background: "var(--bg3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--txt0)"
                }}
              >
                {title}
              </div>

              <div
                style={{
                  marginTop: 2,
                  fontSize: 10,
                  color: "var(--txt2)"
                }}
              >
                {subtitle}
              </div>
            </div>

            <span className="badge b-blue">Interactivo</span>
          </div>

          <div className="tree-svg-area">
            <svg viewBox="0 0 680 380" width="100%" height="380">
              <line
                x1="340"
                y1="45"
                x2="200"
                y2="115"
                stroke="rgba(96,165,250,0.22)"
                strokeWidth="1.5"
              />
              <line
                x1="340"
                y1="45"
                x2="480"
                y2="115"
                stroke="rgba(96,165,250,0.22)"
                strokeWidth="1.5"
              />

              <line
                x1="200"
                y1="115"
                x2="120"
                y2="190"
                stroke="rgba(96,165,250,0.2)"
                strokeWidth="1.5"
              />
              <line
                x1="200"
                y1="115"
                x2="280"
                y2="190"
                stroke="rgba(96,165,250,0.16)"
                strokeWidth="1.5"
              />

              <line
                x1="480"
                y1="115"
                x2="430"
                y2="190"
                stroke="rgba(96,165,250,0.2)"
                strokeWidth="1.5"
              />
              <line
                x1="480"
                y1="115"
                x2="530"
                y2="190"
                stroke="rgba(96,165,250,0.2)"
                strokeWidth="1.5"
              />

              <line
                x1="120"
                y1="190"
                x2="120"
                y2="260"
                stroke="rgba(96,165,250,0.2)"
                strokeWidth="1.5"
              />
              <line
                x1="280"
                y1="190"
                x2="280"
                y2="260"
                stroke="rgba(96,165,250,0.14)"
                strokeWidth="1.5"
              />
              <line
                x1="430"
                y1="190"
                x2="430"
                y2="260"
                stroke="rgba(96,165,250,0.2)"
                strokeWidth="1.5"
              />
              <line
                x1="530"
                y1="190"
                x2="490"
                y2="260"
                stroke="rgba(96,165,250,0.2)"
                strokeWidth="1.5"
              />
              <line
                x1="530"
                y1="190"
                x2="570"
                y2="260"
                stroke="rgba(96,165,250,0.2)"
                strokeWidth="1.5"
              />

              <TreeCircleNode
                id="E"
                x={340}
                y={45}
                label="E"
                kind="nonTerminal"
                selected={selectedNode === "E"}
                onSelect={setSelectedNode}
              />

              <TreeCircleNode
                id="T"
                x={200}
                y={115}
                label="T"
                kind="nonTerminal"
                selected={selectedNode === "T"}
                onSelect={setSelectedNode}
              />

              <TreeCircleNode
                id="E'"
                x={480}
                y={115}
                label="E'"
                kind="nonTerminal"
                selected={selectedNode === "E'"}
                onSelect={setSelectedNode}
              />

              <TreeCircleNode
                id="F"
                x={120}
                y={190}
                label="F"
                kind="nonTerminal"
                selected={selectedNode === "F"}
                onSelect={setSelectedNode}
              />

              <TreeCircleNode
                id="T'"
                x={280}
                y={190}
                label="T'"
                kind="epsilon"
                selected={selectedNode === "T'"}
                onSelect={setSelectedNode}
              />

              <TreeCircleNode
                id="+"
                x={430}
                y={190}
                label="+"
                kind="terminal"
                selected={selectedNode === "+"}
                onSelect={setSelectedNode}
              />

              <TreeCircleNode
                id="T2"
                x={490}
                y={260}
                label="T"
                kind="nonTerminal"
                selected={selectedNode === "T2"}
                onSelect={setSelectedNode}
              />

              <TreeCircleNode
                id="E2"
                x={570}
                y={260}
                label="E'"
                kind="epsilon"
                selected={selectedNode === "E2"}
                onSelect={setSelectedNode}
              />

              <TreeLeafNode
                id="id"
                x={96}
                y={252}
                label="id"
                kind="terminal"
                selected={selectedNode === "id"}
                onSelect={setSelectedNode}
              />

              <TreeLeafNode
                id="eps"
                x={256}
                y={252}
                label="ε"
                kind="epsilon"
                selected={selectedNode === "eps"}
                onSelect={setSelectedNode}
              />

              <TreeLeafNode
                id="plusLeaf"
                x={406}
                y={252}
                label="+"
                kind="terminal"
                selected={selectedNode === "plusLeaf"}
                onSelect={setSelectedNode}
              />

              <g transform="translate(16,335)">
                <circle
                  cx="8"
                  cy="8"
                  r="7"
                  fill="rgba(167,139,250,.12)"
                  stroke="rgba(167,139,250,.4)"
                  strokeWidth="1"
                />
                <text
                  x="20"
                  y="12"
                  fill="rgba(168,184,216,.6)"
                  fontSize="10"
                  fontFamily="Space Grotesk"
                >
                  No terminal
                </text>

                <circle
                  cx="120"
                  cy="8"
                  r="7"
                  fill="rgba(52,211,153,.1)"
                  stroke="rgba(52,211,153,.3)"
                  strokeWidth="1"
                />
                <text
                  x="132"
                  y="12"
                  fill="rgba(168,184,216,.6)"
                  fontSize="10"
                  fontFamily="Space Grotesk"
                >
                  Terminal
                </text>

                <circle
                  cx="215"
                  cy="8"
                  r="7"
                  fill="rgba(251,191,36,.06)"
                  stroke="rgba(251,191,36,.2)"
                  strokeWidth="1"
                  strokeDasharray="4,2"
                />
                <text
                  x="227"
                  y="12"
                  fill="rgba(168,184,216,.6)"
                  fontSize="10"
                  fontFamily="Space Grotesk"
                >
                  ε-producción
                </text>

                <circle
                  cx="335"
                  cy="8"
                  r="7"
                  fill="none"
                  stroke="rgba(96,165,250,.5)"
                  strokeWidth="2"
                />
                <text
                  x="347"
                  y="12"
                  fill="rgba(168,184,216,.6)"
                  fontSize="10"
                  fontFamily="Space Grotesk"
                >
                  Nodo activo
                </text>
              </g>
            </svg>
          </div>
        </div>

        <aside
          style={{
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r)",
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 12
          }}
        >
          <div>
            <div className="sec-label">Nodo seleccionado</div>

            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 24,
                fontWeight: 700,
                color: "var(--accent)"
              }}
            >
              {selectedNode}
            </div>

            <p
              style={{
                marginTop: 6,
                fontSize: 12,
                lineHeight: 1.6,
                color: "var(--txt2)"
              }}
            >
              Haz clic sobre cualquier nodo del árbol para inspeccionarlo.
            </p>
          </div>

          <div className="divider" />

          <div>
            <div className="sec-label">Cadena analizada</div>

            <div
              style={{
                padding: "8px 10px",
                borderRadius: "var(--r2)",
                background: "var(--bg3)",
                border: "1px solid var(--border)",
                fontFamily: "var(--mono)",
                fontSize: 12,
                color: "var(--txt1)"
              }}
            >
              {inputString || "ε"}
            </div>
          </div>

          <div>
            <div className="sec-label">Resumen</div>

            <div className="diag-list">
              <div className="diag-item">
                <div className="diag-dot ok" />
                Producciones: {productionCount}
              </div>

              <div className="diag-item">
                <div className="diag-dot ok" />
                Vista: árbol de derivación
              </div>

              <div className="diag-item">
                <div className="diag-dot warn" />
                Próximo paso: generar árbol real desde la simulación
              </div>
            </div>
          </div>
        </aside>
      </section>

      <div
        style={{
          textAlign: "center",
          fontSize: 11,
          color: "var(--txt3)"
        }}
      >
        Árbol de derivación para{" "}
        <span style={{ fontFamily: "var(--mono)", color: "var(--txt1)" }}>
          {inputString || "ε"}
        </span>
      </div>
    </div>
  );
}

type TreeNodeKind = "nonTerminal" | "terminal" | "epsilon";

type TreeCircleNodeProps = {
  id: string;
  x: number;
  y: number;
  label: string;
  kind: TreeNodeKind;
  selected: boolean;
  onSelect: (id: string) => void;
};

function TreeCircleNode({
  id,
  x,
  y,
  label,
  kind,
  selected,
  onSelect
}: TreeCircleNodeProps) {
  const isTerminal = kind === "terminal";
  const isEpsilon = kind === "epsilon";

  const fill = isTerminal
    ? "rgba(52,211,153,.08)"
    : isEpsilon
      ? "rgba(251,191,36,.06)"
      : "rgba(167,139,250,.1)";

  const stroke = isTerminal
    ? "rgba(52,211,153,.28)"
    : isEpsilon
      ? "rgba(251,191,36,.25)"
      : "rgba(167,139,250,.35)";

  const textColor = isTerminal
    ? "#34d399"
    : isEpsilon
      ? "#fbbf24"
      : "#a78bfa";

  return (
    <g
      onClick={() => onSelect(id)}
      style={{ cursor: "pointer" }}
      role="button"
      aria-label={`Nodo ${label}`}
    >
      <circle
        cx={x}
        cy={y}
        r={22}
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
        strokeDasharray={isEpsilon ? "4,2" : undefined}
      />

      <text
        x={x}
        y={y + 5}
        textAnchor="middle"
        fill={textColor}
        fontFamily="Fira Code"
        fontSize="12"
        fontWeight="600"
      >
        {label}
      </text>

      {selected ? (
        <circle
          cx={x}
          cy={y}
          r={28}
          fill="none"
          stroke="rgba(96,165,250,.55)"
          strokeWidth="2"
          strokeDasharray="4,3"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="0"
            to="14"
            dur="1s"
            repeatCount="indefinite"
          />
        </circle>
      ) : null}
    </g>
  );
}

type TreeLeafNodeProps = {
  id: string;
  x: number;
  y: number;
  label: string;
  kind: TreeNodeKind;
  selected: boolean;
  onSelect: (id: string) => void;
};

function TreeLeafNode({
  id,
  x,
  y,
  label,
  kind,
  selected,
  onSelect
}: TreeLeafNodeProps) {
  const isEpsilon = kind === "epsilon";

  return (
    <g
      onClick={() => onSelect(id)}
      style={{ cursor: "pointer" }}
      role="button"
      aria-label={`Hoja ${label}`}
    >
      <rect
        x={x}
        y={y}
        width="48"
        height="26"
        rx="5"
        fill={isEpsilon ? "rgba(251,191,36,.08)" : "rgba(52,211,153,.1)"}
        stroke={isEpsilon ? "rgba(251,191,36,.25)" : "rgba(52,211,153,.3)"}
        strokeWidth="1"
      />

      <text
        x={x + 24}
        y={y + 17}
        textAnchor="middle"
        fill={isEpsilon ? "#fbbf24" : "#34d399"}
        fontFamily="Fira Code"
        fontSize="11"
        fontWeight="600"
      >
        {label}
      </text>

      {selected ? (
        <rect
          x={x - 4}
          y={y - 4}
          width="56"
          height="34"
          rx="7"
          fill="none"
          stroke="rgba(96,165,250,.55)"
          strokeWidth="2"
          strokeDasharray="4,3"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="0"
            to="14"
            dur="1s"
            repeatCount="indefinite"
          />
        </rect>
      ) : null}
    </g>
  );
}

type IssuesBlockProps = {
  issues: GrammarParseIssue[];
};

function IssuesBlock({ issues }: IssuesBlockProps) {
  return (
    <section
      style={{
        marginBottom: 14,
        padding: 14,
        borderRadius: "var(--r)",
        border: "1px solid rgba(251,191,36,.28)",
        background: "rgba(251,191,36,.08)"
      }}
    >
      <h2
        style={{
          marginBottom: 10,
          fontSize: 13,
          fontWeight: 700,
          color: "var(--amber)"
        }}
      >
        Avisos del análisis
      </h2>

      <ul
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          fontSize: 12,
          lineHeight: 1.6,
          color: "var(--txt1)"
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

type ConflictListProps = {
  title: string;
  conflicts: string[];
};

function ConflictList({ title, conflicts }: ConflictListProps) {
  return (
    <section
      style={{
        border: "1px solid rgba(248,113,113,.35)",
        background: "rgba(248,113,113,.08)",
        borderRadius: "var(--r)",
        padding: 14
      }}
    >
      <h2
        style={{
          marginBottom: 10,
          fontSize: 13,
          fontWeight: 700,
          color: "var(--red)"
        }}
      >
        {title}
      </h2>

      <ul
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          fontSize: 12,
          lineHeight: 1.6,
          color: "var(--txt1)"
        }}
      >
        {conflicts.map((conflict, index) => (
          <li key={`${conflict}-${index}`}>{conflict}</li>
        ))}
      </ul>
    </section>
  );
}

type InfoBoxProps = {
  children: ReactNode;
};

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
        color: "var(--txt1)"
      }}
    >
      {children}
    </div>
  );
}

type EmptyModuleStateProps = {
  title: string;
  description: ReactNode;
};

function EmptyModuleState({ title, description }: EmptyModuleStateProps) {
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