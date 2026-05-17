interface AnalysisSummaryProps {
  hasAnalysis: boolean;
  issueCount: number;
  conflictCount: number;
  accepted: boolean | undefined;
  simulationError: string | undefined;
}

export function AnalysisSummary({
  hasAnalysis,
  issueCount,
  conflictCount,
  accepted,
  simulationError
}: AnalysisSummaryProps) {
  if (!hasAnalysis) {
    return null;
  }

  const parserStatus =
    conflictCount > 0
      ? "No LL(1)"
      : "Compatible LL(1)";

  const parserStatusClass =
    conflictCount > 0
      ? "border-red-400/40 bg-red-400/10 text-red-300"
      : "border-emerald-400/40 bg-emerald-400/10 text-emerald-300";

  const inputStatus =
    accepted === undefined
      ? "No ejecutada"
      : accepted
        ? "Aceptada"
        : "Rechazada";

  const inputStatusClass =
    accepted === undefined
      ? "border-slate-500/40 bg-slate-500/10 text-slate-300"
      : accepted
        ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
        : "border-red-400/40 bg-red-400/10 text-red-300";

  return (
    <section className="grid gap-3 md:grid-cols-3">
      <SummaryCard
        title="Estado LL(1)"
        value={parserStatus}
        className={parserStatusClass}
      />

      <SummaryCard
        title="Cadena"
        value={inputStatus}
        className={inputStatusClass}
      />

      <SummaryCard
        title="Avisos"
        value={`${issueCount} aviso(s)`}
        className="border-amber-400/40 bg-amber-400/10 text-amber-300"
      />

      {simulationError ? (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100 md:col-span-3">
          {simulationError}
        </div>
      ) : null}
    </section>
  );
}

interface SummaryCardProps {
  title: string;
  value: string;
  className: string;
}

function SummaryCard({ title, value, className }: SummaryCardProps) {
  return (
    <article className={`rounded-2xl border p-4 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
        {title}
      </p>

      <p className="mt-2 text-xl font-bold">
        {value}
      </p>
    </article>
  );
}