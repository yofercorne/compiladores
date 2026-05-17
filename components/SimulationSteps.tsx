import {
  formatProduction,
  type LL1SimulationResult
} from "@/src/parser-engine";

interface SimulationStepsProps {
  simulation: LL1SimulationResult;
}

export function SimulationSteps({ simulation }: SimulationStepsProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">
            Simulación paso a paso
          </h2>

          <p className="text-sm text-slate-400">
            Ejecución del parser LL(1) usando pila, entrada y tabla predictiva.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-300">
            {simulation.steps.length} pasos
          </span>

          <span
            className={
              simulation.accepted
                ? "rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300"
                : "rounded-full border border-red-400/40 bg-red-400/10 px-3 py-1 text-xs font-semibold text-red-300"
            }
          >
            {simulation.accepted ? "Cadena aceptada" : "Cadena rechazada"}
          </span>
        </div>
      </div>

      {simulation.error ? (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3">
          <p className="text-sm font-semibold text-red-300">
            Error de simulación
          </p>

          <p className="mt-1 text-sm leading-6 text-red-100">
            {simulation.error}
          </p>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <div className="max-h-[680px] overflow-auto">
          <table className="w-full min-w-[1080px] table-fixed border-collapse text-left text-sm">
            <thead className="sticky top-0 z-20 bg-slate-950 text-slate-300">
              <tr>
                <th className="w-14 border-b border-slate-800 px-3 py-3">
                  #
                </th>

                <th className="w-28 border-b border-slate-800 px-3 py-3">
                  Acción
                </th>

                <th className="w-64 border-b border-slate-800 px-3 py-3">
                  Pila
                </th>

                <th className="w-64 border-b border-slate-800 px-3 py-3">
                  Entrada
                </th>

                <th className="w-48 border-b border-slate-800 px-3 py-3">
                  Producción
                </th>

                <th className="border-b border-slate-800 px-3 py-3">
                  Explicación
                </th>
              </tr>
            </thead>

            <tbody>
              {simulation.steps.map((step) => (
                <tr
                  key={step.index}
                  className={getRowClass(step.action)}
                >
                  <td className="align-top px-3 py-3 font-mono text-slate-400">
                    {step.index}
                  </td>

                  <td className="align-top px-3 py-3">
                    <ActionBadge action={step.action} />
                  </td>

                  <td className="align-top px-3 py-3">
                    <SymbolChips symbols={step.stack} />
                  </td>

                  <td className="align-top px-3 py-3">
                    <SymbolChips symbols={step.input} />
                  </td>

                  <td className="align-top px-3 py-3">
                    {step.production ? (
                      <span className="inline-flex whitespace-normal rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 font-mono text-xs leading-5 text-cyan-200">
                        {formatProduction(step.production)}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>

                  <td className="align-top px-3 py-3 text-sm leading-6 text-slate-300 whitespace-normal break-words">
                    {step.explanation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function SymbolChips({ symbols }: { symbols: string[] }) {
  if (symbols.length === 0) {
    return <span className="text-slate-500">∅</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {symbols.map((symbol, index) => (
        <span
          key={`${symbol}-${index}`}
          className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-xs text-slate-200"
        >
          {symbol}
        </span>
      ))}
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  const styles: Record<string, string> = {
    init: "border-slate-500/40 bg-slate-500/10 text-slate-300",
    predict: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
    match: "border-violet-400/40 bg-violet-400/10 text-violet-300",
    accept: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
    error: "border-red-400/40 bg-red-400/10 text-red-300"
  };

  const className =
    styles[action] ??
    "border-slate-500/40 bg-slate-500/10 text-slate-300";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${className}`}
    >
      {action}
    </span>
  );
}

function getRowClass(action: string) {
  if (action === "accept") {
    return "border-b border-slate-800 bg-emerald-500/5 last:border-b-0";
  }

  if (action === "error") {
    return "border-b border-slate-800 bg-red-500/5 last:border-b-0";
  }

  return "border-b border-slate-800 last:border-b-0 hover:bg-slate-800/30";
}