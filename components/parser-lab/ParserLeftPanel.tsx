"use client";

import { useMemo, useRef, useState } from "react";

export type ParserKind =
  | "recursiveDescent"
  | "ll1"
  | "lr0"
  | "slr1"
  | "lr1"
  | "lalr1";

type ParserLeftPanelProps = {
  grammarSource: string;
  inputString: string;

  /**
   * Se mantienen como opcionales para no romper el componente padre si todavía
   * los está enviando. Esta vista izquierda ya no renderiza el selector de parser.
   */
  activeParser?: ParserKind;
  onParserChange?: (parser: ParserKind) => void;

  onGrammarChange: (value: string) => void;
  onInputChange: (value: string) => void;
  onAnalyze: () => void;
};

const GRAMMAR_SYMBOLS: Array<{
  label: string;
  value: string;
  title: string;
}> = [
  {
    label: "→",
    value: " -> ",
    title: "Flecha de producción. También se aceptan →, ::= y ::."
  },
  {
    label: "ε",
    value: " ε ",
    title: "Epsilon: producción vacía. También se acepta eps o epsilon."
  },
  {
    label: "|",
    value: " | ",
    title: "Separador de alternativas. Ejemplo: A -> a | b."
  },
  {
    label: "$",
    value: " $ ",
    title: "Marcador de fin de entrada. Útil en explicaciones LR."
  },
  {
    label: "·",
    value: " · ",
    title: "Punto LR. Útil para representar ítems como E -> E · + T."
  },
  {
    label: "′",
    value: "′",
    title: "Prima para no terminales auxiliares. Ejemplo: E′."
  },
  {
    label: "::=",
    value: " ::= ",
    title: "Formato alternativo aceptado. Se normaliza a -> al analizar."
  }
];

const GRAMMAR_HELP =
  "Formato: una producción por línea. Ej: S -> A b | ε. También se aceptan →, ::= y ::. Usa | para separar alternativas.";

const INPUT_HELP =
  "Escribe tokens separados por espacios. Ej: id + id * id. No es necesario agregar $, el analizador lo maneja internamente.";

function InfoHint({
  title,
  label
}: {
  title: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        flexShrink: 0
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 19,
          height: 19,
          borderRadius: 999,
          border: "1px solid rgba(96, 165, 250, 0.28)",
          background:
            "linear-gradient(135deg, rgba(96, 165, 250, 0.16), rgba(15, 23, 42, 0.82))",
          color: "var(--accent2)",
          fontSize: 11,
          fontWeight: 900,
          cursor: "help",
          padding: 0,
          boxShadow: open ? "0 0 0 3px rgba(96,165,250,.10)" : "none",
          transition: "transform .12s ease, border-color .12s ease, box-shadow .12s ease"
        }}
      >
        ?
      </button>

      {open ? (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            left: 24,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 50,
            width: 255,
            padding: "10px 11px",
            borderRadius: 12,
            border: "1px solid rgba(96, 165, 250, 0.28)",
            background: "rgba(7, 11, 22, 0.96)",
            color: "var(--txt1)",
            boxShadow: "0 18px 45px rgba(0,0,0,.35)",
            backdropFilter: "blur(10px)",
            pointerEvents: "none"
          }}
        >
          <span
            style={{
              position: "absolute",
              left: -5,
              top: "50%",
              width: 9,
              height: 9,
              transform: "translateY(-50%) rotate(45deg)",
              background: "rgba(7, 11, 22, 0.96)",
              borderLeft: "1px solid rgba(96, 165, 250, 0.28)",
              borderBottom: "1px solid rgba(96, 165, 250, 0.28)"
            }}
          />

          <strong
            style={{
              display: "block",
              marginBottom: 4,
              color: "var(--accent2)",
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 0.2
            }}
          >
            {title}
          </strong>

          <span
            style={{
              display: "block",
              color: "var(--txt2)",
              fontSize: 11,
              lineHeight: 1.55
            }}
          >
            {label}
          </span>
        </span>
      ) : null}
    </span>
  );
}

const EPSILON_ALIASES = new Set(["ε", "eps", "epsilon", "lambda", "λ"]);
const ARROW_PATTERN = /\s*(?:->|→|::=|::|=>)\s*/;
const ARROW_FINDER = /(?:->|→|::=|::|=>)/;

function collectNonTerminals(source: string): string[] {
  const nonTerminals = new Set<string>();

  for (const line of source.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) {
      continue;
    }

    const arrowIndex = trimmed.search(ARROW_FINDER);

    if (arrowIndex === -1) {
      continue;
    }

    const left = trimmed.slice(0, arrowIndex).trim();

    if (left) {
      nonTerminals.add(left);
    }
  }

  return Array.from(nonTerminals).sort((a, b) => b.length - a.length);
}

function matchesAt(value: string, index: number, target: string): boolean {
  return value.slice(index, index + target.length) === target;
}

function tokenizeCompactAlternative(
  alternative: string,
  nonTerminals: string[]
): string[] {
  const trimmed = alternative.trim();

  if (!trimmed) {
    return ["ε"];
  }

  if (EPSILON_ALIASES.has(trimmed.toLowerCase())) {
    return ["ε"];
  }

  const tokens: string[] = [];
  let index = 0;

  while (index < trimmed.length) {
    const current = trimmed[index];

    if (!current || /\s/.test(current)) {
      index += 1;
      continue;
    }

    if (current === "ε" || current === "λ") {
      tokens.push("ε");
      index += 1;
      continue;
    }

    const matchingNonTerminal = nonTerminals.find((nonTerminal) =>
      matchesAt(trimmed, index, nonTerminal)
    );

    if (matchingNonTerminal) {
      tokens.push(matchingNonTerminal);
      index += matchingNonTerminal.length;
      continue;
    }

    if (/[a-z0-9_]/.test(current)) {
      let end = index + 1;

      while (end < trimmed.length && /[a-z0-9_]/.test(trimmed[end] ?? "")) {
        end += 1;
      }

      const word = trimmed.slice(index, end);
      tokens.push(EPSILON_ALIASES.has(word.toLowerCase()) ? "ε" : word);
      index = end;
      continue;
    }

    if (/[A-Z]/.test(current)) {
      let end = index + 1;

      while (end < trimmed.length && /['′]/.test(trimmed[end] ?? "")) {
        end += 1;
      }

      tokens.push(trimmed.slice(index, end));
      index = end;
      continue;
    }

    tokens.push(current);
    index += 1;
  }

  return tokens.length > 0 ? tokens : ["ε"];
}

function normalizeGrammarLine(line: string, nonTerminals: string[]): string {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) {
    return line;
  }

  const parts = trimmed.split(ARROW_PATTERN);

  if (parts.length < 2) {
    return trimmed;
  }

  const left = parts[0]?.trim() ?? "";
  const right = parts.slice(1).join(" -> ");

  if (!left || !right.trim()) {
    return trimmed;
  }

  const alternatives = right.split("|").map((alternative) => {
    const tokens = tokenizeCompactAlternative(alternative, nonTerminals);
    return tokens.join(" ");
  });

  return `${left} -> ${alternatives.join(" | ")}`;
}

function normalizeGrammarSource(source: string): string {
  const nonTerminals = collectNonTerminals(source);

  return source
    .split("\n")
    .map((line) => normalizeGrammarLine(line, nonTerminals))
    .join("\n")
    .replace(/\b(?:eps|epsilon|lambda)\b/gi, "ε")
    .replace(/\s+\|\s+/g, " | ")
    .replace(/[ \t]+$/gm, "");
}

export function ParserLeftPanel({
  grammarSource,
  inputString,
  onGrammarChange,
  onInputChange,
  onAnalyze
}: ParserLeftPanelProps) {
  const grammarEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const lineNumbers = useMemo(() => {
    const count = Math.max(grammarSource.split("\n").length, 1);

    return Array.from({ length: count }, (_, index) => index + 1);
  }, [grammarSource]);

  const normalizedPreview = useMemo(
    () => normalizeGrammarSource(grammarSource),
    [grammarSource]
  );

  const hasNormalizationChanges = normalizedPreview !== grammarSource;

  function insertIntoGrammar(value: string): void {
    const textarea = grammarEditorRef.current;
    const start = textarea?.selectionStart ?? grammarSource.length;
    const end = textarea?.selectionEnd ?? grammarSource.length;
    const nextValue =
      grammarSource.slice(0, start) + value + grammarSource.slice(end);
    const nextCursorPosition = start + value.length;

    onGrammarChange(nextValue);

    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  }

  function insertIntoInput(value: string): void {
    const input = inputRef.current;
    const start = input?.selectionStart ?? inputString.length;
    const end = input?.selectionEnd ?? inputString.length;
    const nextValue = inputString.slice(0, start) + value + inputString.slice(end);
    const nextCursorPosition = start + value.length;

    onInputChange(nextValue);

    window.requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  }

  function handleFormatGrammar(): void {
    onGrammarChange(normalizedPreview);
  }

  function handleAnalyze(): void {
    if (hasNormalizationChanges) {
      onGrammarChange(normalizedPreview);
      window.requestAnimationFrame(onAnalyze);
      return;
    }

    onAnalyze();
  }

  return (
    <div
      style={{
        width: "100%",
        minWidth: 0,
        display: "flex",
        flexDirection: "column"
      }}
    >
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8
          }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            <div className="sec-label">Gramática</div>
            <InfoHint title="Formato de gramática" label={GRAMMAR_HELP} />
          </div>

          <button
            type="button"
            className="pill-btn"
            onClick={handleFormatGrammar}
            title="Convierte →, ::=, :: y eps a un formato uniforme."
            style={{ padding: "5px 9px", fontSize: 11 }}
          >
            Normalizar
          </button>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            padding: "8px",
            border: "1px solid rgba(148, 163, 184, 0.18)",
            borderRadius: 14,
            background: "rgba(15, 23, 42, 0.55)"
          }}
        >
          {GRAMMAR_SYMBOLS.map((symbol) => (
            <button
              key={symbol.label}
              type="button"
              className="str-chip"
              title={symbol.title}
              onClick={() => insertIntoGrammar(symbol.value)}
              style={{
                minWidth: symbol.label === "::=" ? 44 : 34,
                fontWeight: 800,
                fontSize: 13
              }}
            >
              {symbol.label}
            </button>
          ))}
        </div>

        <div className="editor-wrap" style={{ flex: 1, minHeight: 190 }}>
          <div className="line-nums">
            {lineNumbers.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>

          <textarea
            ref={grammarEditorRef}
            className="grammar-editor"
            value={grammarSource}
            spellCheck={false}
            onChange={(event) => onGrammarChange(event.target.value)}
            placeholder={"Ejemplo:\nE -> T E′\nE′ -> + T E′ | ε\nT -> id | ( E )"}
            style={{
              paddingLeft: 42,
              width: "100%",
              height: "100%",
              lineHeight: 1.55
            }}
          />
        </div>

        {hasNormalizationChanges ? (
          <div
            style={{
              padding: "9px 10px",
              borderRadius: 12,
              border: "1px solid rgba(251, 191, 36, 0.22)",
              background: "rgba(251, 191, 36, 0.08)",
              color: "var(--muted)",
              fontSize: 12,
              lineHeight: 1.4
            }}
          >
            Se detectó un formato flexible. Al analizar, se usará una versión
            normalizada para que el motor la pueda procesar mejor.
          </div>
        ) : null}
      </div>

      <div className="divider" />

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            marginBottom: 7
          }}
        >
          <div className="sec-label">Cadena de entrada</div>
          <InfoHint title="Cadena a validar" label={INPUT_HELP} />
        </div>

        <div
          className="str-row"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 34px 38px",
            gap: 6,
            alignItems: "center",
            minWidth: 0,
            overflow: "hidden"
          }}
        >
          <input
            ref={inputRef}
            className="str-input"
            value={inputString}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="Ejemplo: id + id * id"
            style={{ minWidth: 0, width: "100%" }}
          />

          <button
            type="button"
            className="pill-btn"
            title="Insertar marcador de fin de entrada"
            onClick={() => insertIntoInput(" $")}
            style={{ width: 34, minWidth: 34, padding: 0, flexShrink: 0 }}
          >
            $
          </button>

          <button
            type="button"
            className="pill-btn primary"
            style={{ width: 38, minWidth: 38, padding: 0, flexShrink: 0 }}
            onClick={handleAnalyze}
            title="Analizar cadena"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
