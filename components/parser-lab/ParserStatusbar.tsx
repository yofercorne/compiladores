"use client";

type ParserStatus = "valid" | "warning" | "error" | "idle";

type ParserStatusbarProps = {
  status?: ParserStatus;
  message: string;
  activeParser: string;
  productionCount: number;
  terminalCount: number;
};

function getStatusColor(status: ParserStatus) {
  if (status === "valid") return "var(--green)";
  if (status === "warning") return "var(--amber)";
  if (status === "error") return "var(--red)";

  return "var(--txt3)";
}

export function ParserStatusbar({
  status = "idle",
  message,
  activeParser,
  productionCount,
  terminalCount
}: ParserStatusbarProps) {
  return (
    <footer className="statusbar">
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <div
          className="sb-dot"
          style={{ background: getStatusColor(status) }}
        />

        <span>{message}</span>
      </div>

      <div className="sb-sep" />

      <span>
        Parser:{" "}
        <strong style={{ color: "var(--accent)" }}>{activeParser}</strong>
      </span>

      <div className="sb-sep" />

      <span>
        Prods:{" "}
        <strong style={{ color: "var(--txt1)" }}>{productionCount}</strong>
      </span>

      <div className="sb-sep" />

      <span>
        Terminales:{" "}
        <strong style={{ color: "var(--accent3)" }}>{terminalCount}</strong>
      </span>

      <span style={{ marginLeft: "auto", opacity: 0.4 }}>
        ParserLab Pro v1.0 · Compiladores 2026
      </span>
    </footer>
  );
}