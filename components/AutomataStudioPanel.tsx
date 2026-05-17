"use client";

import {
  useMemo,
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

import type {
  Grammar,
  LR0Automaton,
  LR0TableResult,
  LR1TableResult,
  LALR1TableResult,
} from "@/src/parser-engine";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type AutomataPanelId = "afn" | "afd" | "lr0" | "lr1" | "lalr1";

type AutomataStudioResult = {
  grammar?: Grammar;
  lr0Automaton?: LR0Automaton;
  lr0?: LR0TableResult;
  lr1?: LR1TableResult;
  lalr1?: LALR1TableResult;
  afn?: unknown;
  afd?: unknown;
};

type AutomataStudioPanelProps = {
  result: AutomataStudioResult | null;
};

type GraphState = {
  id: string;
  raw: unknown;
  items: unknown[];
  conflicts: unknown[];
};

type GraphEdge = {
  from: string;
  to: string;
  symbol: string;
};

// Card dimensions — computed once per render based on item count
const CARD_W      = 210;
const CARD_H_BASE = 52;   // header only
const ITEM_H      = 18;   // height per item row
const CARD_PAD_V  = 8;    // top/bottom padding inside item area
const MAX_ITEMS_VISIBLE = 8;

function cardHeight(itemCount: number): number {
  const shown = Math.min(itemCount, MAX_ITEMS_VISIBLE);
  return CARD_H_BASE + CARD_PAD_V * 2 + shown * ITEM_H + (itemCount > MAX_ITEMS_VISIBLE ? 16 : 0);
}

const X_GAP  = 310;
const Y_GAP  = 24;
const PAD_X  = 80;
const PAD_Y  = 60;

type LayoutNode = GraphState & {
  x: number; y: number;
  width: number; height: number;
  layer: number; order: number;
};

type RoutedEdge = GraphEdge & {
  x1: number; y1: number;
  cx1: number; cy1: number;
  cx2: number; cy2: number;
  x2: number; y2: number;
  labelX: number; labelY: number;
  isSelfLoop: boolean;
  selfLoopIndex: number;
  toStatus: NodeStatus;
};

type NodeStatus = "normal" | "reduce" | "accept" | "conflict";
type Production = Grammar["productions"][number];
type ProductionMap = Map<string, Production>;
type Viewport = { x: number; y: number; scale: number };

// ═══════════════════════════════════════════════════════════════════════════
// PANEL DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

type PanelDef = {
  id: AutomataPanelId;
  label: string;
  shortLabel: string;
  description: string;
  badge: string;
  group: "finite" | "lr";
};

const AUTOMATA_PANELS: PanelDef[] = [
  { id:"afn",   label:"AFN-ε",   shortLabel:"AFN-ε",   description:"Autómata finito no determinista con transiciones épsilon.", badge:"No-det",  group:"finite" },
  { id:"afd",   label:"AFD",     shortLabel:"AFD",     description:"Autómata finito determinista (subconjuntos del AFN-ε).",    badge:"Det",     group:"finite" },
  { id:"lr0",   label:"LR(0)",   shortLabel:"LR(0)",   description:"Colección canónica de ítems LR(0).",                       badge:"Básico",  group:"lr"     },
  { id:"lr1",   label:"LR(1)",   shortLabel:"LR(1)",   description:"Estados con lookaheads explícitos.",                       badge:"Potente", group:"lr"     },
  { id:"lalr1", label:"LALR(1)", shortLabel:"LALR(1)", description:"Estados LR(1) fusionados por núcleo.",                     badge:"Óptimo",  group:"lr"     },
];

// ═══════════════════════════════════════════════════════════════════════════
// PALETTE
// ═══════════════════════════════════════════════════════════════════════════

const PALETTE: Record<NodeStatus, {
  headerBg: string; headerBorder: string; bodyBg: string; bodyBorder: string;
  titleColor: string; mutedColor: string; itemBg: string; itemBorder: string;
  edge: string; edgeAlpha: string; glow: string; badge: string;
}> = {
  normal: {
    headerBg:    "rgba(99,102,241,.18)",
    headerBorder:"rgba(99,102,241,.50)",
    bodyBg:      "rgba(14,17,35,.92)",
    bodyBorder:  "rgba(99,102,241,.30)",
    titleColor:  "#a5b4fc",
    mutedColor:  "rgba(165,180,252,.55)",
    itemBg:      "rgba(99,102,241,.06)",
    itemBorder:  "rgba(99,102,241,.14)",
    edge:        "#6366f1",
    edgeAlpha:   "rgba(99,102,241,.55)",
    glow:        "rgba(99,102,241,.25)",
    badge:       "rgba(99,102,241,.22)",
  },
  reduce: {
    headerBg:    "rgba(251,191,36,.14)",
    headerBorder:"rgba(251,191,36,.55)",
    bodyBg:      "rgba(14,17,35,.92)",
    bodyBorder:  "rgba(251,191,36,.30)",
    titleColor:  "#fbbf24",
    mutedColor:  "rgba(251,191,36,.55)",
    itemBg:      "rgba(251,191,36,.06)",
    itemBorder:  "rgba(251,191,36,.16)",
    edge:        "#f59e0b",
    edgeAlpha:   "rgba(251,191,36,.55)",
    glow:        "rgba(251,191,36,.20)",
    badge:       "rgba(251,191,36,.20)",
  },
  accept: {
    headerBg:    "rgba(52,211,153,.12)",
    headerBorder:"rgba(52,211,153,.55)",
    bodyBg:      "rgba(14,17,35,.92)",
    bodyBorder:  "rgba(52,211,153,.30)",
    titleColor:  "#34d399",
    mutedColor:  "rgba(52,211,153,.55)",
    itemBg:      "rgba(52,211,153,.06)",
    itemBorder:  "rgba(52,211,153,.14)",
    edge:        "#10b981",
    edgeAlpha:   "rgba(52,211,153,.55)",
    glow:        "rgba(52,211,153,.22)",
    badge:       "rgba(52,211,153,.20)",
  },
  conflict: {
    headerBg:    "rgba(248,113,113,.12)",
    headerBorder:"rgba(248,113,113,.55)",
    bodyBg:      "rgba(14,17,35,.92)",
    bodyBorder:  "rgba(248,113,113,.30)",
    titleColor:  "#f87171",
    mutedColor:  "rgba(248,113,113,.55)",
    itemBg:      "rgba(248,113,113,.06)",
    itemBorder:  "rgba(248,113,113,.14)",
    edge:        "#ef4444",
    edgeAlpha:   "rgba(248,113,113,.55)",
    glow:        "rgba(248,113,113,.22)",
    badge:       "rgba(248,113,113,.20)",
  },
};

const STATUS_LABELS: Record<NodeStatus, string> = {
  normal:"shift", reduce:"reduce", accept:"accept", conflict:"conflict",
};

// ═══════════════════════════════════════════════════════════════════════════
// SUGIYAMA LAYOUT  (longest-path layering + 3-pass barycenter)
// ═══════════════════════════════════════════════════════════════════════════

function sugiyamaLayout(
  states: GraphState[],
  edges: GraphEdge[],
  productionById: ProductionMap,
): { nodes: LayoutNode[]; width: number; height: number } {
  if (!states.length) return { nodes: [], width: 900, height: 500 };

  const adj  = new Map<string, Set<string>>();
  const pred = new Map<string, Set<string>>();
  for (const s of states) { adj.set(s.id, new Set()); pred.set(s.id, new Set()); }
  for (const e of edges) {
    if (e.from !== e.to) {
      adj.get(e.from)?.add(e.to);
      pred.get(e.to)?.add(e.from);
    }
  }

  // topological order
  const topo: string[] = [];
  const seen = new Set<string>();
  function dfs(id: string) {
    if (seen.has(id)) return;
    seen.add(id);
    for (const nb of adj.get(id) ?? []) dfs(nb);
    topo.unshift(id);
  }
  for (const s of states) dfs(s.id);

  // longest-path layering
  const layer = new Map<string, number>();
  const startId = states.some(s => s.id === "0") ? "0" : states[0]!.id;
  layer.set(startId, 0);
  for (const id of topo) {
    if (!layer.has(id)) layer.set(id, 0);
    const cur = layer.get(id)!;
    for (const nb of adj.get(id) ?? []) {
      const nbL = layer.get(nb) ?? 0;
      if (nbL <= cur) layer.set(nb, cur + 1);
    }
  }
  let maxL = Math.max(0, ...layer.values());
  for (const s of states) if (!layer.has(s.id)) layer.set(s.id, ++maxL);

  // group by layer
  const layers = new Map<number, string[]>();
  for (const [id, l] of layer) {
    if (!layers.has(l)) layers.set(l, []);
    layers.get(l)!.push(id);
  }
  for (const arr of layers.values()) arr.sort((a, b) => Number(a) - Number(b));
  const sortedLi = [...layers.keys()].sort((a, b) => a - b);

  // barycenter crossing minimisation (3 passes)
  function baryPass(forward: boolean) {
    const seq = forward ? sortedLi : [...sortedLi].reverse();
    for (let i = 1; i < seq.length; i++) {
      const cur  = layers.get(seq[i]!)!;
      const prev = layers.get(seq[i - 1]!)!;
      const pos  = new Map(prev.map((id, j) => [id, j]));
      const score = new Map<string, number>();
      for (const id of cur) {
        const nbrs = (forward ? [...(pred.get(id) ?? [])] : [...(adj.get(id) ?? [])]).filter(n => pos.has(n));
        score.set(id, nbrs.length
          ? nbrs.reduce((s, n) => s + (pos.get(n) ?? 0), 0) / nbrs.length
          : prev.length / 2);
      }
      cur.sort((a, b) => (score.get(a) ?? 0) - (score.get(b) ?? 0));
    }
  }
  baryPass(true); baryPass(false); baryPass(true);

  // Compute per-node heights
  const nodeMap = new Map(states.map(s => [s.id, s]));
  const heightOf = (id: string) => {
    const st = nodeMap.get(id);
    return st ? cardHeight(st.items.length) : CARD_H_BASE;
  };

  // compute layer x-positions and column heights
  const numL   = sortedLi.length;
  const width  = PAD_X * 2 + (numL - 1) * X_GAP + CARD_W;

  // per-layer total height
  const layerTotH = sortedLi.map(li => {
    const arr = layers.get(li)!;
    return arr.reduce((acc, id) => acc + heightOf(id) + Y_GAP, -Y_GAP);
  });
  const maxColH = Math.max(0, ...layerTotH);
  const height  = PAD_Y * 2 + maxColH;

  const nodes: LayoutNode[] = [];
  for (let li = 0; li < sortedLi.length; li++) {
    const lIdx = sortedLi[li]!;
    const arr  = layers.get(lIdx)!;
    const tot  = arr.reduce((acc, id) => acc + heightOf(id) + Y_GAP, -Y_GAP);
    let y = height / 2 - tot / 2;
    for (const id of arr) {
      const st = nodeMap.get(id)!;
      const h  = heightOf(id);
      nodes.push({
        ...st,
        x: PAD_X + li * X_GAP,
        y,
        width: CARD_W,
        height: h,
        layer: lIdx,
        order: arr.indexOf(id),
      });
      y += h + Y_GAP;
    }
  }

  return { nodes, width: Math.max(900, width), height: Math.max(500, height) };
}

// ═══════════════════════════════════════════════════════════════════════════
// EDGE ROUTING  — orthogonal / cubic Bézier with port-based connection
// ═══════════════════════════════════════════════════════════════════════════

function routeEdges(
  edges: GraphEdge[],
  posMap: Map<string, LayoutNode>,
  productionById: ProductionMap,
): RoutedEdge[] {
  // merge same from→to
  const merged = new Map<string, GraphEdge>();
  for (const e of edges) {
    const key = `${e.from}→${e.to}`;
    if (merged.has(key)) {
      const ex  = merged.get(key)!;
      const set = new Set([...ex.symbol.split(", "), ...e.symbol.split(", ")]);
      merged.set(key, { ...ex, symbol: [...set].join(", ") });
    } else {
      merged.set(key, { ...e });
    }
  }

  const list = [...merged.values()];

  // bidirectional pair tracking
  const pairTotal = new Map<string, number>();
  for (const e of list) {
    const k = [e.from, e.to].sort().join("↔");
    pairTotal.set(k, (pairTotal.get(k) ?? 0) + 1);
  }
  const pairIdx   = new Map<string, number>();
  const loopCount = new Map<string, number>();
  const result: RoutedEdge[] = [];

  for (const e of list) {
    const fn = posMap.get(e.from);
    const tn = posMap.get(e.to);
    if (!fn || !tn) continue;

    const toStatus: NodeStatus = tn ? getStateStatus(tn, productionById) : "normal";

    // ── Self-loop ─────────────────────────────────────────────────────────
    if (e.from === e.to) {
      const idx = loopCount.get(e.from) ?? 0;
      loopCount.set(e.from, idx + 1);
      result.push({
        ...e, toStatus,
        x1:0, y1:0, cx1:0, cy1:0, cx2:0, cy2:0, x2:0, y2:0,
        labelX: fn.x + fn.width + 30 + idx * 20,
        labelY: fn.y + fn.height / 2,
        isSelfLoop: true,
        selfLoopIndex: idx,
      });
      continue;
    }

    // ── Regular edge ──────────────────────────────────────────────────────
    const pk    = [e.from, e.to].sort().join("↔");
    const total = pairTotal.get(pk) ?? 1;
    const idx   = pairIdx.get(pk) ?? 0;
    pairIdx.set(pk, idx + 1);

    const fCx = fn.x + fn.width / 2;
    const fCy = fn.y + fn.height / 2;
    const tCx = tn.x + tn.width / 2;
    const tCy = tn.y + tn.height / 2;

    const goingRight = tn.layer >= fn.layer;
    const SPREAD = 18;
    const spreadOff = total > 1 ? (idx - (total - 1) / 2) * SPREAD : 0;

    let x1: number, y1: number, x2: number, y2: number;
    let cx1: number, cy1: number, cx2: number, cy2: number;

    if (goingRight) {
      // right port → left port
      x1 = fn.x + fn.width;
      y1 = fCy + spreadOff;
      x2 = tn.x;
      y2 = tCy + spreadOff;
      const dist = Math.abs(x2 - x1);
      const bow  = Math.max(40, dist * 0.4);
      cx1 = x1 + bow;
      cy1 = y1;
      cx2 = x2 - bow;
      cy2 = y2;
    } else {
      // backward edge: route above/below with large bow
      x1 = fCx + spreadOff;
      y1 = fn.y;
      x2 = tCx + spreadOff;
      y2 = tn.y + tn.height;
      const vDist = Math.abs(fn.y - tn.y);
      const hOff  = Math.min(120, vDist * 0.5 + 60);
      cy1 = y1 - hOff;
      cy2 = y2 + hOff;
      cx1 = x1;
      cx2 = x2;
    }

    const lx = 0.125*x1 + 0.375*cx1 + 0.375*cx2 + 0.125*x2;
    const ly = 0.125*y1 + 0.375*cy1 + 0.375*cy2 + 0.125*y2;

    result.push({ ...e, toStatus, x1, y1, cx1, cy1, cx2, cy2, x2, y2,
      labelX: lx, labelY: ly, isSelfLoop: false, selfLoopIndex: 0 });
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function AutomataStudioPanel({ result }: AutomataStudioPanelProps) {
  const [activePanel,     setActivePanel]     = useState<AutomataPanelId>("lr0");
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [viewport,        setViewport]        = useState<Viewport>({ x:0, y:0, scale:1 });
  const [searchQuery,     setSearchQuery]     = useState("");
  const [isDragging,      setIsDragging]      = useState(false);
  const [showMinimap,     setShowMinimap]     = useState(true);

  const wrapRef    = useRef<HTMLDivElement>(null);
  const dragOrigin = useRef<{ mx:number; my:number; vx:number; vy:number } | null>(null);

  // ── Derived data ─────────────────────────────────────────────────────────
  const automaton = useMemo(() => getAutomatonByPanel(result, activePanel), [result, activePanel]);

  const productionById = useMemo<ProductionMap>(() => {
    const map = new Map<string, Production>();
    for (const p of result?.grammar?.productions ?? []) map.set(String(p.id), p);
    return map;
  }, [result?.grammar]);

  const rawStates = useMemo(() => extractStates(automaton), [automaton]);
  const rawEdges  = useMemo(() => extractEdges(automaton, rawStates), [automaton, rawStates]);
  const layout    = useMemo(() => sugiyamaLayout(rawStates, rawEdges, productionById), [rawStates, rawEdges, productionById]);
  const posMap    = useMemo(() => new Map(layout.nodes.map(n => [n.id, n])), [layout.nodes]);
  const routed    = useMemo(() => routeEdges(rawEdges, posMap, productionById), [rawEdges, posMap, productionById]);

  const conflictCount = useMemo(
    () => getConflictCount(result, activePanel, rawStates),
    [result, activePanel, rawStates]
  );
  const itemCount = rawStates.reduce((t, s) => t + s.items.length, 0);

  const filteredStates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rawStates;
    return rawStates.filter(s =>
      s.id.includes(q) ||
      s.items.some(item => formatItem(item, productionById).toLowerCase().includes(q))
    );
  }, [rawStates, searchQuery, productionById]);

  const selectedState = rawStates.find(s => s.id === selectedStateId) ?? rawStates[0];

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handlePanelChange = useCallback((id: AutomataPanelId) => {
    setActivePanel(id);
    setSelectedStateId(null);
    setViewport({ x:0, y:0, scale:1 });
  }, []);

  const fitToView = useCallback(() => {
    if (!wrapRef.current || !layout.nodes.length) { setViewport({ x:0,y:0,scale:1 }); return; }
    const { clientWidth:w, clientHeight:h } = wrapRef.current;
    const s = Math.min(w / layout.width, h / layout.height, 1) * 0.88;
    setViewport({ x:(w - layout.width*s)/2, y:(h - layout.height*s)/2, scale:s });
  }, [layout]);

  useEffect(() => { fitToView(); }, [fitToView]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect  = wrapRef.current!.getBoundingClientRect();
    const mx    = e.clientX - rect.left;
    const my    = e.clientY - rect.top;
    const delta = e.deltaY < 0 ? 1.12 : 0.9;
    setViewport(v => {
      const ns = Math.max(0.08, Math.min(4, v.scale * delta));
      return { scale:ns, x:mx-(mx-v.x)*(ns/v.scale), y:my-(my-v.y)*(ns/v.scale) };
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as Element).closest("[data-node]")) return;
    dragOrigin.current = { mx:e.clientX, my:e.clientY, vx:viewport.x, vy:viewport.y };
    setIsDragging(true);
  }, [viewport]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragOrigin.current) return;
    const { mx, my, vx, vy } = dragOrigin.current;
    setViewport(v => ({ ...v, x:vx+e.clientX-mx, y:vy+e.clientY-my }));
  }, []);

  const stopDrag = useCallback(() => { dragOrigin.current = null; setIsDragging(false); }, []);

  // Center on selected node
  const centerOnNode = useCallback((id: string) => {
    const node = posMap.get(id);
    if (!node || !wrapRef.current) return;
    const { clientWidth:w, clientHeight:h } = wrapRef.current;
    const cx = node.x + node.width  / 2;
    const cy = node.y + node.height / 2;
    setViewport(v => ({ ...v, x: w/2 - cx*v.scale, y: h/2 - cy*v.scale }));
  }, [posMap]);

  const handleSelectState = useCallback((id: string) => {
    setSelectedStateId(id);
    centerOnNode(id);
  }, [centerOnNode]);

  // Export SVG
  function handleExportSvg() {
    const svg = wrapRef.current?.querySelector("svg");
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type:"image/svg+xml;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href:url, download:`${activePanel}-automata.svg` }).click();
    URL.revokeObjectURL(url);
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (!result) return (
    <AutomataShell>
      <EmptyState icon="⬡" title="Sin análisis" description="Ejecuta una gramática válida para construir los autómatas." />
    </AutomataShell>
  );

  const finiteGroup = AUTOMATA_PANELS.filter(p => p.group === "finite");
  const lrGroup     = AUTOMATA_PANELS.filter(p => p.group === "lr");

  return (
    <AutomataShell>
      {/* ── Selector de paneles ──────────────────────────────────────────── */}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <PanelGroup label="Autómatas Finitos" cols={2}>
          {finiteGroup.map(p => (
            <PanelTab key={p.id} panel={p}
              active={activePanel === p.id}
              available={Boolean(getAutomatonByPanel(result, p.id))}
              onSelect={handlePanelChange}
            />
          ))}
        </PanelGroup>
        <PanelGroup label="Analizadores LR — Bottom-Up" cols={3}>
          {lrGroup.map(p => (
            <PanelTab key={p.id} panel={p}
              active={activePanel === p.id}
              available={Boolean(getAutomatonByPanel(result, p.id))}
              onSelect={handlePanelChange}
            />
          ))}
        </PanelGroup>
      </div>

      {/* ── Área principal ───────────────────────────────────────────────── */}
      {!automaton ? (
        <EmptyState icon="◈" title={`${getPanelLabel(activePanel)} no disponible`}
          description="Ejecuta el análisis con una gramática válida para generar este autómata." />
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) 272px", gap:12, minHeight:0 }}>

          {/* ── Canvas ───────────────────────────────────────────────────── */}
          <section style={{
            minWidth:0, border:"1px solid var(--border)", borderRadius:12,
            background:"var(--bg2)", overflow:"hidden", display:"flex", flexDirection:"column",
          }}>
            {/* Header */}
            <div style={{
              padding:"10px 14px", borderBottom:"1px solid var(--border)", background:"var(--bg3)",
              display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{
                  display:"flex", alignItems:"center", justifyContent:"center",
                  width:28, height:28, borderRadius:7, fontSize:13, color:"#a5b4fc",
                  background:"rgba(99,102,241,.14)", border:"1px solid rgba(99,102,241,.25)",
                }}>⬡</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:800, color:"var(--txt0)", letterSpacing:"-.2px" }}>
                    {getPanelLabel(activePanel)}
                  </div>
                  <div style={{ fontSize:10, color:"var(--txt3)", marginTop:1 }}>
                    {rawStates.length} estados · {rawEdges.length} transiciones · {itemCount} ítems
                  </div>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                {conflictCount > 0
                  ? <span className="badge b-amber">⚠ {conflictCount} conflicto{conflictCount!==1?"s":""}</span>
                  : <span className="badge b-green">✓ Sin conflictos</span>}
                <ZoomBar viewport={viewport} setViewport={setViewport} />
                <SmallBtn onClick={fitToView}       title="Ajustar vista">⊡</SmallBtn>
                <SmallBtn onClick={() => setShowMinimap(m => !m)} title="Minimapa">▣</SmallBtn>
                <SmallBtn onClick={handleExportSvg} title="Exportar SVG">↓ SVG</SmallBtn>
              </div>
            </div>

            {/* Interactive canvas */}
            <div
              ref={wrapRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={stopDrag}
              onMouseLeave={stopDrag}
              onWheel={handleWheel}
              style={{
                flex:1, overflow:"hidden", position:"relative",
                cursor: isDragging ? "grabbing" : "grab",
                background:`
                  radial-gradient(ellipse at 18% 18%, rgba(99,102,241,.05) 0%, transparent 52%),
                  radial-gradient(ellipse at 82% 80%, rgba(52,211,153,.03) 0%, transparent 48%),
                  var(--bg1)
                `,
                minHeight: 420,
              }}
            >
              {/* Dot grid */}
              <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}>
                <defs>
                  <pattern id="asgrid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="0.85" fill="rgba(99,102,241,.10)" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#asgrid)" />
              </svg>

              {/* Graph */}
              <div style={{
                position:"absolute", inset:0,
                transform:`translate(${viewport.x}px,${viewport.y}px) scale(${viewport.scale})`,
                transformOrigin:"0 0",
                willChange:"transform",
              }}>
                <AutomataGraphSvg
                  panelId={activePanel}
                  nodes={layout.nodes}
                  routed={routed}
                  width={layout.width}
                  height={layout.height}
                  selectedStateId={selectedState?.id ?? null}
                  onSelectState={handleSelectState}
                  productionById={productionById}
                />
              </div>

              {/* Minimap */}
              {showMinimap && layout.nodes.length > 0 && (
                <Minimap
                  nodes={layout.nodes}
                  routed={routed}
                  layoutWidth={layout.width}
                  layoutHeight={layout.height}
                  viewport={viewport}
                  containerRef={wrapRef}
                  productionById={productionById}
                  selectedId={selectedState?.id ?? null}
                />
              )}

              {/* Hint */}
              <div style={{
                position:"absolute", bottom:10, right:12, fontSize:9, color:"var(--txt3)",
                letterSpacing:.5, userSelect:"none", pointerEvents:"none",
              }}>
                Scroll para zoom · Arrastra para mover
              </div>
            </div>

            <AutomataLegend />
          </section>

          {/* ── Sidebar ──────────────────────────────────────────────────── */}
          <aside style={{ minWidth:0, display:"flex", flexDirection:"column", gap:10, minHeight:0 }}>
            <StatsGrid
              states={rawStates.length}
              transitions={rawEdges.length}
              items={itemCount}
              conflicts={conflictCount}
            />

            {selectedState
              ? <StateInspector state={selectedState} productionById={productionById} />
              : <EmptyState icon="◎" title="Sin estado" description="Haz clic en un nodo para inspeccionarlo." compact />}

            <StateQuickList
              states={filteredStates} allCount={rawStates.length}
              selectedId={selectedState?.id ?? null} onSelect={handleSelectState}
              productionById={productionById}
              search={searchQuery} onSearch={setSearchQuery}
            />
          </aside>
        </div>
      )}
    </AutomataShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MINIMAP
// ═══════════════════════════════════════════════════════════════════════════

function Minimap({
  nodes, routed, layoutWidth, layoutHeight, viewport, containerRef, productionById, selectedId,
}: {
  nodes: LayoutNode[]; routed: RoutedEdge[];
  layoutWidth: number; layoutHeight: number;
  viewport: Viewport; containerRef: React.RefObject<HTMLDivElement>;
  productionById: ProductionMap; selectedId: string | null;
}) {
  const MM_W = 160;
  const MM_H = 100;
  const scaleX = MM_W / layoutWidth;
  const scaleY = MM_H / layoutHeight;
  const sc     = Math.min(scaleX, scaleY) * 0.92;

  // viewport rect in minimap space
  const cw = containerRef.current?.clientWidth  ?? 0;
  const ch = containerRef.current?.clientHeight ?? 0;
  const vx = (-viewport.x / viewport.scale) * sc;
  const vy = (-viewport.y / viewport.scale) * sc;
  const vw = (cw / viewport.scale) * sc;
  const vh = (ch / viewport.scale) * sc;

  return (
    <div style={{
      position:"absolute", bottom:32, left:12,
      width: MM_W + 4, height: MM_H + 4,
      background:"rgba(7,11,22,.88)", border:"1px solid rgba(99,102,241,.22)",
      borderRadius:8, overflow:"hidden", boxShadow:"0 4px 20px rgba(0,0,0,.5)",
    }}>
      <svg width={MM_W} height={MM_H} viewBox={`0 0 ${MM_W} ${MM_H}`}
        style={{ display:"block", margin:2 }}>

        {/* Edges */}
        {routed.filter(e => !e.isSelfLoop).map((e, i) => (
          <line key={i}
            x1={e.x1*sc} y1={e.y1*sc} x2={e.x2*sc} y2={e.y2*sc}
            stroke={PALETTE[e.toStatus].edgeAlpha} strokeWidth="0.8"
          />
        ))}

        {/* Nodes */}
        {nodes.map(n => {
          const st  = getStateStatus(n, productionById);
          const pal = PALETTE[st];
          const sel = n.id === selectedId;
          return (
            <rect key={n.id}
              x={n.x*sc} y={n.y*sc} width={n.width*sc} height={n.height*sc}
              rx={2} fill={pal.headerBg}
              stroke={sel ? pal.headerBorder : pal.bodyBorder}
              strokeWidth={sel ? 1.2 : 0.6}
            />
          );
        })}

        {/* Viewport indicator */}
        <rect
          x={vx} y={vy} width={Math.min(vw, MM_W)} height={Math.min(vh, MM_H)}
          fill="rgba(99,102,241,.10)"
          stroke="rgba(99,102,241,.55)" strokeWidth="1"
          rx={2}
        />
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GRAPH SVG
// ═══════════════════════════════════════════════════════════════════════════

function AutomataGraphSvg({
  panelId, nodes, routed, width, height, selectedStateId, onSelectState, productionById,
}: {
  panelId: AutomataPanelId; nodes: LayoutNode[]; routed: RoutedEdge[];
  width: number; height: number; selectedStateId: string | null;
  onSelectState: (id: string) => void; productionById: ProductionMap;
}) {
  const mid = `arr-${panelId}`;
  const gId = `glow-${panelId}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}
      style={{ display:"block", overflow:"visible" }}>
      <defs>
        {(["normal","reduce","accept","conflict"] as NodeStatus[]).map(st => (
          <marker key={st} id={`${mid}-${st}`} markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
            <path d="M0,0 L0,7 L9,3.5 z" fill={PALETTE[st].edge} />
          </marker>
        ))}
        <filter id={gId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* ── Edges ──────────────────────────────────────────────────────── */}
      <g>
        {routed.map((e, i) => {
          const fn = nodes.find(n => n.id === e.from);
          const pal = PALETTE[e.toStatus];

          if (e.isSelfLoop) {
            if (!fn) return null;
            const r  = 28;
            const cx = fn.x + fn.width + r + e.selfLoopIndex * 20;
            const cy = fn.y + fn.height / 2;
            return (
              <g key={i}>
                <path
                  d={`M ${fn.x + fn.width} ${cy - r * 0.5}
                      C ${cx} ${cy - r * 1.6},
                        ${cx} ${cy + r * 1.6},
                        ${fn.x + fn.width} ${cy + r * 0.5}`}
                  fill="none" stroke={pal.edgeAlpha} strokeWidth="1.6"
                  strokeDasharray="4 2.5"
                  markerEnd={`url(#${mid}-${e.toStatus})`}
                />
                <EdgeLabel symbol={e.symbol} x={e.labelX} y={e.labelY} status={e.toStatus} />
              </g>
            );
          }

          return (
            <g key={i}>
              <path
                d={`M ${e.x1} ${e.y1} C ${e.cx1} ${e.cy1} ${e.cx2} ${e.cy2} ${e.x2} ${e.y2}`}
                fill="none" stroke={pal.edgeAlpha} strokeWidth="1.7"
                markerEnd={`url(#${mid}-${e.toStatus})`}
              />
              <EdgeLabel symbol={e.symbol} x={e.labelX} y={e.labelY} status={e.toStatus} />
            </g>
          );
        })}
      </g>

      {/* ── Nodes ──────────────────────────────────────────────────────── */}
      {nodes.map(node => (
        <AutomataNode key={node.id} state={node}
          selected={selectedStateId === node.id}
          onSelect={onSelectState}
          productionById={productionById}
          glowId={gId}
        />
      ))}

      {nodes.length === 0 && (
        <text x={width/2} y={height/2} textAnchor="middle" fill="var(--txt3)" fontSize="13">
          No hay estados disponibles.
        </text>
      )}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NODE CARD (rectangular, shows items inline)
// ═══════════════════════════════════════════════════════════════════════════

function AutomataNode({
  state, selected, onSelect, productionById, glowId,
}: {
  state: LayoutNode; selected: boolean; onSelect: (id: string) => void;
  productionById: ProductionMap; glowId: string;
}) {
  const st  = getStateStatus(state, productionById);
  const pal = PALETTE[st];
  const { x, y, width: W, height: H } = state;
  const R = 8; // corner radius

  const shownItems = state.items.slice(0, MAX_ITEMS_VISIBLE);
  const overflow   = state.items.length - shownItems.length;

  return (
    <g data-node onClick={() => onSelect(state.id)} style={{ cursor:"pointer" }}
      role="button" aria-label={`Estado I${state.id}`}>

      {/* Selection glow */}
      {selected && (
        <rect x={x-4} y={y-4} width={W+8} height={H+8} rx={R+3}
          fill={pal.glow} filter={`url(#${glowId})`} opacity={0.7}
        />
      )}

      {/* Card shadow */}
      <rect x={x+2} y={y+3} width={W} height={H} rx={R}
        fill="rgba(0,0,0,.45)" />

      {/* Card body */}
      <rect x={x} y={y} width={W} height={H} rx={R}
        fill={pal.bodyBg}
        stroke={selected ? pal.headerBorder : pal.bodyBorder}
        strokeWidth={selected ? 1.8 : 1}
      />

      {/* Header bg */}
      <clipPath id={`clip-h-${state.id}`}>
        <rect x={x} y={y} width={W} height={CARD_H_BASE} rx={R} />
      </clipPath>
      <rect x={x} y={y} width={W} height={CARD_H_BASE}
        fill={pal.headerBg}
        clipPath={`url(#clip-h-${state.id})`}
      />
      {/* Bottom edge of header */}
      <line x1={x} y1={y+CARD_H_BASE} x2={x+W} y2={y+CARD_H_BASE}
        stroke={pal.bodyBorder} strokeWidth="0.8" />

      {/* Accept double border */}
      {st === "accept" && (
        <rect x={x+3} y={y+3} width={W-6} height={CARD_H_BASE-6} rx={R-2}
          fill="none" stroke={pal.headerBorder} strokeWidth="0.8" opacity={0.5} />
      )}

      {/* State ID */}
      <text x={x+12} y={y + CARD_H_BASE/2 - 5}
        fill={pal.titleColor} fontFamily="Fira Code, monospace" fontSize="13" fontWeight="800"
        dominantBaseline="middle">
        I{state.id}
      </text>

      {/* Status badge */}
      <rect x={x+W-62} y={y+10} width={50} height={15} rx={4}
        fill={pal.badge} />
      <text x={x+W-37} y={y+17.5}
        fill={pal.mutedColor} fontFamily="Fira Code, monospace" fontSize="8" fontWeight="700"
        textAnchor="middle" dominantBaseline="middle" letterSpacing="0.8">
        {STATUS_LABELS[st].toUpperCase()}
      </text>

      {/* Items count */}
      <text x={x+12} y={y + CARD_H_BASE - 9}
        fill={pal.mutedColor} fontFamily="Fira Code, monospace" fontSize="8">
        {state.items.length} ítem{state.items.length !== 1 ? "s" : ""}
        {state.conflicts.length > 0 ? ` · ⚠ ${state.conflicts.length} conflicto${state.conflicts.length !== 1 ? "s" : ""}` : ""}
      </text>

      {/* Item rows */}
      {shownItems.map((item, i) => {
        const isRed = isReduceItem(item, productionById);
        const isAcc = isAcceptItem(item, productionById);
        const rowY  = y + CARD_H_BASE + CARD_PAD_V + i * ITEM_H;
        const text  = formatItem(item, productionById);
        const dotIdx = text.indexOf("·");

        return (
          <g key={i}>
            {/* Row bg on hover-like states */}
            <rect x={x+6} y={rowY} width={W-12} height={ITEM_H - 2} rx={3}
              fill={isAcc ? "rgba(52,211,153,.08)" : isRed ? "rgba(251,191,36,.07)" : pal.itemBg}
              stroke={isAcc ? "rgba(52,211,153,.14)" : isRed ? "rgba(251,191,36,.12)" : pal.itemBorder}
              strokeWidth="0.7"
            />
            {/* Reduce marker */}
            {(isRed || isAcc) && (
              <text x={x+11} y={rowY + ITEM_H/2 - 1}
                fill={isAcc ? "#34d399" : "#fbbf24"} fontSize="7" dominantBaseline="middle">
                ▶
              </text>
            )}
            {/* Item text — split at dot for coloring */}
            <ItemText
              full={text} dotIdx={dotIdx}
              x={x + (isRed || isAcc ? 20 : 10)}
              y={rowY + ITEM_H/2 - 1}
              maxWidth={W - (isRed || isAcc ? 28 : 18)}
              color={isAcc ? "#34d399" : isRed ? "#fbbf24" : pal.mutedColor}
            />
          </g>
        );
      })}

      {/* Overflow indicator */}
      {overflow > 0 && (
        <text
          x={x + W/2} y={y + CARD_H_BASE + CARD_PAD_V + shownItems.length * ITEM_H + 10}
          textAnchor="middle" fill={pal.mutedColor}
          fontFamily="Fira Code, monospace" fontSize="8" fontStyle="italic">
          +{overflow} más…
        </text>
      )}
    </g>
  );
}

// Renders item text with the · dot highlighted
function ItemText({
  full, dotIdx, x, y, maxWidth, color,
}: {
  full: string; dotIdx: number; x: number; y: number; maxWidth: number; color: string;
}) {
  const FONT_SIZE = 9;
  // Truncate if too long (rough estimate: ~6px per char)
  const maxChars  = Math.floor(maxWidth / (FONT_SIZE * 0.58));
  const truncated = full.length > maxChars ? full.slice(0, maxChars - 1) + "…" : full;

  if (dotIdx < 0 || dotIdx >= truncated.length) {
    return (
      <text x={x} y={y} fill={color} fontFamily="Fira Code, monospace"
        fontSize={FONT_SIZE} dominantBaseline="middle">
        {truncated}
      </text>
    );
  }

  const before = truncated.slice(0, dotIdx);
  const dot    = "·";
  const after  = truncated.slice(dotIdx + 1);
  const approxCharW = FONT_SIZE * 0.6;

  return (
    <text y={y} fontFamily="Fira Code, monospace" fontSize={FONT_SIZE} dominantBaseline="middle">
      <tspan x={x} fill={color}>{before}</tspan>
      <tspan fill="#c084fc" fontWeight="900" fontSize={FONT_SIZE + 1}>{dot}</tspan>
      <tspan fill={color}>{after.slice(0, Math.max(0, maxChars - before.length - 3))}</tspan>
    </text>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EDGE LABEL
// ═══════════════════════════════════════════════════════════════════════════

function EdgeLabel({ symbol, x, y, status }: { symbol:string; x:number; y:number; status:NodeStatus }) {
  const isEps = symbol.split(", ").some(s => s === "ε" || s.toLowerCase() === "eps");
  const pal   = PALETTE[status];
  const bw    = Math.max(24, symbol.length * 6.2 + 12);
  return (
    <g>
      <rect x={x-bw/2} y={y-10} width={bw} height={20} rx={5}
        fill="rgba(5,8,20,.94)"
        stroke={isEps ? "rgba(52,211,153,.30)" : pal.bodyBorder}
        strokeWidth="1"
      />
      <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
        fill={isEps ? "rgba(52,211,153,.95)" : pal.titleColor}
        fontFamily="Fira Code, monospace" fontSize="9.5" fontWeight="700"
      >
        {symbol}
      </text>
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LEGEND
// ═══════════════════════════════════════════════════════════════════════════

function AutomataLegend() {
  const items: { label:string; status:NodeStatus; tip:string }[] = [
    { label:"Shift",     status:"normal",   tip:"Desplaza el símbolo" },
    { label:"Reduce",    status:"reduce",   tip:"Ítem completo" },
    { label:"Aceptar",   status:"accept",   tip:"Estado final" },
    { label:"Conflicto", status:"conflict", tip:"Ambigüedad detectada" },
  ];
  return (
    <div style={{
      padding:"7px 14px", borderTop:"1px solid var(--border)",
      display:"flex", gap:16, flexWrap:"wrap", background:"var(--bg2)", alignItems:"center",
    }}>
      <span style={{ fontSize:9, color:"var(--txt3)", textTransform:"uppercase", letterSpacing:1, fontWeight:700 }}>
        Leyenda
      </span>
      {items.map(it => {
        const pal = PALETTE[it.status];
        return (
          <div key={it.label} title={it.tip}
            style={{ display:"flex", alignItems:"center", gap:6, fontSize:10, color:"var(--txt2)" }}>
            <span style={{
              width:12, height:12, borderRadius:3, display:"inline-block",
              background: pal.headerBg, border:`1.5px solid ${pal.headerBorder}`,
            }} />
            {it.label}
          </div>
        );
      })}
      <span style={{ marginLeft:"auto", fontSize:9, color:"var(--txt3)" }}>
        Layout Sugiyama · Bézier cúbico
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SIDEBAR COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function StatsGrid({ states, transitions, items, conflicts }: {
  states:number; transitions:number; items:number; conflicts:number;
}) {
  const data = [
    { label:"Estados",      value:states,      icon:"⬡", warn:false },
    { label:"Transiciones", value:transitions, icon:"→", warn:false },
    { label:"Ítems",        value:items,        icon:"·", warn:false },
    { label:"Conflictos",   value:conflicts,    icon:"⚠", warn:conflicts>0 },
  ];
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
      {data.map(d => (
        <div key={d.label} style={{
          padding:"10px 12px", borderRadius:10, position:"relative", overflow:"hidden",
          border:     d.warn ? "1px solid rgba(251,191,36,.28)" : "1px solid var(--border)",
          background: d.warn
            ? "linear-gradient(135deg,rgba(251,191,36,.08),rgba(251,191,36,.02))"
            : "var(--bg2)",
        }}>
          <div style={{ position:"absolute", top:8, right:10, fontSize:16, opacity:.18,
            color:d.warn?"var(--amber)":"var(--txt3)" }}>{d.icon}</div>
          <div style={{ fontSize:9, color:"var(--txt3)", textTransform:"uppercase",
            letterSpacing:1, fontWeight:700 }}>{d.label}</div>
          <div style={{ marginTop:5, fontFamily:"var(--mono)", fontSize:22, fontWeight:800,
            lineHeight:1, color:d.warn?"var(--amber)":"var(--txt0)" }}>{d.value}</div>
        </div>
      ))}
    </div>
  );
}

function StateInspector({ state, productionById }: { state:GraphState; productionById:ProductionMap }) {
  const st  = getStateStatus(state, productionById);
  const pal = PALETTE[st];
  const rc  = state.items.filter(it => isReduceItem(it, productionById)).length;

  return (
    <section style={{
      background:"var(--bg2)", border:`1px solid ${pal.bodyBorder}`,
      borderRadius:10, overflow:"hidden", flexShrink:0,
    }}>
      <div style={{
        padding:"10px 12px", background:pal.headerBg, borderBottom:`1px solid ${pal.bodyBorder}`,
        display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <div>
          <div style={{ fontSize:9, color:pal.mutedColor, textTransform:"uppercase",
            letterSpacing:1, fontWeight:700 }}>Estado seleccionado</div>
          <div style={{ fontFamily:"var(--mono)", fontSize:22, fontWeight:800,
            color:pal.titleColor, lineHeight:1.1, marginTop:2 }}>I{state.id}</div>
        </div>
        <span style={{
          fontSize:9, fontWeight:700, letterSpacing:1, textTransform:"uppercase",
          padding:"3px 8px", borderRadius:99, background:pal.badge, color:pal.titleColor,
          border:`1px solid ${pal.bodyBorder}`,
        }}>
          {STATUS_LABELS[st]}
        </span>
      </div>
      <div style={{ padding:"7px 12px", display:"flex", gap:5, flexWrap:"wrap",
        borderBottom:"1px solid var(--border)" }}>
        <span className="badge b-blue">{state.items.length} ítems</span>
        {rc > 0 && <span className="badge b-amber">{rc} reduce</span>}
        {state.conflicts.length > 0 && (
          <span className="badge b-amber">
            {state.conflicts.length} conflicto{state.conflicts.length!==1?"s":""}
          </span>
        )}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:4,
        maxHeight:200, overflowY:"auto", padding:"9px 10px" }}>
        {state.items.length ? state.items.map((item, i) => {
          const red = isReduceItem(item, productionById);
          return (
            <div key={i} style={{
              padding:"5px 9px", borderRadius:7, display:"flex", gap:6,
              border:     red ? "1px solid rgba(251,191,36,.22)" : "1px solid rgba(99,102,241,.12)",
              background: red ? "rgba(251,191,36,.06)" : "rgba(99,102,241,.04)",
              fontFamily:"var(--mono)", fontSize:11, lineHeight:1.6,
              color: red ? "var(--amber)" : "var(--txt1)",
            }}>
              {red && <span style={{ fontSize:8, opacity:.7, flexShrink:0, marginTop:2 }}>▶</span>}
              <FormattedItem value={formatItem(item, productionById)} />
            </div>
          );
        }) : (
          <p style={{ fontSize:12, color:"var(--txt3)", margin:0, lineHeight:1.6 }}>
            Sin ítems expuestos.
          </p>
        )}
      </div>
    </section>
  );
}

function StateQuickList({ states, allCount, selectedId, onSelect, productionById, search, onSearch }: {
  states:GraphState[]; allCount:number; selectedId:string|null;
  onSelect:(id:string)=>void; productionById:ProductionMap;
  search:string; onSearch:(q:string)=>void;
}) {
  return (
    <section style={{
      background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:10,
      overflow:"hidden", display:"flex", flexDirection:"column", flex:1, minHeight:0,
    }}>
      <div style={{
        padding:"9px 12px", borderBottom:"1px solid var(--border)",
        display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <span style={{ fontSize:10, fontWeight:700, color:"var(--txt2)",
          textTransform:"uppercase", letterSpacing:1 }}>Estados</span>
        <span style={{ fontSize:10, color:"var(--txt3)", fontFamily:"var(--mono)" }}>
          {states.length}/{allCount}
        </span>
      </div>
      <div style={{ padding:"7px 10px", borderBottom:"1px solid var(--border)" }}>
        <div style={{
          display:"flex", alignItems:"center", gap:6,
          background:"var(--bg1)", border:"1px solid var(--border)",
          borderRadius:7, padding:"4px 9px",
        }}>
          <span style={{ color:"var(--txt3)", fontSize:12 }}>⌕</span>
          <input type="text" value={search} onChange={e => onSearch(e.target.value)}
            placeholder="Buscar estado o ítem…"
            style={{ flex:1, background:"transparent", border:"none", outline:"none",
              fontSize:11, color:"var(--txt0)", fontFamily:"var(--mono)" }} />
          {search && (
            <button type="button" onClick={() => onSearch("")}
              style={{ background:"transparent", border:"none", cursor:"pointer",
                color:"var(--txt3)", fontSize:13, padding:0 }}>×</button>
          )}
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(50px,1fr))",
        gap:5, padding:10, overflowY:"auto", flex:1 }}>
        {states.map(s => {
          const st  = getStateStatus(s, productionById);
          const pal = PALETTE[st];
          const act = selectedId === s.id;
          return (
            <button key={s.id} type="button" onClick={() => onSelect(s.id)}
              title={`I${s.id} — ${STATUS_LABELS[st]}`}
              style={{
                border:      act ? `1.5px solid ${pal.headerBorder}` : "1px solid var(--border)",
                borderRadius:8, padding:"7px 4px",
                background:  act ? pal.headerBg : "var(--bg3)",
                color:       act ? pal.titleColor : "var(--txt2)",
                fontFamily:"var(--mono)", fontSize:11, fontWeight:800,
                cursor:"pointer", position:"relative", overflow:"hidden",
                transition:"all .12s ease",
              }}>
              {act && <span style={{ position:"absolute", bottom:0, left:0, right:0,
                height:2, background:pal.titleColor }} />}
              I{s.id}
            </button>
          );
        })}
        {states.length === 0 && (
          <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"14px 0",
            fontSize:11, color:"var(--txt3)" }}>
            Sin resultados para "{search}"
          </div>
        )}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PANEL SHELL COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function AutomataShell({ children }: { children:ReactNode }) {
  return (
    <div className="module" style={{
      display:"flex", flexDirection:"column", flex:1,
      overflowY:"auto", padding:16, gap:12,
    }}>
      {children}
    </div>
  );
}

function EmptyState({ icon="◈", title, description, compact=false }: {
  icon?:string; title:string; description:ReactNode; compact?:boolean;
}) {
  return (
    <div style={{ minHeight:compact?110:240, display:"flex", alignItems:"center",
      justifyContent:"center", textAlign:"center" }}>
      <div style={{
        maxWidth:420, padding:compact?"14px 20px":"26px 32px",
        border:"1px dashed rgba(99,102,241,.22)", borderRadius:12,
        background:"rgba(99,102,241,.04)",
      }}>
        <div style={{ fontSize:compact?18:28, color:"rgba(99,102,241,.35)", marginBottom:8 }}>
          {icon}
        </div>
        <div style={{ marginBottom:6, fontSize:11, fontWeight:800, letterSpacing:1,
          textTransform:"uppercase", color:"var(--accent)" }}>{title}</div>
        <p style={{ fontSize:12, lineHeight:1.7, color:"var(--txt3)", margin:0 }}>{description}</p>
      </div>
    </div>
  );
}

function FormattedItem({ value }: { value:string }) {
  const parts = value.split("·");
  if (parts.length === 1) {
    const m = value.match(/^(.+?)(\s+\{.+\})$/);
    if (m) return <><span>{m[1]}</span><span style={{ color:"rgba(99,102,241,.7)", fontSize:"0.9em" }}>{m[2]}</span></>;
    return <>{value}</>;
  }
  return (
    <>
      {parts[0]}
      <span style={{ color:"#c084fc", fontWeight:900, fontSize:"1.1em" }}>·</span>
      {parts.slice(1).join("·")}
    </>
  );
}

function PanelGroup({ label, cols, children }: { label:string; cols:number; children:ReactNode }) {
  return (
    <div>
      <div style={{ fontSize:9, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase",
        color:"var(--txt3)", marginBottom:6, paddingLeft:2 }}>
        {label}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols},1fr)`, gap:8 }}>
        {children}
      </div>
    </div>
  );
}

function PanelTab({ panel, active, available, onSelect }: {
  panel:PanelDef; active:boolean; available:boolean; onSelect:(id:AutomataPanelId)=>void;
}) {
  return (
    <button type="button" onClick={() => onSelect(panel.id)} disabled={!available}
      style={{
        position:"relative", padding:"12px 14px", textAlign:"left", borderRadius:10,
        border:     active ? "1.5px solid rgba(99,102,241,.65)" : "1px solid var(--border)",
        background: active
          ? "linear-gradient(135deg,rgba(99,102,241,.16),rgba(99,102,241,.05))"
          : "var(--bg2)",
        cursor:  available ? "pointer" : "not-allowed",
        opacity: available ? 1 : 0.4,
        overflow:"hidden", transition:"all .15s ease",
      }}>
      {active && <span style={{ position:"absolute",inset:0,
        background:"linear-gradient(135deg,rgba(99,102,241,.07),transparent)",pointerEvents:"none" }} />}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5 }}>
        <span style={{ fontFamily:"var(--mono)", fontSize:14, fontWeight:800,
          color:active?"#a5b4fc":"var(--txt0)", letterSpacing:"-.3px" }}>
          {panel.shortLabel}
        </span>
        <span style={{
          fontSize:9, fontWeight:700, letterSpacing:1, textTransform:"uppercase",
          padding:"2px 7px", borderRadius:99,
          background:active?"rgba(99,102,241,.22)":"var(--bg3)",
          color:active?"#a5b4fc":"var(--txt3)",
          border:`1px solid ${active?"rgba(99,102,241,.28)":"var(--border)"}`,
        }}>
          {panel.badge}
        </span>
      </div>
      <span style={{ fontSize:10, color:"var(--txt3)", lineHeight:1.5, display:"block" }}>
        {panel.description}
      </span>
      <span style={{
        position:"absolute", bottom:0, left:0, height:2, width:"100%",
        background:active?"linear-gradient(90deg,rgba(99,102,241,.8),rgba(99,102,241,.1))":"transparent",
        transition:"all .15s ease",
      }} />
    </button>
  );
}

function ZoomBar({ viewport, setViewport }: { viewport:Viewport; setViewport:(v:Viewport)=>void }) {
  const zoom = (delta: number) =>
    setViewport({ ...viewport, scale:Math.max(0.08, Math.min(4, viewport.scale + delta)) });
  return (
    <div style={{ display:"flex", alignItems:"center", gap:2, background:"var(--bg2)",
      border:"1px solid var(--border)", borderRadius:7, padding:"2px 4px" }}>
      <button type="button" onClick={() => zoom(-0.12)}
        style={{ width:22, height:22, borderRadius:5, border:"none", background:"transparent",
          cursor:"pointer", color:"var(--txt2)", fontSize:14, lineHeight:"1",
          display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
      <span style={{ fontSize:9, color:"var(--txt2)", minWidth:34, textAlign:"center",
        fontFamily:"var(--mono)" }}>
        {Math.round(viewport.scale * 100)}%
      </span>
      <button type="button" onClick={() => zoom(+0.12)}
        style={{ width:22, height:22, borderRadius:5, border:"none", background:"transparent",
          cursor:"pointer", color:"var(--txt2)", fontSize:14, lineHeight:"1",
          display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
    </div>
  );
}

function SmallBtn({ onClick, title, children }: { onClick:()=>void; title:string; children:ReactNode }) {
  return (
    <button type="button" onClick={onClick} title={title}
      style={{ padding:"4px 10px", borderRadius:7, border:"1px solid var(--border)",
        background:"var(--bg2)", color:"var(--txt2)", fontSize:11, cursor:"pointer" }}>
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA EXTRACTION  (original logic preserved exactly)
// ═══════════════════════════════════════════════════════════════════════════

function getAutomatonByPanel(result: AutomataStudioResult | null, panel: AutomataPanelId): unknown {
  if (!result) return undefined;
  if (panel === "afn")   return result.afn;
  if (panel === "afd")   return result.afd;
  if (panel === "lr0")   return result.lr0Automaton;
  if (panel === "lr1")   return result.lr1?.automaton;
  return result.lalr1?.automaton;
}

function getPanelLabel(panel: AutomataPanelId) {
  return AUTOMATA_PANELS.find(p => p.id === panel)?.label ?? "Autómata";
}

function extractStates(automaton: unknown): GraphState[] {
  const r = asRecord(automaton);
  const raw = getArray(r.states) ?? getArray(r.canonicalCollection) ?? getArray(r.collection) ?? [];
  return raw.map((rs, i) => ({
    id:        getStateId(rs, i),
    raw:       rs,
    items:     getArray(asRecord(rs).items) ?? [],
    conflicts: getArray(asRecord(rs).conflicts) ?? [],
  }));
}

function extractEdges(automaton: unknown, states: GraphState[]): GraphEdge[] {
  const all: GraphEdge[] = [];
  for (const s of states) all.push(...extractStateEdges(s));
  all.push(...extractGlobalEdges(automaton));
  const valid  = new Set(states.map(s => s.id));
  const unique = new Map<string, GraphEdge>();
  for (const e of all) {
    if (!valid.has(e.from) || !valid.has(e.to)) continue;
    unique.set(`${e.from}→${e.to}∥${e.symbol}`, e);
  }
  return [...unique.values()];
}

function extractStateEdges(state: GraphState): GraphEdge[] {
  const transitions = asRecord(state.raw).transitions;
  const edges: GraphEdge[] = [];
  if (transitions instanceof Map) {
    for (const [sym, tgt] of transitions.entries())
      edges.push({ from:state.id, to:normalizeStateId(tgt), symbol:formatGrammarSymbol(sym) });
    return edges;
  }
  if (Array.isArray(transitions)) {
    for (const t of transitions) { const p = parseTransition(t, state.id); if (p) edges.push(p); }
    return edges;
  }
  if (isObject(transitions)) {
    for (const [sym, tgt] of Object.entries(transitions)) {
      const r = asRecord(tgt);
      edges.push({ from:state.id, to:normalizeStateId(r.to ?? r.target ?? r.state ?? r.stateId ?? tgt), symbol:sym });
    }
  }
  return edges;
}

function extractGlobalEdges(automaton: unknown): GraphEdge[] {
  const r = asRecord(automaton);
  const raw = getArray(r.transitions) ?? getArray(r.edges) ?? [];
  return raw.map(e => parseTransition(e)).filter((e): e is GraphEdge => Boolean(e));
}

function parseTransition(t: unknown, fallback?: string): GraphEdge | null {
  if (Array.isArray(t)) {
    const [sym, tgt] = t;
    if (!fallback || tgt === undefined) return null;
    return { from:fallback, to:normalizeStateId(tgt), symbol:formatGrammarSymbol(sym) };
  }
  const r   = asRecord(t);
  const from = r.from ?? r.source ?? r.sourceState ?? r.sourceStateId ?? fallback;
  const to   = r.to   ?? r.target ?? r.targetState ?? r.targetStateId ?? r.next ?? r.nextState;
  const sym  = r.symbol ?? r.label ?? r.on ?? r.grammarSymbol ?? r.transitionSymbol;
  if (from === undefined || to === undefined || sym === undefined) return null;
  return { from:normalizeStateId(from), to:normalizeStateId(to), symbol:formatGrammarSymbol(sym) };
}

function getConflictCount(result: AutomataStudioResult | null, panel: AutomataPanelId, states: GraphState[]): number {
  if (!result) return 0;
  const tr = panel === "lr0" ? result.lr0 : panel === "lr1" ? result.lr1 : result.lalr1;
  const tc = getArray(asRecord(tr).conflicts);
  return tc ? tc.length : states.reduce((t, s) => t + s.conflicts.length, 0);
}

function getStateStatus(state: GraphState, pm: ProductionMap): NodeStatus {
  if (state.conflicts.length > 0) return "conflict";
  const r = asRecord(state.raw);
  if (r.isAccepting===true || r.accept===true || r.accepting===true ||
      state.items.some(i => isAcceptItem(i, pm))) return "accept";
  if (state.items.some(i => isReduceItem(i, pm))) return "reduce";
  return "normal";
}

function getItemProduction(item: unknown, pm: ProductionMap): Production | null {
  const r  = asRecord(item);
  const dp = r.production ?? r.prod;
  if (isProductionLike(dp)) return dp;
  const pid = r.productionId ?? r.prodId ?? r.productionID ?? r.idProduction;
  if (pid !== undefined) return pm.get(String(pid)) ?? null;
  return null;
}

function getItemDot(item: unknown): number {
  const r = asRecord(item);
  return getNumber(r.dot) ?? getNumber(r.dotPosition) ?? getNumber(r.position) ?? getNumber(r.cursor) ?? 0;
}

function isReduceItem(item: unknown, pm: ProductionMap): boolean {
  const r = asRecord(item);
  if (r.isComplete===true || r.complete===true) return true;
  const p = getItemProduction(item, pm);
  if (!p) return false;
  return getItemDot(item) >= getEffectiveRight(p.right).length;
}

function isProductionLike(v: unknown): v is Production {
  const r = asRecord(v);
  return typeof r.id==="string" && typeof r.left==="string" &&
    Array.isArray(r.right) && typeof r.raw==="string";
}

function isAcceptItem(item: unknown, pm: ProductionMap): boolean {
  const p = getItemProduction(item, pm);
  if (!p) return false;
  return String(p.left).endsWith("'") && getItemDot(item) >= getEffectiveRight(p.right).length;
}

function formatItem(item: unknown, pm: ProductionMap): string {
  if (typeof item === "string") return item;
  const p = getItemProduction(item, pm);
  if (!p) { try { return JSON.stringify(item); } catch { return String(item); } }
  const left  = String(p.left);
  const right = getEffectiveRight(p.right);
  const dot   = getItemDot(item);
  const vis   = right.length > 0 ? [...right] : ["ε"];
  vis.splice(right.length === 0 ? 0 : Math.max(0, Math.min(dot, vis.length)), 0, "·");
  return `${left} → ${vis.join(" ")}${formatLookahead(item)}`;
}

function getEffectiveRight(right: unknown): string[] {
  if (!Array.isArray(right)) return [];
  return right.map(String).filter(s => {
    const n = s.trim().toLowerCase();
    return n !== "" && n !== "ε" && n !== "eps" && n !== "epsilon";
  });
}

function formatLookahead(item: unknown): string {
  const r   = asRecord(item);
  const raw = r.lookahead ?? r.lookaheads ?? r.lookAhead ?? r.lookAheads;
  if (raw == null) return "";
  if (Array.isArray(raw)) return `    { ${raw.map(String).join(", ")} }`;
  if (raw instanceof Set)  return `    { ${[...raw].map(String).join(", ")} }`;
  return `    { ${String(raw)} }`;
}

function formatGrammarSymbol(v: unknown): string {
  if (typeof v === "string" || typeof v === "number") return String(v);
  const r = asRecord(v);
  return String(r.name ?? r.value ?? r.symbol ?? r.id ?? r.label ?? "?");
}

function getStateId(state: unknown, i: number): string {
  return normalizeStateId(asRecord(state).id ?? asRecord(state).stateId ?? i);
}

function normalizeStateId(v: unknown): string {
  if (typeof v === "number" || typeof v === "string") return String(v);
  const r = asRecord(v);
  if (typeof r.id==="number"||typeof r.id==="string") return String(r.id);
  if (typeof r.stateId==="number"||typeof r.stateId==="string") return String(r.stateId);
  return String(v);
}

function getNumber(v: unknown): number | null { return typeof v==="number" && isFinite(v) ? v : null; }
function getArray(v: unknown): unknown[] | null { return Array.isArray(v) ? v : null; }
function asRecord(v: unknown): Record<string,unknown> { return isObject(v) ? (v as Record<string,unknown>) : {}; }
function isObject(v: unknown): v is object { return v !== null && typeof v === "object"; }