"use client";

import type { ParserKind } from "./ParserLeftPanel";

type AnalyzerStatus = "ready" | "warning" | "error" | "idle";

type ParserRightPanelProps = {
  activeParser: ParserKind;
  onParserChange: (parser: ParserKind) => void;
};

const ANALYZERS: Array<{
  id: ParserKind;
  group: "Top-Down" | "Bottom-Up";
  name: string;
  description: string;
  status: AnalyzerStatus;
  statusText: string;
  features: string[];
}> = [
  {
    id: "recursiveDescent",
    group: "Top-Down",
    name: "Descenso recursivo",
    description: "Analiza por llamadas recursivas según los no terminales.",
    status: "ready",
    statusText: "Disponible",
    features: ["Traza", "Validación", "Errores"]
  },
  {
    id: "ll1",
    group: "Top-Down",
    name: "LL(1)",
    description: "Parser predictivo usando FIRST, FOLLOW y tabla LL(1).",
    status: "ready",
    statusText: "Disponible",
    features: ["FIRST/FOLLOW", "Tabla", "Simulación"]
  },
  {
    id: "lr0",
    group: "Bottom-Up",
    name: "LR(0)",
    description: "Construye ítems LR(0), closure, goto y autómata.",
    status: "ready",
    statusText: "Disponible",
    features: ["Ítems", "Autómata", "Tabla"]
  },
  {
    id: "slr1",
    group: "Bottom-Up",
    name: "SLR(1)",
    description: "Usa FOLLOW para decidir reducciones sobre LR(0).",
    status: "ready",
    statusText: "Disponible",
    features: ["ACTION/GOTO", "Conflictos", "Simulación"]
  },
  {
    id: "lr1",
    group: "Bottom-Up",
    name: "LR(1)",
    description: "Parser canónico con lookaheads en cada ítem.",
    status: "ready",
    statusText: "Disponible",
    features: ["Lookahead", "Tabla LR(1)", "Simulación"]
  },
  {
    id: "lalr1",
    group: "Bottom-Up",
    name: "LALR(1)",
    description: "Fusiona estados LR(1) compatibles para reducir tamaño.",
    status: "ready",
    statusText: "Disponible",
    features: ["Fusión", "Tabla compacta", "Simulación"]
  }
];

function getStatusBadgeClass(status: AnalyzerStatus) {
  if (status === "ready") return "badge b-green";
  if (status === "warning") return "badge b-amber";
  if (status === "error") return "badge b-red";

  return "badge b-blue";
}

export function ParserRightPanel({
  activeParser,
  onParserChange
}: ParserRightPanelProps) {
  return (
    <>
      <div className="result-card rc-neutral">
        <div className="rc-icon" style={{ color: "var(--accent)" }}>
          ◎
        </div>

        <div className="rc-info">
          <span className="rc-title" style={{ color: "var(--accent)" }}>
            Analizadores disponibles
          </span>

          <span className="rc-sub">
            Selecciona el parser que quieres inspeccionar.
          </span>
        </div>
      </div>

      <div>
        <div className="sec-label">Top-Down</div>

        <div className="diag-list">
          {ANALYZERS.filter((analyzer) => analyzer.group === "Top-Down").map(
            (analyzer) => (
              <AnalyzerCard
                key={analyzer.id}
                analyzer={analyzer}
                selected={activeParser === analyzer.id}
                onSelect={() => onParserChange(analyzer.id)}
              />
            )
          )}
        </div>
      </div>

      <div>
        <div className="sec-label">Bottom-Up</div>

        <div className="diag-list">
          {ANALYZERS.filter((analyzer) => analyzer.group === "Bottom-Up").map(
            (analyzer) => (
              <AnalyzerCard
                key={analyzer.id}
                analyzer={analyzer}
                selected={activeParser === analyzer.id}
                onSelect={() => onParserChange(analyzer.id)}
              />
            )
          )}
        </div>
      </div>
    </>
  );
}

type AnalyzerCardProps = {
  analyzer: (typeof ANALYZERS)[number];
  selected: boolean;
  onSelect: () => void;
};

function AnalyzerCard({ analyzer, selected, onSelect }: AnalyzerCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={selected ? "parser-card sel" : "parser-card"}
      style={{
        width: "100%",
        textAlign: "left"
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8
        }}
      >
        <span className={analyzer.group === "Top-Down" ? "pc-tag td-tag" : "pc-tag bu-tag"}>
          {analyzer.group}
        </span>

        <span className={getStatusBadgeClass(analyzer.status)}>
          {analyzer.statusText}
        </span>
      </div>

      <span className="pc-name">{analyzer.name}</span>

      <span className="pc-sub" style={{ lineHeight: 1.5 }}>
        {analyzer.description}
      </span>

      <div className="nt-t-box" style={{ marginTop: 6 }}>
        {analyzer.features.map((feature) => (
          <span key={feature} className="tok tok-t">
            {feature}
          </span>
        ))}
      </div>
    </button>
  );
}