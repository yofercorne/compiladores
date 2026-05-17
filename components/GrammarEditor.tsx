interface GrammarEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function GrammarEditor({ value, onChange }: GrammarEditorProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor="grammar-editor"
          className="text-sm font-semibold text-slate-200"
        >
          Gramática
        </label>

        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onChange(`${value} ε`)}
            className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300"
          >
            ε
          </button>

          <button
            type="button"
            onClick={() => onChange(`${value} -> `)}
            className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300"
          >
            -&gt;
          </button>

          <button
            type="button"
            onClick={() => onChange(`${value} | `)}
            className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300"
          >
            |
          </button>

          <button
            type="button"
            onClick={() => onChange(`${value} $`)}
            className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300"
          >
            $
          </button>
        </div>
      </div>

      <textarea
        id="grammar-editor"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        className="min-h-[300px] resize-y rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-sm leading-6 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
        placeholder={`E -> T E'
E' -> + T E' | ε
T -> id`}
      />

      <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs leading-5 text-slate-400">
        Usa una producción por línea. Se aceptan flechas{" "}
        <span className="font-mono text-slate-200">-&gt;</span>,{" "}
        <span className="font-mono text-slate-200">→</span> o{" "}
        <span className="font-mono text-slate-200">::=</span>.
      </div>
    </section>
  );
}