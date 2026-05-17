import type { FirstFollowResult } from "@/src/parser-engine";

interface FirstFollowPanelProps {
  firstFollow: FirstFollowResult;
}

export function FirstFollowPanel({ firstFollow }: FirstFollowPanelProps) {
  const nonTerminals = Object.keys(firstFollow.follow);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-100">
          FIRST / FOLLOW
        </h2>

        <p className="text-sm text-slate-400">
          Conjuntos calculados para cada no terminal de la gramática.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-950 text-slate-300">
            <tr>
              <th className="border-b border-slate-800 px-4 py-3">
                No terminal
              </th>
              <th className="border-b border-slate-800 px-4 py-3">
                FIRST
              </th>
              <th className="border-b border-slate-800 px-4 py-3">
                FOLLOW
              </th>
            </tr>
          </thead>

          <tbody>
            {nonTerminals.map((nonTerminal) => (
              <tr
                key={nonTerminal}
                className="border-b border-slate-800 last:border-b-0"
              >
                <td className="px-4 py-3 font-mono font-semibold text-cyan-300">
                  {nonTerminal}
                </td>

                <td className="px-4 py-3 font-mono text-slate-200">
                  {"{ "}
                  {(firstFollow.first[nonTerminal] ?? []).join(", ")}
                  {" }"}
                </td>

                <td className="px-4 py-3 font-mono text-slate-200">
                  {"{ "}
                  {(firstFollow.follow[nonTerminal] ?? []).join(", ")}
                  {" }"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}