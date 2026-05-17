import {
  formatProduction,
  type Grammar
} from "@/src/parser-engine";

interface ProductionsPanelProps {
  grammar: Grammar;
}

export function ProductionsPanel({ grammar }: ProductionsPanelProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-100">
          Gramática detectada
        </h2>

        <p className="text-sm text-slate-400">
          Producciones, terminales y no terminales reconocidos por el motor.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <InfoBox
          title="Símbolo inicial"
          value={grammar.startSymbol}
        />

        <InfoBox
          title="Símbolo aumentado"
          value={grammar.augmentedStartSymbol}
        />

        <InfoBox
          title="Producciones"
          value={String(grammar.productions.length)}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SymbolList
          title="No terminales"
          symbols={grammar.nonTerminals}
          accent="text-cyan-300"
        />

        <SymbolList
          title="Terminales"
          symbols={grammar.terminals}
          accent="text-emerald-300"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-950 text-slate-300">
            <tr>
              <th className="border-b border-slate-800 px-4 py-3">
                ID
              </th>
              <th className="border-b border-slate-800 px-4 py-3">
                Producción
              </th>
            </tr>
          </thead>

          <tbody>
            {grammar.productions.map((production) => (
              <tr
                key={production.id}
                className="border-b border-slate-800 last:border-b-0"
              >
                <td className="px-4 py-3 font-mono text-xs text-slate-400">
                  {production.id}
                </td>

                <td className="px-4 py-3 font-mono text-sm text-slate-100">
                  {formatProduction(production)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface InfoBoxProps {
  title: string;
  value: string;
}

function InfoBox({ title, value }: InfoBoxProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <p className="text-xs text-slate-400">
        {title}
      </p>

      <p className="mt-1 font-mono text-lg font-bold text-slate-100">
        {value}
      </p>
    </div>
  );
}

interface SymbolListProps {
  title: string;
  symbols: string[];
  accent: string;
}

function SymbolList({ title, symbols, accent }: SymbolListProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <p className="mb-2 text-xs text-slate-400">
        {title}
      </p>

      <div className="flex flex-wrap gap-2">
        {symbols.length > 0 ? (
          symbols.map((symbol) => (
            <span
              key={symbol}
              className={`rounded-lg border border-slate-700 px-2 py-1 font-mono text-xs ${accent}`}
            >
              {symbol}
            </span>
          ))
        ) : (
          <span className="text-xs text-slate-500">
            No se detectaron símbolos.
          </span>
        )}
      </div>
    </div>
  );
}