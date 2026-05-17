import type { GrammarExample } from "@/src/parser-engine";

interface GrammarGalleryProps {
  examples: GrammarExample[];
  selectedExampleId: string | undefined;
  onSelect: (example: GrammarExample) => void;
}

export function GrammarGallery({
  examples,
  selectedExampleId,
  onSelect
}: GrammarGalleryProps) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-200">
          Grammar Gallery
        </h2>

        <p className="text-xs text-slate-400">
          Carga ejemplos rápidos para probar la app.
        </p>
      </div>

      <div className="grid gap-2">
        {examples.map((example) => {
          const selected = selectedExampleId === example.id;

          return (
            <button
              key={example.id}
              type="button"
              onClick={() => onSelect(example)}
              className={
                selected
                  ? "rounded-xl border border-cyan-400 bg-cyan-400/10 p-3 text-left transition"
                  : "rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-left transition hover:border-cyan-400/70 hover:bg-slate-900"
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {example.title}
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {example.description}
                  </p>
                </div>

                {selected ? (
                  <span className="rounded-full bg-cyan-400 px-2 py-1 text-[10px] font-bold text-slate-950">
                    activo
                  </span>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {example.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-slate-700 px-2 py-1 text-[10px] font-medium text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}