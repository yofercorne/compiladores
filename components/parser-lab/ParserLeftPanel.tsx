"use client";

import { useMemo } from "react";

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
  activeParser: ParserKind;
  onGrammarChange: (value: string) => void;
  onInputChange: (value: string) => void;
  onParserChange: (parser: ParserKind) => void;
  onAnalyze: () => void;
};

const PARSERS: Array<{
  id: ParserKind;
  group: "Top-Down" | "Bottom-Up";
  name: string;
  description: string;
}> = [
  {
    id: "recursiveDescent",
    group: "Top-Down",
    name: "Recursivo",
    description: "Descenso recursivo"
  },
  {
    id: "ll1",
    group: "Top-Down",
    name: "LL(1)",
    description: "Predictivo tabla"
  },
  {
    id: "lr0",
    group: "Bottom-Up",
    name: "LR(0)",
    description: "Ítem-sets"
  },
  {
    id: "slr1",
    group: "Bottom-Up",
    name: "SLR(1)",
    description: "FOLLOW-guided"
  },
  {
    id: "lr1",
    group: "Bottom-Up",
    name: "LR(1)",
    description: "Canónico"
  },
  {
    id: "lalr1",
    group: "Bottom-Up",
    name: "LALR(1)",
    description: "Fusión de estados"
  }
];

const INPUT_PRESETS = [
  "id + id * id",
  "id * ( id + id )",
  "id",
  "+ id",
  "( id )"
];

export function ParserLeftPanel({
  grammarSource,
  inputString,
  activeParser,
  onGrammarChange,
  onInputChange,
  onParserChange,
  onAnalyze
}: ParserLeftPanelProps) {
  const lineNumbers = useMemo(() => {
    const count = Math.max(grammarSource.split("\n").length, 1);

    return Array.from({ length: count }, (_, index) => index + 1);
  }, [grammarSource]);

  return (
    <>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div className="sec-label">Gramática</div>

        <div className="editor-wrap" style={{ flex: 1, minHeight: 170 }}>
          <div className="line-nums">
            {lineNumbers.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>

          <textarea
            className="grammar-editor"
            value={grammarSource}
            spellCheck={false}
            onChange={(event) => onGrammarChange(event.target.value)}
            style={{
              paddingLeft: 42,
              width: "100%",
              height: "100%"
            }}
          />
        </div>
      </div>

      <div className="divider" />

      <div>
        <div className="sec-label">Parser</div>

        <div className="parser-grid">
          {PARSERS.map((parser) => (
            <button
              key={parser.id}
              type="button"
              className={
                activeParser === parser.id ? "parser-card sel" : "parser-card"
              }
              onClick={() => onParserChange(parser.id)}
            >
              <span
                className={
                  parser.group === "Top-Down"
                    ? "pc-tag td-tag"
                    : "pc-tag bu-tag"
                }
              >
                {parser.group}
              </span>

              <span className="pc-name">{parser.name}</span>
              <span className="pc-sub">{parser.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="divider" />

      <div>
        <div className="sec-label">Cadena de entrada</div>

        <div className="str-row">
          <input
            className="str-input"
            value={inputString}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="Ejemplo: id + id * id"
          />

          <button
            type="button"
            className="pill-btn primary"
            style={{ flexShrink: 0 }}
            onClick={onAnalyze}
          >
            →
          </button>
        </div>

        <div className="str-chips" style={{ marginTop: 6 }}>
          {INPUT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className="str-chip"
              onClick={() => onInputChange(preset)}
              style={preset === "+ id" ? { color: "var(--red)" } : undefined}
            >
              {preset === "id + id * id" ? "id+id*id" : preset}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}