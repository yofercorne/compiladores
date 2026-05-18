"use client";

import { useEffect, useMemo, useState } from "react";
import type { GrammarExample } from "@/src/parser-engine";

interface GrammarGalleryProps {
  examples: GrammarExample[];
  selectedExampleId: string | undefined;
  /**
   * Se llama solo cuando el usuario confirma con "Cargar ejemplo".
   * Dar clic en una tarjeta solo la previsualiza.
   */
  onSelect: (example: GrammarExample) => void;
}

type GalleryFilter =
  | "all"
  | "ll1"
  | "lr"
  | "epsilon"
  | "expressions"
  | "conflict"
  | "refactor"
  | "practice";

type GalleryFilterConfig = {
  id: GalleryFilter;
  label: string;
  hint: string;
};

const FILTERS: GalleryFilterConfig[] = [
  { id: "all", label: "Todos", hint: "Todos los ejemplos" },
  { id: "ll1", label: "LL(1)", hint: "Predictivo y FIRST/FOLLOW" },
  { id: "lr", label: "LR", hint: "LR(0), SLR, LR(1), LALR" },
  { id: "epsilon", label: "ε", hint: "Producciones vacías" },
  { id: "expressions", label: "Expresiones", hint: "Precedencia y paréntesis" },
  { id: "conflict", label: "Conflictos", hint: "Casos problemáticos" },
  { id: "refactor", label: "Refactor", hint: "Para corregir o transformar" },
  { id: "practice", label: "Práctica", hint: "Buenos para demo" },
];

const FILTER_KEYWORDS: Record<GalleryFilter, string[]> = {
  all: [],
  ll1: ["ll(1)", "ll1", "predictivo", "first", "follow", "top-down"],
  lr: ["lr", "lr(0)", "slr", "slr(1)", "lr(1)", "lalr", "bottom-up", "action", "goto"],
  epsilon: ["ε", "epsilon", "eps", "vacía", "vacia", "nullable"],
  expressions: ["expresión", "expresion", "aritm", "precedencia", "asociatividad", "id + id", "id * id"],
  conflict: ["conflicto", "ambigua", "ambiguo", "shift", "reduce", "reduce/reduce", "no ll", "problem"],
  refactor: ["refactor", "recursión izquierda", "recursion izquierda", "factorización", "factorizacion", "corregida", "transform"],
  practice: ["demo", "práctica", "practica", "básica", "basica", "simple", "inicio"],
};

function searchableText(example: GrammarExample): string {
  return [
    example.id,
    example.title,
    example.description,
    example.grammar,
    example.input,
    ...example.tags,
  ]
    .join(" ")
    .toLowerCase();
}

function matchesFilter(example: GrammarExample, filter: GalleryFilter): boolean {
  if (filter === "all") return true;

  const text = searchableText(example);
  return FILTER_KEYWORDS[filter].some((keyword) => text.includes(keyword));
}

function getExampleKind(example: GrammarExample): {
  label: string;
  icon: string;
  tone: string;
} {
  const text = searchableText(example);

  if (text.includes("conflicto") || text.includes("ambigua") || text.includes("shift") || text.includes("reduce/reduce")) {
    return { label: "Caso crítico", icon: "⚠", tone: "border-rose-400/40 bg-rose-400/10 text-rose-200" };
  }

  if (text.includes("lr(1)") || text.includes("lalr") || text.includes("slr") || text.includes("lr(0)")) {
    return { label: "Bottom-Up", icon: "⇧", tone: "border-violet-400/40 bg-violet-400/10 text-violet-200" };
  }

  if (text.includes("ll(1)") || text.includes("predictivo") || text.includes("first") || text.includes("follow")) {
    return { label: "Top-Down", icon: "⇩", tone: "border-cyan-400/40 bg-cyan-400/10 text-cyan-200" };
  }

  if (text.includes("ε") || text.includes("epsilon")) {
    return { label: "Nullable", icon: "ε", tone: "border-amber-400/40 bg-amber-400/10 text-amber-200" };
  }

  return { label: "General", icon: "◇", tone: "border-slate-600 bg-slate-800/70 text-slate-200" };
}

function getDifficulty(example: GrammarExample): string {
  const text = searchableText(example);

  if (text.includes("lr(1)") || text.includes("lalr") || text.includes("reduce/reduce") || text.includes("ambigua")) {
    return "Avanzado";
  }

  if (text.includes("slr") || text.includes("lr(0)") || text.includes("recursión") || text.includes("recursion")) {
    return "Intermedio";
  }

  return "Básico";
}

function getGrammarPreview(grammar: string, maxLines = 4): string {
  const lines = grammar
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, maxLines);

  return lines.length ? lines.join("\n") : "Sin gramática";
}

export function GrammarGallery({
  examples,
  selectedExampleId,
  onSelect,
}: GrammarGalleryProps) {
  const [activeFilter, setActiveFilter] = useState<GalleryFilter>("all");
  const [query, setQuery] = useState("");
  const [previewExampleId, setPreviewExampleId] = useState<string | undefined>(selectedExampleId);

  useEffect(() => {
    setPreviewExampleId(selectedExampleId);
  }, [selectedExampleId]);

  const filteredExamples = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return examples.filter((example) => {
      const filterMatches = matchesFilter(example, activeFilter);
      const queryMatches = cleanQuery.length === 0 || searchableText(example).includes(cleanQuery);
      return filterMatches && queryMatches;
    });
  }, [activeFilter, examples, query]);

  const loadedExample = useMemo(
    () => examples.find((example) => example.id === selectedExampleId),
    [examples, selectedExampleId],
  );

  const previewExample = useMemo(() => {
    return examples.find((example) => example.id === previewExampleId) ?? loadedExample ?? filteredExamples[0];
  }, [examples, filteredExamples, loadedExample, previewExampleId]);

  const previewIsLoaded = previewExample?.id === selectedExampleId;

  function handleLoad(example: GrammarExample) {
    setPreviewExampleId(example.id);
    onSelect(example);
  }

  return (
    <section className="flex min-h-0 flex-col gap-4">
      <header className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-xl shadow-black/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-sm text-cyan-200">
              ✦
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Grammar Gallery</h2>
              <p className="text-xs text-slate-400">
                Selecciona una tarjeta para verla. Luego presiona cargar.
              </p>
            </div>
          </div>

          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            {filteredExamples.length}/{examples.length}
          </span>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
          <div className="min-w-0">
            <label className="relative block min-w-0">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">⌕</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar: LL(1), LR, conflicto, epsilon..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-8 py-2 text-xs text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60 focus:bg-slate-900"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-md text-xs text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
                  aria-label="Limpiar búsqueda"
                >
                  ×
                </button>
              ) : null}
            </label>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map((filter) => {
                const active = activeFilter === filter.id;

                return (
                  <button
                    key={filter.id}
                    type="button"
                    title={filter.hint}
                    onClick={() => setActiveFilter(filter.id)}
                    className={
                      active
                        ? "shrink-0 rounded-full border border-cyan-400 bg-cyan-400 px-3 py-1.5 text-[11px] font-bold text-slate-950 transition"
                        : "shrink-0 rounded-full border border-slate-800 bg-slate-950 px-3 py-1.5 text-[11px] font-semibold text-slate-400 transition hover:border-cyan-400/60 hover:text-cyan-200"
                    }
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300/80">
                  Vista previa
                </p>
                <h3 className="mt-1 line-clamp-1 text-sm font-bold text-slate-100">
                  {previewExample?.title ?? "Sin ejemplo"}
                </h3>
                <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-400">
                  {previewExample?.description ?? "Selecciona un ejemplo para revisar su gramática."}
                </p>
              </div>

              {previewIsLoaded ? (
                <span className="shrink-0 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-200">
                  cargado
                </span>
              ) : null}
            </div>

            <pre className="mt-3 max-h-24 overflow-hidden whitespace-pre-wrap rounded-xl border border-slate-800 bg-black/20 p-3 font-mono text-[11px] leading-5 text-slate-300">
              {previewExample ? getGrammarPreview(previewExample.grammar, 3) : "—"}
            </pre>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[10px] text-slate-500">
                input: {previewExample?.input || "ε"}
              </span>
              <button
                type="button"
                disabled={!previewExample || previewIsLoaded}
                onClick={() => previewExample && handleLoad(previewExample)}
                className={
                  previewExample && !previewIsLoaded
                    ? "rounded-xl border border-cyan-400 bg-cyan-400 px-3 py-2 text-[11px] font-black text-slate-950 transition hover:bg-cyan-300"
                    : "cursor-not-allowed rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[11px] font-bold text-slate-500"
                }
              >
                {previewIsLoaded ? "Ya cargado" : "Cargar ejemplo"}
              </button>
            </div>
          </aside>
        </div>
      </header>

      {filteredExamples.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-8 text-center">
          <div className="text-2xl">∅</div>
          <h3 className="mt-2 text-sm font-bold text-slate-200">No encontré ejemplos</h3>
          <p className="mt-1 text-xs text-slate-500">Prueba otro filtro o limpia la búsqueda.</p>
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
          {filteredExamples.map((example) => {
            const loaded = selectedExampleId === example.id;
            const previewed = previewExample?.id === example.id;
            const kind = getExampleKind(example);
            const difficulty = getDifficulty(example);

            return (
              <article
                key={example.id}
                role="button"
                tabIndex={0}
                onClick={() => setPreviewExampleId(example.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setPreviewExampleId(example.id);
                  }
                }}
                className={
                  previewed
                    ? "group relative cursor-pointer overflow-hidden rounded-2xl border border-cyan-400 bg-cyan-400/10 p-4 text-left shadow-xl shadow-cyan-950/20 outline-none transition"
                    : "group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-left outline-none transition hover:-translate-y-0.5 hover:border-cyan-400/60 hover:bg-slate-900/80 hover:shadow-xl hover:shadow-black/20"
                }
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent opacity-0 transition group-hover:opacity-100" />

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${kind.tone}`}>
                        {kind.icon} {kind.label}
                      </span>
                      <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-semibold text-slate-400">
                        {difficulty}
                      </span>
                    </div>

                    <h3 className="line-clamp-1 text-sm font-bold text-slate-100">
                      {example.title}
                    </h3>

                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                      {example.description}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {loaded ? (
                      <span className="rounded-full bg-emerald-400 px-2 py-1 text-[10px] font-black text-slate-950">
                        cargado
                      </span>
                    ) : previewed ? (
                      <span className="rounded-full bg-cyan-400 px-2 py-1 text-[10px] font-black text-slate-950">
                        vista
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-slate-800 bg-black/20 p-3">
                  <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-slate-500">
                    <span>Preview</span>
                    <span className="font-mono">input: {example.input || "ε"}</span>
                  </div>
                  <pre className="max-h-24 overflow-hidden whitespace-pre-wrap font-mono text-[11px] leading-5 text-slate-300">
                    {getGrammarPreview(example.grammar)}
                  </pre>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {example.tags.slice(0, 5).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-1 text-[10px] font-medium text-slate-300"
                    >
                      {tag}
                    </span>
                  ))}
                  {example.tags.length > 5 ? (
                    <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-1 text-[10px] font-medium text-slate-500">
                      +{example.tags.length - 5}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-800 pt-3">
                  <span className="text-[10px] text-slate-500">
                    {loaded
                      ? "Este ejemplo ya está en el editor."
                      : previewed
                        ? "Listo para cargar."
                        : "Clic para previsualizar."}
                  </span>

                  <button
                    type="button"
                    disabled={loaded}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleLoad(example);
                    }}
                    className={
                      loaded
                        ? "cursor-not-allowed rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-[10px] font-bold text-slate-500"
                        : "rounded-lg border border-cyan-400/50 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-black text-cyan-200 transition hover:bg-cyan-400 hover:text-slate-950"
                    }
                  >
                    {loaded ? "Cargado" : "Cargar ejemplo"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
