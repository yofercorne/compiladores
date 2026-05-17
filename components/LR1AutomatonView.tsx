import {
  formatLR1State,
  formatProduction,
  type LR1Automaton
} from "@/src/parser-engine";

interface LR1AutomatonViewProps {
  automaton: LR1Automaton;
}

export function LR1AutomatonView({ automaton }: LR1AutomatonViewProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-100">
          Autómata LR(1)
        </h2>

        <p className="text-sm text-slate-400">
          Colección canónica de ítems LR(1) con lookaheads, estados y transiciones.
        </p>
      </div>

      <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
        <p className="text-xs text-slate-400">
          Producción aumentada
        </p>

        <p className="mt-1 font-mono text-sm text-cyan-300">
          {formatProduction(automaton.augmentedProduction)}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {automaton.states.map((state) => {
          const items = formatLR1State(state, automaton.productions);
          const transitions = Object.entries(state.transitions);

          return (
            <article
              key={state.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-mono text-lg font-bold text-cyan-300">
                  I{state.id}
                </h3>

                <div className="flex flex-wrap gap-2">
                  {state.isAcceptState ? (
                    <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-1 text-xs font-semibold text-emerald-300">
                      accept
                    </span>
                  ) : null}

                  {state.isReduceState ? (
                    <span className="rounded-full border border-violet-400/40 bg-violet-400/10 px-2 py-1 text-xs font-semibold text-violet-300">
                      reduce
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item}
                    className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-200"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Transiciones
                </p>

                {transitions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {transitions.map(([symbol, target]) => (
                      <span
                        key={`${state.id}-${symbol}-${target}`}
                        className="rounded-lg border border-slate-700 px-2 py-1 font-mono text-xs text-slate-300"
                      >
                        {symbol} → I{target}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Sin transiciones.
                  </p>
                )}
              </div>

              {state.reductions.length > 0 ? (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Reducciones posibles
                  </p>

                  <div className="space-y-2">
                    {state.reductions.map((production) => (
                      <div
                        key={production.id}
                        className="rounded-lg border border-violet-400/20 bg-violet-400/10 px-3 py-2 font-mono text-xs text-violet-200"
                      >
                        {formatProduction(production)}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}