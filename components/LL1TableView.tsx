import {
  formatProduction,
  type LL1TableResult
} from "@/src/parser-engine";

interface LL1TableViewProps {
  result: LL1TableResult;
}

export function LL1TableView({ result }: LL1TableViewProps) {
  const nonTerminals = Object.keys(result.table);
  const hasConflicts = result.conflicts.length > 0;

  const filledCells = nonTerminals.reduce((count, nonTerminal) => {
    const row = result.table[nonTerminal];

    if (!row) return count;

    return (
      count +
      result.terminals.filter((terminal) => row[terminal] !== undefined).length
    );
  }, 0);

  function getConflict(nonTerminal: string, terminal: string) {
    return result.conflicts.find(
      (conflict) =>
        conflict.nonTerminal === nonTerminal &&
        conflict.terminal === terminal
    );
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-slate-100">
              Tabla LL(1)
            </h2>

            <span
              className={
                hasConflicts
                  ? "rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300"
                  : "rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300"
              }
            >
              {hasConflicts ? "Con conflictos" : "LL(1) válida"}
            </span>
          </div>

          <p className="mt-1 text-sm text-slate-400">
            Tabla predictiva construida usando FIRST y FOLLOW.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <StatCard value={nonTerminals.length} label="Filas" />
          <StatCard value={result.terminals.length} label="Columnas" />
          <StatCard value={filledCells} label="Entradas" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <div className="max-w-full overflow-auto">
          <table className="w-full min-w-[760px] table-fixed border-collapse text-left text-sm">
            <thead className="sticky top-0 z-20 bg-slate-950 text-slate-300">
              <tr>
                <th className="sticky left-0 z-30 w-40 border-b border-slate-800 bg-slate-950 px-4 py-3">
                  No terminal
                </th>

                {result.terminals.map((terminal) => (
                  <th
                    key={terminal}
                    className="w-48 border-b border-l border-slate-800 px-4 py-3 text-center font-mono"
                  >
                    {terminal}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {nonTerminals.map((nonTerminal) => (
                <tr
                  key={nonTerminal}
                  className="border-b border-slate-800 last:border-b-0 hover:bg-slate-800/30"
                >
                  <td className="sticky left-0 z-10 bg-slate-900 px-4 py-3 align-top font-mono font-semibold text-cyan-300">
                    {nonTerminal}
                  </td>

                  {result.terminals.map((terminal) => {
                    const production = result.table[nonTerminal]?.[terminal];
                    const conflict = getConflict(nonTerminal, terminal);

                    return (
                      <td
                        key={`${nonTerminal}-${terminal}`}
                        className={
                          conflict
                            ? "border-l border-red-500/30 bg-red-500/10 px-3 py-3 align-top"
                            : "border-l border-slate-800 px-3 py-3 align-top"
                        }
                      >
                        <TableCellContent
                          production={production}
                          conflictReason={conflict?.reason}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm">
        {hasConflicts ? (
          <div className="space-y-2">
            <p className="font-semibold text-red-300">
              La tabla tiene {result.conflicts.length} conflicto(s). Esta
              gramática no es LL(1).
            </p>

            <p className="text-slate-400">
              El parser no puede decidir qué producción usar porque una misma
              celda tiene más de una opción posible.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="font-semibold text-emerald-300">
              La tabla no tiene conflictos. La gramática es compatible con LL(1).
            </p>

            <p className="text-slate-400">
              En cada celda hay como máximo una producción, por eso el parser
              puede decidir sin retroceder.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function StatCard({
  value,
  label
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
      <p className="font-bold text-slate-100">{value}</p>
      <p className="text-slate-500">{label}</p>
    </div>
  );
}

function TableCellContent({
  production,
  conflictReason
}: {
  production: Parameters<typeof formatProduction>[0] | undefined;
  conflictReason?: string | undefined;
}) {
  const conflictProductions = conflictReason
    ? extractConflictProductions(conflictReason)
    : [];

  if (conflictReason) {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="rounded-full border border-red-400/40 bg-red-500/10 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-red-300">
          Conflicto
        </span>

        {conflictProductions.length > 0 ? (
          <div className="flex flex-col gap-1">
            {conflictProductions.map((item, index) => (
              <span
                key={`${item}-${index}`}
                className="rounded-lg border border-red-400/30 bg-red-500/20 px-2 py-1 font-mono text-xs leading-5 text-red-100"
              >
                {item}
              </span>
            ))}
          </div>
        ) : production ? (
          <span className="rounded-lg border border-red-400/30 bg-red-500/20 px-2 py-1 font-mono text-xs leading-5 text-red-100">
            {formatProduction(production)}
          </span>
        ) : null}

        <p className="line-clamp-3 text-xs leading-5 text-red-200">
          {conflictReason}
        </p>
      </div>
    );
  }

  if (production) {
    return (
      <div className="flex justify-center">
        <span className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 font-mono text-xs leading-5 text-cyan-200">
          {formatProduction(production)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <span className="text-slate-700">∅</span>
    </div>
  );
}

function extractConflictProductions(reason: string) {
  const afterColon = reason.split(":")[1];

  if (!afterColon) return [];

  const cleaned = afterColon
    .replace("compiten por la misma celda.", "")
    .trim();

  return cleaned
    .split(" y ")
    .map((item) => item.trim())
    .filter(Boolean);
}