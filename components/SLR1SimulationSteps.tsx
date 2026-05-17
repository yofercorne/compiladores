import {
  formatProduction,
  type SLR1SimulationResult
} from "@/src/parser-engine";

interface SLR1SimulationStepsProps {
  simulation: SLR1SimulationResult;
}

export function SLR1SimulationSteps({
  simulation
}: SLR1SimulationStepsProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">
            Simulación SLR(1)
          </h2>

          <p className="text-sm text-slate-400">
            Ejecución bottom-up usando pila de estados, pila de símbolos,
            ACTION y GOTO.
          </p>
        </div>

        <span
          className={
            simulation.accepted
              ? "rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-300"
              : "rounded-full border border-red-400/40 bg-red-400/10 px-3 py-1 text-sm font-semibold text-red-300"
          }
        >
          {simulation.accepted ? "Cadena aceptada" : "Cadena rechazada"}
        </span>
      </div>

      {simulation.error ? (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-100">
          {simulation.error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
          <thead className="bg-slate-950 text-slate-300">
            <tr>
              <th className="border-b border-slate-800 px-4 py-3">
                #
              </th>

              <th className="border-b border-slate-800 px-4 py-3">
                Acción
              </th>

              <th className="border-b border-slate-800 px-4 py-3">
                Estados
              </th>

              <th className="border-b border-slate-800 px-4 py-3">
                Símbolos
              </th>

              <th className="border-b border-slate-800 px-4 py-3">
                Entrada
              </th>

              <th className="border-b border-slate-800 px-4 py-3">
                Producción
              </th>

              <th className="border-b border-slate-800 px-4 py-3">
                Ir a
              </th>

              <th className="border-b border-slate-800 px-4 py-3">
                Explicación
              </th>
            </tr>
          </thead>

          <tbody>
            {simulation.steps.map((step) => (
              <tr
                key={step.index}
                className="border-b border-slate-800 last:border-b-0"
              >
                <td className="px-4 py-3 font-mono text-slate-400">
                  {step.index}
                </td>

                <td className="px-4 py-3">
                  <ActionBadge action={step.action} />
                </td>

                <td className="px-4 py-3 font-mono text-xs text-slate-200">
                  {step.stateStack.map((state) => `I${state}`).join(" ")}
                </td>

                <td className="px-4 py-3 font-mono text-xs text-slate-200">
                  {step.symbolStack.length > 0
                    ? step.symbolStack.join(" ")
                    : "—"}
                </td>

                <td className="px-4 py-3 font-mono text-xs text-slate-200">
                  {step.input.join(" ")}
                </td>

                <td className="px-4 py-3 font-mono text-xs text-cyan-200">
                  {step.production ? formatProduction(step.production) : "—"}
                </td>

                <td className="px-4 py-3 font-mono text-xs text-emerald-200">
                  {step.toState !== undefined ? `I${step.toState}` : "—"}
                </td>

                <td className="px-4 py-3 text-sm text-slate-300">
                  {step.explanation}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ActionBadge({ action }: { action: string }) {
  const styles: Record<string, string> = {
    init: "border-slate-500/40 bg-slate-500/10 text-slate-300",
    shift: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
    reduce: "border-violet-400/40 bg-violet-400/10 text-violet-300",
    accept: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
    error: "border-red-400/40 bg-red-400/10 text-red-300"
  };

  return (
    <span
      className={`rounded-full border px-2 py-1 text-xs font-semibold ${
        styles[action] ?? styles.init
      }`}
    >
      {action}
    </span>
  );
}