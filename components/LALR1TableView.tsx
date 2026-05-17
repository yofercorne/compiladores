import {
  formatLALR1Action,
  type LALR1TableResult
} from "@/src/parser-engine";

interface LALR1TableViewProps {
  result: LALR1TableResult;
}

export function LALR1TableView({ result }: LALR1TableViewProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-100">
          Tabla LALR(1)
        </h2>

        <p className="text-sm text-slate-400">
          Tabla ACTION/GOTO construida después de fusionar estados LR(1) con el
          mismo núcleo LR(0).
        </p>
      </div>

      <div className="grid gap-6">
        <ActionTable result={result} />
        <GotoTable result={result} />
      </div>

      <div className="mt-4 text-sm">
        {result.conflicts.length === 0 ? (
          <p className="text-emerald-300">
            La tabla no tiene conflictos. La gramática es compatible con LALR(1).
          </p>
        ) : (
          <p className="text-red-300">
            La tabla tiene {result.conflicts.length} conflicto(s). La gramática
            no es LALR(1).
          </p>
        )}
      </div>

      {result.conflicts.length > 0 ? (
        <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
          <h3 className="mb-3 font-bold text-red-300">
            Conflictos LALR(1)
          </h3>

          <ul className="space-y-2 text-sm text-red-100">
            {result.conflicts.map((conflict, index) => (
              <li key={`${conflict.stateId}-${conflict.symbol}-${index}`}>
                {conflict.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function ActionTable({ result }: LALR1TableViewProps) {
  return (
    <div>
      <h3 className="mb-3 font-bold text-slate-100">
        ACTION
      </h3>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[700px] border-collapse text-left text-sm">
          <thead className="bg-slate-950 text-slate-300">
            <tr>
              <th className="sticky left-0 z-10 border-b border-slate-800 bg-slate-950 px-4 py-3">
                Estado
              </th>

              {result.terminals.map((terminal) => (
                <th
                  key={terminal}
                  className="border-b border-slate-800 px-4 py-3 font-mono"
                >
                  {terminal}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {result.automaton.states.map((state) => (
              <tr
                key={state.id}
                className="border-b border-slate-800 last:border-b-0"
              >
                <td className="sticky left-0 z-10 bg-slate-900 px-4 py-3 font-mono font-semibold text-cyan-300">
                  I{state.id}
                </td>

                {result.terminals.map((terminal) => {
                  const action = result.action[state.id]?.[terminal];
                  const formatted = formatLALR1Action(action);

                  return (
                    <td
                      key={`${state.id}-${terminal}`}
                      className="min-w-[120px] px-4 py-3 font-mono text-xs"
                    >
                      {formatted ? (
                        <span className="rounded-lg bg-cyan-400/10 px-2 py-1 text-cyan-200">
                          {formatted}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GotoTable({ result }: LALR1TableViewProps) {
  return (
    <div>
      <h3 className="mb-3 font-bold text-slate-100">
        GOTO
      </h3>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[500px] border-collapse text-left text-sm">
          <thead className="bg-slate-950 text-slate-300">
            <tr>
              <th className="sticky left-0 z-10 border-b border-slate-800 bg-slate-950 px-4 py-3">
                Estado
              </th>

              {result.nonTerminals.map((nonTerminal) => (
                <th
                  key={nonTerminal}
                  className="border-b border-slate-800 px-4 py-3 font-mono"
                >
                  {nonTerminal}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {result.automaton.states.map((state) => (
              <tr
                key={state.id}
                className="border-b border-slate-800 last:border-b-0"
              >
                <td className="sticky left-0 z-10 bg-slate-900 px-4 py-3 font-mono font-semibold text-cyan-300">
                  I{state.id}
                </td>

                {result.nonTerminals.map((nonTerminal) => {
                  const target = result.goto[state.id]?.[nonTerminal];

                  return (
                    <td
                      key={`${state.id}-${nonTerminal}`}
                      className="min-w-[120px] px-4 py-3 font-mono text-xs"
                    >
                      {target !== undefined ? (
                        <span className="rounded-lg bg-emerald-400/10 px-2 py-1 text-emerald-200">
                          I{target}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}