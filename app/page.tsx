"use client";

import { useState } from "react";

import {
  GRAMMAR_EXAMPLES,
  parseGrammar,
  computeFirstFollow,
  buildLL1Table,
  simulateLL1,
  buildLR0Automaton,
  buildLR0TableFromAutomaton,
  simulateLR0,
  buildSLR1TableFromAutomaton,
  simulateSLR1,
  buildLR1Table,
  simulateLR1,
  buildLALR1Table,
  simulateLALR1,
  type Grammar,
  type GrammarParseIssue,
  type GrammarExample,
  type FirstFollowResult,
  type LL1TableResult,
  type LL1SimulationResult,
  type LR0Automaton,
  type LR0TableResult,
  type LR0SimulationResult,
  type SLR1TableResult,
  type SLR1SimulationResult,
  type LR1TableResult,
  type LR1SimulationResult,
  type LALR1TableResult,
  type LALR1SimulationResult
} from "@/src/parser-engine";

import {
  ParserCenterPanel,
  ParserLabShell,
  ParserLeftPanel,
  ParserRightPanel,
  ParserStatusbar,
  type ParserKind,
  type ParserLabModule
} from "@/components/parser-lab";

type AnalysisResult = {
  grammar?: Grammar;
  issues: GrammarParseIssue[];

  firstFollow?: FirstFollowResult;

  ll1?: LL1TableResult;
  simulation?: LL1SimulationResult;

  lr0Automaton?: LR0Automaton;
  lr0?: LR0TableResult;
  lr0Simulation?: LR0SimulationResult;

  slr1?: SLR1TableResult;
  slr1Simulation?: SLR1SimulationResult;

  lr1?: LR1TableResult;
  lr1Simulation?: LR1SimulationResult;

  lalr1?: LALR1TableResult;
  lalr1Simulation?: LALR1SimulationResult;
};

const DEFAULT_EXAMPLE = GRAMMAR_EXAMPLES[0]!;

const PARSER_LABEL: Record<ParserKind, string> = {
  recursiveDescent: "Descenso recursivo",
  ll1: "LL(1)",
  lr0: "LR(0)",
  slr1: "SLR(1)",
  lr1: "LR(1)",
  lalr1: "LALR(1)"
};

const MODULE_BADGE: Record<ParserLabModule, string> = {
  lab: "Lab",
  automata: "Autómata",
  compare: "Comparar",
  conflict: "Conflictos",
  refactor: "Refactor",
  tutor: "Tutor IA",
  gallery: "Galería",
  report: "Reporte"
};

export default function HomePage() {
  const [grammarSource, setGrammarSource] = useState(DEFAULT_EXAMPLE.grammar);
  const [inputString, setInputString] = useState(DEFAULT_EXAMPLE.input);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedExampleId, setSelectedExampleId] = useState<string | undefined>(
  DEFAULT_EXAMPLE.id
);

  const [activeModule, setActiveModule] = useState<ParserLabModule>("lab");
  const [activeParser, setActiveParser] = useState<ParserKind>("ll1");
  const [isRunning, setIsRunning] = useState(false);


function handleGrammarChange(value: string) {
  setSelectedExampleId(undefined);
  setGrammarSource(value);
  setResult(null);
}

  function handleParserChange(parser: ParserKind) {
    setActiveParser(parser);
  }

  function handleSelectExample(example: GrammarExample) {
  setSelectedExampleId(example.id);
  setGrammarSource(example.grammar);
  setInputString(example.input);
  setResult(null);
  setActiveModule("lab");
}

  function handleAnalyze() {
    setIsRunning(true);

    try {
      const parsed = parseGrammar(grammarSource);

      if (!parsed.grammar) {
        setResult({
          issues: parsed.issues
        });

        return;
      }

      const grammar = parsed.grammar;
      const firstFollow = computeFirstFollow(grammar);

      const ll1 = buildLL1Table(
        grammar,
        firstFollow.first,
        firstFollow.follow
      );

      const simulation =
        ll1.conflicts.length === 0
          ? simulateLL1(grammar, ll1.table, inputString)
          : undefined;

      const lr0 = buildLR0Automaton(grammar);

      const lr0Table = buildLR0TableFromAutomaton(
        grammar,
        lr0.automaton
      );

      const lr0Simulation =
        lr0Table.conflicts.length === 0
          ? simulateLR0(grammar, lr0Table, inputString)
          : undefined;

      const slr1 = buildSLR1TableFromAutomaton(
        grammar,
        lr0.automaton,
        firstFollow.follow
      );

      const slr1Simulation =
        slr1.conflicts.length === 0
          ? simulateSLR1(grammar, slr1, inputString)
          : undefined;

      const lr1 = buildLR1Table(grammar, firstFollow.first);

      const lr1Simulation =
        lr1.conflicts.length === 0
          ? simulateLR1(grammar, lr1, inputString)
          : undefined;

      const lalr1 = buildLALR1Table(grammar, firstFollow.first);

      const lalr1Simulation =
        lalr1.conflicts.length === 0
          ? simulateLALR1(grammar, lalr1, inputString)
          : undefined;

      setResult({
        grammar,
        issues: parsed.issues,
        firstFollow,

        ll1,
        lr0Automaton: lr0.automaton,
        lr0: lr0Table,

        slr1,
        lr1,
        lalr1,

        ...(simulation ? { simulation } : {}),
        ...(lr0Simulation ? { lr0Simulation } : {}),
        ...(slr1Simulation ? { slr1Simulation } : {}),
        ...(lr1Simulation ? { lr1Simulation } : {}),
        ...(lalr1Simulation ? { lalr1Simulation } : {})
      });
    } catch (error) {
      setResult({
        issues: [
          {
            line: 0,
            severity: "error",
            message:
              error instanceof Error
                ? error.message
                : "Ocurrió un error inesperado durante el análisis."
          }
        ]
      });
    } finally {
      setIsRunning(false);
    }
  }

  function handleRunAnalysis() {
    setActiveModule("lab");
    handleAnalyze();
  }

  function handleTogglePresentation() {
    const currentZoom = document.body.style.getPropertyValue("zoom");

    document.body.style.setProperty(
      "zoom",
      currentZoom === "1.08" ? "" : "1.08"
    );
  }

  function handleToggleTheme() {
    const root = document.documentElement;
    const currentBackground = root.style.getPropertyValue("--bg0");

    if (currentBackground === "#f8faff") {
      root.style.setProperty("--bg0", "#080c16");
      root.style.setProperty("--bg1", "#0c1220");
      root.style.setProperty("--bg2", "#101828");
      root.style.setProperty("--bg3", "#162035");
      root.style.setProperty("--bg4", "#1d2b45");
      root.style.setProperty("--txt0", "#f0f4ff");
      root.style.setProperty("--txt1", "#a8b8d8");
      root.style.setProperty("--txt2", "#637799");
      root.style.setProperty("--txt3", "#3a4f6e");

      return;
    }

    root.style.setProperty("--bg0", "#f8faff");
    root.style.setProperty("--bg1", "#eef2ff");
    root.style.setProperty("--bg2", "#e8eeff");
    root.style.setProperty("--bg3", "#dde4ff");
    root.style.setProperty("--bg4", "#cdd8ff");
    root.style.setProperty("--txt0", "#0c1220");
    root.style.setProperty("--txt1", "#1d2b45");
    root.style.setProperty("--txt2", "#3a4f6e");
    root.style.setProperty("--txt3", "#637799");
  }

  const issueCount = result?.issues.length ?? 0;

  const hasErrorIssue =
    result?.issues.some((issue) => issue.severity === "error") ?? false;

  const productionCount = result?.grammar?.productions.length ?? 0;
  const terminalCount = result?.grammar?.terminals.length ?? 0;

  const grammarStatus =
    result === null
      ? "idle"
      : hasErrorIssue
        ? "error"
        : issueCount > 0
          ? "warning"
          : "valid";

  const grammarMessage =
    result === null
      ? "Sin análisis"
      : hasErrorIssue
        ? "Gramática con errores"
        : issueCount > 0
          ? `Gramática con ${issueCount} aviso(s)`
          : "Gramática válida";

  return (
    <ParserLabShell
      activeModule={activeModule}
      onModuleChange={setActiveModule}
      onRun={handleRunAnalysis}
      isRunning={isRunning}
      onTogglePresentation={handleTogglePresentation}
      onToggleTheme={handleToggleTheme}
      leftTitle="Grammar Editor"
      leftBadge={
        <span
          className={
            grammarStatus === "valid"
              ? "badge b-green"
              : grammarStatus === "warning"
                ? "badge b-amber"
                : grammarStatus === "error"
                  ? "badge b-red"
                  : "badge b-blue"
          }
        >
          {grammarStatus === "valid"
            ? "Válida"
            : grammarStatus === "warning"
              ? "Avisos"
              : grammarStatus === "error"
                ? "Error"
                : "Sin análisis"}
        </span>
      }
      leftPanel={
        <ParserLeftPanel
          grammarSource={grammarSource}
          inputString={inputString}
          activeParser={activeParser}
          onGrammarChange={handleGrammarChange}
          onInputChange={setInputString}
          onParserChange={handleParserChange}
          onAnalyze={handleRunAnalysis}
        />
      }
      centerPanel={
<ParserCenterPanel
  activeModule={activeModule}
  result={result}
  inputString={inputString}
  examples={GRAMMAR_EXAMPLES}
  onSelectExample={handleSelectExample}
  {...(selectedExampleId !== undefined
    ? { selectedExampleId }
    : {})}
/>
      }
      rightTitle="Analizadores"
      rightBadge={
        <span className="badge b-purple">{MODULE_BADGE[activeModule]}</span>
      }
      rightPanel={
        <ParserRightPanel
          activeParser={activeParser}
          onParserChange={handleParserChange}
        />
      }
      statusbar={
        <ParserStatusbar
          status={grammarStatus}
          message={grammarMessage}
          activeParser={PARSER_LABEL[activeParser]}
          productionCount={productionCount}
          terminalCount={terminalCount}
        />
      }
    />
  );
}