"use client";

import { useMemo, useState } from "react";
import type { Grammar, Production } from "@/src/parser-engine/grammar";
import {
  runRecursiveDescent,
  type RecursiveDescentStep,
  type RecursiveDescentStepKind,
  type RecursiveDescentTreeNode,
} from "@/src/parser-engine/recursiveDescent";

interface RecursiveDescentPanelProps {
  grammar: Grammar | null;
  input: string;
}

function formatProduction(production?: Production): string {
  if (!production) return "—";

  const right = production.right
    .map(String)
    .filter((symbol) => symbol !== "ε" && symbol !== "eps" && symbol !== "epsilon");

  return `${production.left} → ${right.length > 0 ? right.join(" ") : "ε"}`;
}

function getStepLabel(kind: RecursiveDescentStepKind): string {
  const labels: Record<RecursiveDescentStepKind, string> = {
    start: "Inicio",
    call: "Llamada",
    "try-production": "Probar producción",
    "match-terminal": "Match terminal",
    "match-epsilon": "Match ε",
    "return-success": "Retorno exitoso",
    "return-failure": "Retorno fallido",
    backtrack: "Backtracking",
    accept: "Acepta",
    reject: "Rechaza",
    error: "Error",
  };

  return labels[kind];
}

function getStepBadgeClass(kind: RecursiveDescentStepKind): string {
  if (kind === "accept" || kind === "return-success" || kind === "match-terminal") {
    return "border-emerald-300 bg-emerald-50 text-emerald-700";
  }

  if (kind === "reject" || kind === "error" || kind === "return-failure") {
    return "border-red-300 bg-red-50 text-red-700";
  }

  if (kind === "backtrack") {
    return "border-amber-300 bg-amber-50 text-amber-700";
  }

  if (kind === "try-production" || kind === "call") {
    return "border-blue-300 bg-blue-50 text-blue-700";
  }

  return "border-slate-300 bg-slate-50 text-slate-700";
}

function getTreeNodeClass(kind: RecursiveDescentTreeNode["kind"]): string {
  if (kind === "non-terminal") {
    return "border-blue-300 bg-blue-50 text-blue-800";
  }

  if (kind === "terminal") {
    return "border-emerald-300 bg-emerald-50 text-emerald-800";
  }

  return "border-slate-300 bg-slate-50 text-slate-600";
}

function TreeNodeView({ node }: { node: RecursiveDescentTreeNode }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm ${getTreeNodeClass(
          node.kind
        )}`}
      >
        {node.symbol}
      </div>

      {node.children.length > 0 && (
        <div className="flex flex-wrap justify-center gap-4 border-t border-slate-200 pt-4">
          {node.children.map((child) => (
            <TreeNodeView key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

function StepDetails({ step }: { step: RecursiveDescentStep }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-3 py-1 text-xs font-bold ${getStepBadgeClass(
            step.kind
          )}`}
        >
          Paso {step.index} · {getStepLabel(step.kind)}
        </span>

        {step.nonTerminal && (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            No terminal: {step.nonTerminal}
          </span>
        )}

        {step.symbol && (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            Símbolo: {step.symbol}
          </span>
        )}
      </div>

      <p className="text-sm leading-6 text-slate-700">{step.message}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Posición
          </p>
          <p className="mt-1 font-mono text-sm text-slate-800">{step.position}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Entrada restante
          </p>
          <p className="mt-1 font-mono text-sm text-slate-800">
            {step.remainingInput.length > 0 ? step.remainingInput.join(" ") : "$"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Pila de llamadas
          </p>
          <p className="mt-1 font-mono text-sm text-slate-800">
            {step.callStack.length > 0 ? step.callStack.join(" → ") : "—"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Producción
          </p>
          <p className="mt-1 font-mono text-sm text-slate-800">
            {formatProduction(step.production)}
          </p>
        </div>
      </div>

      {(step.expected || step.found || step.consumed) && (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Esperado
            </p>
            <p className="mt-1 font-mono text-sm text-slate-800">
              {step.expected ?? "—"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Encontrado
            </p>
            <p className="mt-1 font-mono text-sm text-slate-800">
              {step.found ?? "—"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Consumido
            </p>
            <p className="mt-1 font-mono text-sm text-slate-800">
              {step.consumed ?? "—"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RecursiveDescentPanel({
  grammar,
  input,
}: RecursiveDescentPanelProps) {
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);

  const result = useMemo(() => {
    if (!grammar) return null;

    return runRecursiveDescent(grammar, input, {
      maxDepth: 80,
      maxSteps: 2000,
      maxBranches: 500,
    });
  }, [grammar, input]);

  const selectedStep =
    result?.steps[selectedStepIndex] ?? result?.steps[0] ?? null;

  if (!grammar) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">
          Descenso recursivo
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Primero analiza una gramática para poder ejecutar este parser.
        </p>
      </section>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Parser de descenso recursivo
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Simula llamadas por no terminal, prueba producciones, consume
              terminales y hace backtracking cuando una alternativa falla.
            </p>
          </div>

          <span
            className={`rounded-full border px-4 py-2 text-sm font-bold ${
              result.accepted
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-red-300 bg-red-50 text-red-700"
            }`}
          >
            {result.accepted ? "Cadena aceptada" : "Cadena rechazada"}
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Entrada
            </p>
            <p className="mt-1 font-mono text-sm text-slate-800">
              {result.tokens.length > 0 ? result.tokens.join(" ") : "ε"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Posición final
            </p>
            <p className="mt-1 font-mono text-sm text-slate-800">
              {result.finalPosition}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Pasos
            </p>
            <p className="mt-1 font-mono text-sm text-slate-800">
              {result.steps.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Recursión izquierda
            </p>
            <p className="mt-1 font-mono text-sm text-slate-800">
              {result.leftRecursions.length}
            </p>
          </div>
        </div>
      </div>

      {result.leftRecursions.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <h3 className="font-bold text-red-800">
            Recursión izquierda directa detectada
          </h3>

          <div className="mt-3 space-y-2">
            {result.leftRecursions.map((issue) => (
              <div
                key={issue.nonTerminal}
                className="rounded-xl border border-red-200 bg-white p-3 text-sm text-red-700"
              >
                <p className="font-semibold">{issue.nonTerminal}</p>
                <p className="mt-1">{issue.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.errors.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="font-bold text-amber-800">Diagnóstico</h3>

          <ul className="mt-3 space-y-2">
            {result.errors.map((error, index) => (
              <li
                key={`${error}-${index}`}
                className="rounded-xl border border-amber-200 bg-white p-3 text-sm text-amber-800"
              >
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h3 className="font-bold text-slate-900">Traza paso a paso</h3>
            <p className="mt-1 text-sm text-slate-600">
              Selecciona un paso para ver su detalle.
            </p>
          </div>

          <div className="max-h-[620px] overflow-y-auto p-3">
            {result.steps.map((step) => (
              <button
                key={step.index}
                type="button"
                onClick={() => setSelectedStepIndex(step.index)}
                className={`mb-2 w-full rounded-xl border p-3 text-left transition hover:bg-slate-50 ${
                  selectedStepIndex === step.index
                    ? "border-blue-400 bg-blue-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-slate-500">
                    #{step.index}
                  </span>

                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${getStepBadgeClass(
                      step.kind
                    )}`}
                  >
                    {getStepLabel(step.kind)}
                  </span>
                </div>

                <p className="mt-2 line-clamp-2 text-sm text-slate-700">
                  {step.message}
                </p>

                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                  <span>pos: {step.position}</span>
                  {step.nonTerminal && <span>NT: {step.nonTerminal}</span>}
                  {step.symbol && <span>sym: {step.symbol}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          {selectedStep && <StepDetails step={selectedStep} />}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-slate-900">Árbol de derivación</h3>
            <p className="mt-1 text-sm text-slate-600">
              Se construye con la derivación encontrada por el descenso recursivo.
            </p>

            <div className="mt-5 max-h-[520px] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-6">
              {result.tree ? (
                <TreeNodeView node={result.tree} />
              ) : (
                <p className="text-sm text-slate-500">
                  No hay árbol disponible porque la cadena no pudo derivarse
                  completamente.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}