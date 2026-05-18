"use client";

import {
  useMemo, useRef, useState, useCallback, useEffect, type ReactNode,
} from "react";
import * as THREE from "three";

import type {
  Grammar, LR0Automaton, LR0TableResult, LR1TableResult, LALR1TableResult,
} from "@/src/parser-engine";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type AutomataPanelId = "afn" | "afd" | "lr0" | "lr1" | "lalr1";
type ViewMode        = "graph" | "table" | "tree" | "3d";

type AutomataStudioResult = {
  grammar?: Grammar;
  lr0Automaton?: LR0Automaton;
  lr0?: LR0TableResult;
  lr1?: LR1TableResult;
  lalr1?: LALR1TableResult;
  afn?: unknown;
  afd?: unknown;
};

type AutomataStudioPanelProps = { result: AutomataStudioResult | null };

type GraphState = {
  id: string; raw: unknown; items: unknown[]; conflicts: unknown[];
};
type GraphEdge = { from: string; to: string; symbol: string };
type LayoutNode = GraphState & { x: number; y: number; layer: number; order: number };
type RoutedEdge = GraphEdge & {
  x1:number; y1:number; cx1:number; cy1:number;
  cx2:number; cy2:number; x2:number; y2:number;
  labelX:number; labelY:number;
  isSelfLoop:boolean; selfLoopIndex:number;
};
type NodeStatus   = "normal" | "reduce" | "accept" | "conflict";
type Production   = Grammar["productions"][number];
type ProductionMap = Map<string, Production>;
type Viewport     = { x:number; y:number; scale:number };

type TransitionTable = {
  symbols: string[];
  rows: Array<{ state: GraphState; cells: Map<string, string[]> }>;
};
type TreeNode = {
  state: GraphState; symbol: string; depth: number;
  children: TreeNode[]; isBackEdge: boolean;
};

// ═══════════════════════════════════════════════════════════════════════════
// PANEL DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

type PanelDef = {
  id: AutomataPanelId; label: string; shortLabel: string;
  description: string; badge: string; group: "finite" | "lr";
};
const AUTOMATA_PANELS: PanelDef[] = [
  { id:"afn",   label:"AFN-ε",   shortLabel:"AFN-ε",   description:"Autómata finito no determinista con transiciones épsilon.", badge:"No-det", group:"finite" },
  { id:"afd",   label:"AFD",     shortLabel:"AFD",     description:"Autómata finito determinista (subconjuntos del AFN-ε).",    badge:"Det",    group:"finite" },
  { id:"lr0",   label:"LR(0)",   shortLabel:"LR(0)",   description:"Colección canónica de ítems LR(0).",                        badge:"Básico", group:"lr"     },
  { id:"lr1",   label:"LR(1)",   shortLabel:"LR(1)",   description:"Estados con lookaheads explícitos.",                        badge:"Potente",group:"lr"     },
  { id:"lalr1", label:"LALR(1)", shortLabel:"LALR(1)", description:"Estados LR(1) fusionados por núcleo.",                      badge:"Óptimo", group:"lr"     },
];

const VISIBLE_AUTOMATA_PANELS = AUTOMATA_PANELS.filter(
  (panel) => panel.group === "lr"
);
// ═══════════════════════════════════════════════════════════════════════════
// PALETTE
// ═══════════════════════════════════════════════════════════════════════════

const PALETTE: Record<NodeStatus, {
  fill:string; stroke:string; strokeA:string; text:string;
  muted:string; glow:string; edge:string; hex:number;
}> = {
  normal:   { fill:"rgba(99,102,241,.11)",  stroke:"#6366f1", strokeA:"rgba(99,102,241,.45)",  text:"#a5b4fc", muted:"rgba(165,180,252,.55)", glow:"rgba(99,102,241,.22)",  edge:"rgba(99,102,241,.45)",  hex:0x6366f1 },
  reduce:   { fill:"rgba(251,191,36,.09)",  stroke:"#f59e0b", strokeA:"rgba(251,191,36,.45)",  text:"#fbbf24", muted:"rgba(251,191,36,.60)",  glow:"rgba(251,191,36,.20)",  edge:"rgba(251,191,36,.42)",  hex:0xf59e0b },
  accept:   { fill:"rgba(52,211,153,.09)",  stroke:"#10b981", strokeA:"rgba(52,211,153,.48)",  text:"#34d399", muted:"rgba(52,211,153,.60)",  glow:"rgba(52,211,153,.22)",  edge:"rgba(52,211,153,.44)",  hex:0x10b981 },
  conflict: { fill:"rgba(248,113,113,.10)", stroke:"#ef4444", strokeA:"rgba(248,113,113,.48)", text:"#f87171", muted:"rgba(248,113,113,.60)", glow:"rgba(248,113,113,.20)", edge:"rgba(248,113,113,.44)", hex:0xef4444 },
};
function getStatusLabel(s: NodeStatus) {
  return {
    normal: "normal",
    reduce: "reduce",
    accept: "accept",
    conflict: "conflict"
  }[s];
}

function getBadgeClass(s: NodeStatus) {
  return {
    normal: "badge b-blue",
    reduce: "badge b-amber",
    accept: "badge b-green",
    conflict: "badge b-red"
  }[s];
}
// ═══════════════════════════════════════════════════════════════════════════
// 2D LAYOUT (Sugiyama)
// ═══════════════════════════════════════════════════════════════════════════

const NODE_R=30,X_GAP=200,Y_GAP=110,PAD_X=90,PAD_Y=80;

function sugiyamaLayout(states:GraphState[], edges:GraphEdge[]) {
  if (!states.length) return { nodes:[] as LayoutNode[], width:900, height:500 };
  const adj=new Map<string,Set<string>>(), pred=new Map<string,Set<string>>();
  for (const s of states) { adj.set(s.id,new Set()); pred.set(s.id,new Set()); }
  for (const e of edges) if (e.from!==e.to) { adj.get(e.from)?.add(e.to); pred.get(e.to)?.add(e.from); }
  const topo:string[]=[], seen=new Set<string>();
  function dfs(id:string) { if(seen.has(id))return; seen.add(id); for(const nb of adj.get(id)??[])dfs(nb); topo.unshift(id); }
  for (const s of states) dfs(s.id);
  const layer=new Map<string,number>();
  const startId=states.some(s=>s.id==="0")?"0":states[0]!.id;
  layer.set(startId,0);
  for (const id of topo) {
    if(!layer.has(id))layer.set(id,0);
    const cur=layer.get(id)!;
    for(const nb of adj.get(id)??[])if((layer.get(nb)??0)<=cur)layer.set(nb,cur+1);
  }
  let maxL=Math.max(0,...layer.values());
  for(const s of states)if(!layer.has(s.id))layer.set(s.id,++maxL);
  const layers=new Map<number,string[]>();
  for(const[id,l]of layer){if(!layers.has(l))layers.set(l,[]);layers.get(l)!.push(id);}
  for(const arr of layers.values())arr.sort((a,b)=>Number(a)-Number(b));
  const sortedLi=[...layers.keys()].sort((a,b)=>a-b);
  function baryPass(forward:boolean){
    const seq=forward?sortedLi:[...sortedLi].reverse();
    for(let i=1;i<seq.length;i++){
      const cur=layers.get(seq[i]!)!,prev=layers.get(seq[i-1]!)!;
      const pos=new Map(prev.map((id,j)=>[id,j]));
      const score=new Map<string,number>();
      for(const id of cur){
        const nbrs=(forward?[...(pred.get(id)??[])]:[ ...(adj.get(id)??[])]).filter(n=>pos.has(n));
        score.set(id,nbrs.length?nbrs.reduce((s,n)=>s+(pos.get(n)??0),0)/nbrs.length:prev.length/2);
      }
      cur.sort((a,b)=>(score.get(a)??0)-(score.get(b)??0));
    }
  }
  baryPass(true);baryPass(false);baryPass(true);
  const numL=sortedLi.length,maxPer=Math.max(1,...Array.from(layers.values()).map(a=>a.length));
  const width=PAD_X*2+(numL-1)*X_GAP,height=PAD_Y*2+(maxPer-1)*Y_GAP;
  const nm=new Map(states.map(s=>[s.id,s]));
  const nodes:LayoutNode[]=[];
  for(let li=0;li<sortedLi.length;li++){
    const lIdx=sortedLi[li]!,arr=layers.get(lIdx)!;
    const tot=(arr.length-1)*Y_GAP,sy=height/2-tot/2;
    for(let ni=0;ni<arr.length;ni++){const id=arr[ni]!;nodes.push({...nm.get(id)!,x:PAD_X+li*X_GAP,y:sy+ni*Y_GAP,layer:lIdx,order:ni});}
  }
  return{nodes,width:Math.max(900,width),height:Math.max(500,height)};
}

// ═══════════════════════════════════════════════════════════════════════════
// EDGE ROUTING (2D)
// ═══════════════════════════════════════════════════════════════════════════

function routeEdges(edges:GraphEdge[],posMap:Map<string,LayoutNode>):RoutedEdge[]{
  const merged=new Map<string,GraphEdge>();
  for(const e of edges){
    const key=`${e.from}→${e.to}`;
    if(merged.has(key)){const ex=merged.get(key)!;const set=new Set([...ex.symbol.split(", "),...e.symbol.split(", ")]);merged.set(key,{...ex,symbol:[...set].join(", ")});}
    else merged.set(key,{...e});
  }
  const list=[...merged.values()];
  const pairTotal=new Map<string,number>();
  for(const e of list){const k=[e.from,e.to].sort().join("↔");pairTotal.set(k,(pairTotal.get(k)??0)+1);}
  const pairIdx=new Map<string,number>(),loopCount=new Map<string,number>(),result:RoutedEdge[]=[];
  for(const e of list){
    const fn=posMap.get(e.from),tn=posMap.get(e.to);
    if(!fn||!tn)continue;
    if(e.from===e.to){
      const idx=loopCount.get(e.from)??0;loopCount.set(e.from,idx+1);
      result.push({...e,x1:0,y1:0,cx1:0,cy1:0,cx2:0,cy2:0,x2:0,y2:0,labelX:fn.x+68+idx*22,labelY:fn.y-58-idx*18,isSelfLoop:true,selfLoopIndex:idx});
      continue;
    }
    const pk=[e.from,e.to].sort().join("↔"),total=pairTotal.get(pk)??1,idx=pairIdx.get(pk)??0;
    pairIdx.set(pk,idx+1);
    const dx=tn.x-fn.x,dy=tn.y-fn.y,len=Math.hypot(dx,dy)||1;
    const ux=dx/len,uy=dy/len,nx=-uy,ny=ux;
    const offset=total>1?(idx-(total-1)/2)*24:0;
    const x1=fn.x+ux*NODE_R+nx*offset,y1=fn.y+uy*NODE_R+ny*offset;
    const x2=tn.x-ux*NODE_R+nx*offset,y2=tn.y-uy*NODE_R+ny*offset;
    const isBack=tn.layer<fn.layer,bowSign=isBack?-1:1,bowAmt=isBack?Math.min(80,Math.abs(fn.layer-tn.layer)*30):0;
    const mx=(x1+x2)/2+ny*bowAmt*bowSign+nx*Math.abs(offset)*.35;
    const my=(y1+y2)/2-nx*bowAmt*bowSign+ny*Math.abs(offset)*.35;
    const t=.28,cx1=x1+(mx-x1)*t*2.5,cy1=y1+(my-y1)*t*2.5,cx2=x2+(mx-x2)*t*2.5,cy2=y2+(my-y2)*t*2.5;
    const lx=.125*x1+.375*cx1+.375*cx2+.125*x2,ly=.125*y1+.375*cy1+.375*cy2+.125*y2;
    result.push({...e,x1,y1,cx1,cy1,cx2,cy2,x2,y2,labelX:lx,labelY:ly,isSelfLoop:false,selfLoopIndex:0});
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// TABLE & TREE BUILDERS
// ═══════════════════════════════════════════════════════════════════════════

function buildTransitionTable(states:GraphState[],edges:GraphEdge[]):TransitionTable{
  const symbolSet=new Set<string>();
  for(const e of edges)symbolSet.add(e.symbol);
  const symbols=[...symbolSet].sort((a,b)=>{
    if(a==="ε"||a.toLowerCase()==="eps")return -1;
    if(b==="ε"||b.toLowerCase()==="eps")return 1;
    return a.localeCompare(b);
  });
  const stateMap=new Map<string,Map<string,string[]>>();
  for(const s of states)stateMap.set(s.id,new Map());
  for(const e of edges){
    const row=stateMap.get(e.from);if(!row)continue;
    const existing=row.get(e.symbol)??[];if(!existing.includes(e.to))existing.push(e.to);
    row.set(e.symbol,existing);
  }
  return{symbols,rows:states.map(s=>({state:s,cells:stateMap.get(s.id)!}))};
}

function buildTree(states:GraphState[],edges:GraphEdge[],startId:string):TreeNode{
  const stateMap=new Map(states.map(s=>[s.id,s]));
  const visited=new Set<string>();
  function makeNode(id:string,symbol:string,depth:number):TreeNode{
    const state=stateMap.get(id)!;
    const isBack=visited.has(id);
    if(isBack||depth>40)return{state,symbol,depth,children:[],isBackEdge:true};
    visited.add(id);
    const children=edges.filter(e=>e.from===id).map(e=>makeNode(e.to,e.symbol,depth+1));
    visited.delete(id);
    return{state,symbol,depth,children,isBackEdge:false};
  }
  return makeNode(startId,"",0);
}

// ═══════════════════════════════════════════════════════════════════════════
// 3D LAYOUT  — layered cylinder
// ═══════════════════════════════════════════════════════════════════════════

type Layout3DNode = GraphState & { px:number; py:number; pz:number; layer:number };

function layout3D(states:GraphState[], edges:GraphEdge[]): Layout3DNode[] {
  if (!states.length) return [];

  // Reuse layer assignment from Sugiyama
  const adj=new Map<string,Set<string>>();
  for(const s of states) adj.set(s.id,new Set());
  for(const e of edges) if(e.from!==e.to) adj.get(e.from)?.add(e.to);

  const topo:string[]=[], seen=new Set<string>();
  function dfs(id:string){if(seen.has(id))return;seen.add(id);for(const nb of adj.get(id)??[])dfs(nb);topo.unshift(id);}
  for(const s of states)dfs(s.id);

  const layer=new Map<string,number>();
  const startId=states.some(s=>s.id==="0")?"0":states[0]!.id;
  layer.set(startId,0);
  for(const id of topo){
    if(!layer.has(id))layer.set(id,0);
    const cur=layer.get(id)!;
    for(const nb of adj.get(id)??[])if((layer.get(nb)??0)<=cur)layer.set(nb,cur+1);
  }
  let mx=Math.max(0,...layer.values());
  for(const s of states)if(!layer.has(s.id))layer.set(s.id,++mx);

  // Group by layer
  const layers=new Map<number,string[]>();
  for(const[id,l]of layer){if(!layers.has(l))layers.set(l,[]);layers.get(l)!.push(id);}

  const numLayers=layers.size;
  const totalDepth=(numLayers-1)*5.5;           // Z spread
  const nodeMap=new Map(states.map(s=>[s.id,s]));
  const result:Layout3DNode[]=[];
  const sortedLi=[...layers.keys()].sort((a,b)=>a-b);

  for(let li=0;li<sortedLi.length;li++){
    const lIdx=sortedLi[li]!;
    const arr=layers.get(lIdx)!;
    const count=arr.length;
    // Place nodes on a circle in the XY plane, each layer offset on Z
    // Radius scales with count so nodes don't overlap
    const radius=count===1?0:Math.max(2.2, count*0.9);
    const pz=-totalDepth/2+li*(totalDepth/Math.max(numLayers-1,1));

    for(let ni=0;ni<count;ni++){
      const id=arr[ni]!;
      const angle=(2*Math.PI/count)*ni - Math.PI/2;
      const px=count===1?0:radius*Math.cos(angle);
      const py=count===1?0:radius*Math.sin(angle);
      result.push({...nodeMap.get(id)!, px, py, pz, layer:lIdx});
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3D RENDERER COMPONENT (Three.js, manual OrbitControls)
// ═══════════════════════════════════════════════════════════════════════════

const NODE_3D_R = 0.42;

interface ThreeScene {
  renderer: THREE.WebGLRenderer;
  scene:    THREE.Scene;
  camera:   THREE.PerspectiveCamera;
  nodeMap:  Map<string, THREE.Mesh>;
  rafId:    number;
}

function Automata3DView({
  states, edges, selectedId, onSelect, productionById,
}: {
  states:GraphState[]; edges:GraphEdge[];
  selectedId:string|null; onSelect:(id:string)=>void;
  productionById:ProductionMap;
}) {
  const mountRef    = useRef<HTMLDivElement>(null);
  const sceneRef    = useRef<ThreeScene | null>(null);
  const orbitRef    = useRef({
    spherical: new THREE.Spherical(22, Math.PI/3, 0),
    isDragging:false, lastX:0, lastY:0,
    panOffset: new THREE.Vector3(),
    isPanning:false,
  });
  const labelContainerRef = useRef<HTMLDivElement>(null);

  const nodes3D = useMemo(()=>layout3D(states,edges),[states,edges]);
  const posMap3D = useMemo(()=>new Map(nodes3D.map(n=>[n.id,n])),[nodes3D]);

  // ── Build scene ──────────────────────────────────────────────────────────
  useEffect(()=>{
    const mount = mountRef.current;
    if(!mount) return;

    const W=mount.clientWidth||800, H=mount.clientHeight||500;

    // Renderer
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.setSize(W,H);
    renderer.setClearColor(0x000000,0);
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // Scene
    const scene=new THREE.Scene();
    scene.fog=new THREE.FogExp2(0x0a0e1a,0.018);

    // Camera
    const camera=new THREE.PerspectiveCamera(55,W/H,0.1,500);

    // Lights
    const ambient=new THREE.AmbientLight(0xffffff,0.35);
    scene.add(ambient);
    const dir=new THREE.DirectionalLight(0xffffff,0.9);
    dir.position.set(8,12,10); dir.castShadow=true; scene.add(dir);
    const rim=new THREE.DirectionalLight(0x6366f1,0.45);
    rim.position.set(-10,-5,-8); scene.add(rim);
    const pt=new THREE.PointLight(0xa5b4fc,0.6,60);
    pt.position.set(0,8,0); scene.add(pt);

    // ── Edges (TubeGeometry on CatmullRom curves) ────────────────────────
    const mergedEdges=new Map<string,GraphEdge>();
    for(const e of edges){
      const key=`${e.from}→${e.to}`;
      if(mergedEdges.has(key)){
        const ex=mergedEdges.get(key)!;
        const set=new Set([...ex.symbol.split(", "),...e.symbol.split(", ")]);
        mergedEdges.set(key,{...ex,symbol:[...set].join(", ")});
      } else mergedEdges.set(key,{...e});
    }

    // Count pairs for offset
    const pairCount=new Map<string,number>();
    for(const e of mergedEdges.values()){const k=[e.from,e.to].sort().join("↔");pairCount.set(k,(pairCount.get(k)??0)+1);}
    const pairIdx=new Map<string,number>();

    for(const e of mergedEdges.values()){
      const fn3=posMap3D.get(e.from), tn3=posMap3D.get(e.to);
      if(!fn3||!tn3)continue;

      const from3=new THREE.Vector3(fn3.px,fn3.py,fn3.pz);
      const to3  =new THREE.Vector3(tn3.px,tn3.py,tn3.pz);

      const tSt:NodeStatus=getStateStatus({id:tn3.id,raw:tn3.raw,items:tn3.items,conflicts:tn3.conflicts},productionById);
      const edgeColor=PALETTE[tSt].hex;

      // Perpendicular offset for bidirectional edges
      const pk=[e.from,e.to].sort().join("↔");
      const total=pairCount.get(pk)??1;
      const idx=pairIdx.get(pk)??0;
      pairIdx.set(pk,idx+1);
      const offset3=(total>1?(idx-(total-1)/2)*0.55:0);

      // Self-loop
      if(e.from===e.to){
        const center=from3.clone();
        const loopPts:THREE.Vector3[]=[];
        for(let t=0;t<=32;t++){
          const ang=(t/32)*Math.PI*2;
          loopPts.push(new THREE.Vector3(
            center.x+Math.cos(ang)*0.9,
            center.y+Math.sin(ang)*0.9,
            center.z+Math.sin(ang*2)*0.4
          ));
        }
        const loopCurve=new THREE.CatmullRomCurve3(loopPts,true);
        const loopTube=new THREE.TubeGeometry(loopCurve,48,0.03,6,true);
        const loopMat=new THREE.MeshStandardMaterial({color:edgeColor,emissive:edgeColor,emissiveIntensity:.3,transparent:true,opacity:.7});
        scene.add(new THREE.Mesh(loopTube,loopMat));
        continue;
      }

      // Mid-point with perpendicular bow in 3D
      const mid3=from3.clone().lerp(to3,0.5);
      // Perpendicular direction in XY plane
      const diff=to3.clone().sub(from3).normalize();
      const perp=new THREE.Vector3(-diff.y,diff.x,0).normalize();
      const bowing=new THREE.Vector3(0,0,1); // Z bow for backward edges
      const isBack=tn3.layer<fn3.layer;
      mid3.addScaledVector(perp, offset3);
      if(isBack) mid3.addScaledVector(bowing, -2.0);
      else       mid3.addScaledVector(bowing,  0.8);

      const curve=new THREE.CatmullRomCurve3([from3,mid3,to3]);
      const points=curve.getPoints(60);

      // Tube
      const tube=new THREE.TubeGeometry(curve,48,0.04,6,false);
      const mat=new THREE.MeshStandardMaterial({
        color:edgeColor, emissive:edgeColor, emissiveIntensity:.25,
        transparent:true, opacity:0.75, roughness:0.4, metalness:0.1,
      });
      scene.add(new THREE.Mesh(tube,mat));

      // Arrow head at end
      const direction=to3.clone().sub(points[points.length-2]!).normalize();
      const arrowLen=0.28;
      const arrowTip=to3.clone().sub(direction.clone().multiplyScalar(NODE_3D_R+0.02));
      const arrowBase=arrowTip.clone().sub(direction.clone().multiplyScalar(arrowLen));
      const arrowGeo=new THREE.CylinderGeometry(0,0.09,arrowLen,8);
      const arrowMesh=new THREE.Mesh(arrowGeo,new THREE.MeshStandardMaterial({color:edgeColor,emissive:edgeColor,emissiveIntensity:.4}));
      arrowMesh.position.copy(arrowBase.clone().lerp(arrowTip,0.5));
      arrowMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);
      scene.add(arrowMesh);
    }

    // ── Nodes (sphere + inner glow shell) ───────────────────────────────
    const nodeMap=new Map<string,THREE.Mesh>();
    const geoSphere=new THREE.SphereGeometry(NODE_3D_R,32,32);
    const geoInner =new THREE.SphereGeometry(NODE_3D_R*0.72,20,20);

    for(const n of nodes3D){
      const st=getStateStatus({id:n.id,raw:n.raw,items:n.items,conflicts:n.conflicts},productionById);
      const pal=PALETTE[st];

      // Outer shell – slightly transparent
      const outerMat=new THREE.MeshPhysicalMaterial({
        color:pal.hex, emissive:pal.hex, emissiveIntensity:0.18,
        transparent:true, opacity:0.88,
        roughness:0.22, metalness:0.45,
        clearcoat:0.6, clearcoatRoughness:0.1,
      });
      const sphere=new THREE.Mesh(geoSphere,outerMat);
      sphere.position.set(n.px,n.py,n.pz);
      sphere.castShadow=true;
      sphere.userData={stateId:n.id};
      scene.add(sphere);
      nodeMap.set(n.id,sphere);

      // Inner glow core
      const innerMat=new THREE.MeshBasicMaterial({color:pal.hex,transparent:true,opacity:0.25});
      const inner=new THREE.Mesh(geoInner,innerMat);
      inner.position.set(n.px,n.py,n.pz);
      scene.add(inner);

      // Accept double ring
      if(st==="accept"){
        const ringGeo=new THREE.TorusGeometry(NODE_3D_R*1.32,0.03,12,64);
        const ringMat=new THREE.MeshBasicMaterial({color:pal.hex,transparent:true,opacity:0.55});
        const ring=new THREE.Mesh(ringGeo,ringMat);
        ring.position.set(n.px,n.py,n.pz);
        scene.add(ring);
      }

      // Start indicator (arrow into initial state)
      if(n.id==="0"||n.id===nodes3D[0]?.id){
        const arrGeo=new THREE.ConeGeometry(0.1,0.5,8);
        const arrMesh=new THREE.Mesh(arrGeo,new THREE.MeshBasicMaterial({color:0xa5b4fc,transparent:true,opacity:0.7}));
        arrMesh.position.set(n.px-NODE_3D_R-0.65,n.py,n.pz);
        arrMesh.rotation.z=-Math.PI/2;
        scene.add(arrMesh);
      }
    }

    // ── Orbit camera position ────────────────────────────────────────────
    function updateCamera(){
      const orb=orbitRef.current;
      const pos=new THREE.Vector3().setFromSpherical(orb.spherical);
      camera.position.copy(pos.add(orb.panOffset));
      camera.lookAt(orb.panOffset);
    }
    updateCamera();

    // ── Raycasting ───────────────────────────────────────────────────────
    const raycaster=new THREE.Raycaster();
    const mouse=new THREE.Vector2();
    let clickStartX=0,clickStartY=0;

    function onMouseClick(ev:MouseEvent){
      const rect=mount.getBoundingClientRect();
      const dx=ev.clientX-clickStartX, dy=ev.clientY-clickStartY;
      if(Math.hypot(dx,dy)>5)return; // was a drag
      mouse.x=((ev.clientX-rect.left)/W)*2-1;
      mouse.y=-((ev.clientY-rect.top)/H)*2+1;
      raycaster.setFromCamera(mouse,camera);
      const hits=raycaster.intersectObjects([...nodeMap.values()]);
      if(hits.length>0){
        const id=hits[0]!.object.userData.stateId as string;
        if(id)onSelect(id);
      }
    }
    function onMouseDownClick(ev:MouseEvent){clickStartX=ev.clientX;clickStartY=ev.clientY;}
    mount.addEventListener("mousedown",onMouseDownClick);
    mount.addEventListener("click",onMouseClick);

    // ── Resize ───────────────────────────────────────────────────────────
    const ro=new ResizeObserver(()=>{
      const nw=mount.clientWidth,nh=mount.clientHeight;
      camera.aspect=nw/nh; camera.updateProjectionMatrix();
      renderer.setSize(nw,nh);
    });
    ro.observe(mount);

    // ── Animate ──────────────────────────────────────────────────────────
    let rafId=0;
    function animate(){
      rafId=requestAnimationFrame(animate);
      updateCamera();
      renderer.render(scene,camera);

      // Update HTML labels
      if(labelContainerRef.current){
        const lc=labelContainerRef.current;
        lc.innerHTML="";
        for(const n of nodes3D){
          const pos3=new THREE.Vector3(n.px,n.py,n.pz);
          const projected=pos3.project(camera);
          const cx=( projected.x+1)/2*W;
          const cy=(-projected.y+1)/2*H;
          if(projected.z>1)continue; // behind camera
          const st=getStateStatus({id:n.id,raw:n.raw,items:n.items,conflicts:n.conflicts},productionById);
          const pal=PALETTE[st];
          const isSel=n.id===selectedId;
          const div=document.createElement("div");
          div.style.cssText=`
            position:absolute;
            left:${cx}px; top:${cy}px;
            transform:translate(-50%,-200%);
            pointer-events:none;
            user-select:none;
            text-align:center;
          `;
          div.innerHTML=`
            <div style="
              font-family:'Fira Code',monospace;
              font-size:${isSel?13:11}px;
              font-weight:800;
              color:${pal.text};
              background:rgba(7,11,22,.85);
              border:1.5px solid ${isSel?pal.stroke:pal.strokeA.replace(/[^,]+\)$/,"0.35)")};
              border-radius:6px;
              padding:2px 9px;
              white-space:nowrap;
              box-shadow:0 2px 12px rgba(0,0,0,.5)${isSel?`,0 0 16px ${pal.glow}`:""}
            ">I${n.id}</div>
            <div style="
              font-size:8px;font-weight:700;letter-spacing:.8px;
              text-transform:uppercase;color:${pal.muted};margin-top:2px;
            ">${getStatusLabel(st)}</div>
          `;
          lc.appendChild(div);
        }
      }
    }
    animate();

    sceneRef.current={renderer,scene,camera,nodeMap,rafId};

    return ()=>{
      cancelAnimationFrame(rafId);
      ro.disconnect();
      mount.removeEventListener("mousedown",onMouseDownClick);
      mount.removeEventListener("click",onMouseClick);
      renderer.dispose();
      if(renderer.domElement.parentNode===mount) mount.removeChild(renderer.domElement);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[nodes3D,posMap3D,edges,productionById]);

  // ── Update selection highlight without rebuilding ─────────────────────
  useEffect(()=>{
    const sc=sceneRef.current;
    if(!sc)return;
    for(const[id,mesh]of sc.nodeMap){
      const st=getStateStatus(
        nodes3D.find(n=>n.id===id)??{id,raw:null,items:[],conflicts:[]},
        productionById
      );
      const pal=PALETTE[st];
      const mat=mesh.material as THREE.MeshPhysicalMaterial;
      const isSel=id===selectedId;
      mat.emissiveIntensity=isSel?0.75:0.18;
      mat.opacity=isSel?1:0.88;
      (mesh as THREE.Mesh).scale.setScalar(isSel?1.22:1);
    }
  },[selectedId,nodes3D,productionById]);

  // ── Mouse orbit (drag to rotate, right-drag to pan, scroll to zoom) ───
  useEffect(()=>{
    const mount=mountRef.current;
    if(!mount)return;

    function onDown(e:MouseEvent){
      const orb=orbitRef.current;
      if(e.button===2){orb.isPanning=true;}else{orb.isDragging=true;}
      orb.lastX=e.clientX; orb.lastY=e.clientY;
    }
    function onMove(e:MouseEvent){
      const orb=orbitRef.current;
      const dx=(e.clientX-orb.lastX)*0.006;
      const dy=(e.clientY-orb.lastY)*0.006;
      if(orb.isDragging){
        orb.spherical.theta-=dx;
        orb.spherical.phi  =Math.max(0.15,Math.min(Math.PI-0.15,orb.spherical.phi+dy));
      } else if(orb.isPanning){
        orb.panOffset.x-=dx*orb.spherical.radius*0.25;
        orb.panOffset.y+=dy*orb.spherical.radius*0.25;
      }
      orb.lastX=e.clientX; orb.lastY=e.clientY;
    }
    function onUp(){ const orb=orbitRef.current; orb.isDragging=false; orb.isPanning=false; }
    function onWheel(e:WheelEvent){
      e.preventDefault();
      orbitRef.current.spherical.radius=Math.max(3,Math.min(80,orbitRef.current.spherical.radius+e.deltaY*0.06));
    }
    function onCtxMenu(e:Event){ e.preventDefault(); }

    mount.addEventListener("mousedown",onDown);
    window.addEventListener("mousemove",onMove);
    window.addEventListener("mouseup",onUp);
    mount.addEventListener("wheel",onWheel,{passive:false});
    mount.addEventListener("contextmenu",onCtxMenu);
    return ()=>{
      mount.removeEventListener("mousedown",onDown);
      window.removeEventListener("mousemove",onMove);
      window.removeEventListener("mouseup",onUp);
      mount.removeEventListener("wheel",onWheel);
      mount.removeEventListener("contextmenu",onCtxMenu);
    };
  },[]);

  return (
    <div style={{ flex:1, position:"relative", overflow:"hidden", background:"transparent" }}>
      {/* Three.js canvas mount */}
      <div ref={mountRef} style={{ position:"absolute", inset:0 }} />

      {/* HTML labels overlay */}
      <div ref={labelContainerRef} style={{ position:"absolute", inset:0, pointerEvents:"none" }} />

      {/* Controls hint */}
      <div style={{
        position:"absolute", bottom:12, left:"50%", transform:"translateX(-50%)",
        display:"flex", gap:16, padding:"6px 16px",
        background:"rgba(7,11,22,.80)", backdropFilter:"blur(8px)",
        border:"1px solid rgba(99,102,241,.22)", borderRadius:99,
        fontSize:9, color:"var(--txt3)", letterSpacing:.5,
        userSelect:"none", pointerEvents:"none", whiteSpace:"nowrap",
      }}>
        <span>🖱 <strong style={{color:"var(--txt2)"}}>Arrastrar</strong> — rotar</span>
        <span>🖱 <strong style={{color:"var(--txt2)"}}>Click derecho</strong> — mover</span>
        <span>🖱 <strong style={{color:"var(--txt2)"}}>Scroll</strong> — zoom</span>
        <span>🖱 <strong style={{color:"var(--txt2)"}}>Click</strong> — seleccionar estado</span>
      </div>

      {/* Layer depth axis indicator */}
      <div style={{
        position:"absolute", top:12, left:14,
        display:"flex", flexDirection:"column", gap:4,
        padding:"8px 12px",
        background:"rgba(7,11,22,.75)", backdropFilter:"blur(6px)",
        border:"1px solid rgba(99,102,241,.18)", borderRadius:10,
        fontSize:9, color:"var(--txt3)",
      }}>
        <span style={{fontWeight:700,color:"var(--txt2)",letterSpacing:.5}}>Vista 3D</span>
        <span>Eje Z → capas del autómata</span>
        <span>Eje XY → estados por capa</span>
        <div style={{marginTop:4,display:"flex",gap:8,flexWrap:"wrap"}}>
          {(["normal","reduce","accept","conflict"] as NodeStatus[]).map(st=>(
            <div key={st} style={{display:"flex",alignItems:"center",gap:4,fontSize:8}}>
              <span style={{width:8,height:8,borderRadius:999,background:PALETTE[st].stroke,display:"inline-block"}}/>
              {getStatusLabel(st)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function AutomataStudioPanel({ result }: AutomataStudioPanelProps) {
  const [activePanel,     setActivePanel]     = useState<AutomataPanelId>("lr0");
  const [viewMode,        setViewMode]        = useState<ViewMode>("graph");
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [viewport,        setViewport]        = useState<Viewport>({x:0,y:0,scale:1});
 // const [searchQuery,     setSearchQuery]     = useState("");
  const [isDragging,      setIsDragging]      = useState(false);

  const wrapRef    = useRef<HTMLDivElement>(null);
  const dragOrigin = useRef<{mx:number;my:number;vx:number;vy:number}|null>(null);

  const automaton      = useMemo(()=>getAutomatonByPanel(result,activePanel),[result,activePanel]);
const productionById = useMemo<ProductionMap>(() => {
  const map = new Map<string, Production>();

  for (const p of result?.grammar?.productions ?? []) {
    map.set(String(p.id), p);
  }

  const start = result?.grammar?.startSymbol;

  if (start && !map.has("P0")) {
    map.set("P0", {
      id: "P0",
      left: `${start}'`,
      right: [start],
      raw: `${start}' -> ${start}`
    } as Production);
  }

  return map;
}, [result?.grammar]);

const conflictStateIds = useMemo(
  () => getConflictStateIds(result, activePanel),
  [result, activePanel]
);


const rawStates = useMemo(() => {
  const states = extractStates(automaton);

  if (conflictStateIds.size === 0) return states;

  return states.map((state) =>
    conflictStateIds.has(state.id)
      ? {
          ...state,
          conflicts:
            state.conflicts.length > 0
              ? state.conflicts
              : [{ source: "table-conflict" }]
        }
      : state
  );
}, [automaton, conflictStateIds]);

const rawEdges        = useMemo(()=>extractEdges(automaton,rawStates),[automaton,rawStates]);
  const layout          = useMemo(()=>sugiyamaLayout(rawStates,rawEdges),[rawStates,rawEdges]);
  const posMap          = useMemo(()=>new Map(layout.nodes.map(n=>[n.id,n])),[layout.nodes]);
  const routed          = useMemo(()=>routeEdges(rawEdges,posMap),[rawEdges,posMap]);
  const transitionTable = useMemo(()=>buildTransitionTable(rawStates,rawEdges),[rawStates,rawEdges]);
  const startId         = rawStates.some(s=>s.id==="0")?"0":rawStates[0]?.id??"";
  const treeRoot        = useMemo(()=>rawStates.length?buildTree(rawStates,rawEdges,startId):null,[rawStates,rawEdges,startId]);
  const conflictCount   = useMemo(()=>getConflictCount(result,activePanel,rawStates),[result,activePanel,rawStates]);
  const itemCount       = rawStates.reduce((t,s)=>t+s.items.length,0);

  /*
  const filteredStates = useMemo(()=>{
    const q=searchQuery.trim().toLowerCase();
    if(!q)return rawStates;
    return rawStates.filter(s=>s.id.includes(q)||s.items.some(item=>formatItem(item,productionById).toLowerCase().includes(q)));
  },[rawStates,searchQuery,productionById]);
*/
  const selectedState=rawStates.find(s=>s.id===selectedStateId)??rawStates[0];

  const handlePanelChange=useCallback((id:AutomataPanelId)=>{
    setActivePanel(id);setSelectedStateId(null);setViewport({x:0,y:0,scale:1});
  },[]);

  const fitToView=useCallback(()=>{
    if(!wrapRef.current||!layout.nodes.length){setViewport({x:0,y:0,scale:1});return;}
    const{clientWidth:w,clientHeight:h}=wrapRef.current;
    const s=Math.min(w/layout.width,h/layout.height,1)*.90;
    setViewport({x:(w-layout.width*s)/2,y:(h-layout.height*s)/2,scale:s});
  },[layout]);
  useEffect(()=>{if(viewMode==="graph")fitToView();},[fitToView,viewMode]);

  const handleWheel=useCallback((e:React.WheelEvent)=>{
    e.preventDefault();
    const rect=wrapRef.current!.getBoundingClientRect();
    const mx=e.clientX-rect.left,my=e.clientY-rect.top,d=e.deltaY<0?1.12:.9;
    setViewport(v=>{const ns=Math.max(.12,Math.min(4,v.scale*d));return{scale:ns,x:mx-(mx-v.x)*(ns/v.scale),y:my-(my-v.y)*(ns/v.scale)};});
  },[]);

  const handleMouseDown=useCallback((e:React.MouseEvent)=>{
    if((e.target as Element).closest("[data-node]"))return;
    dragOrigin.current={mx:e.clientX,my:e.clientY,vx:viewport.x,vy:viewport.y};setIsDragging(true);
  },[viewport]);
  const handleMouseMove=useCallback((e:React.MouseEvent)=>{
    if(!dragOrigin.current)return;
    const{mx,my,vx,vy}=dragOrigin.current;
    setViewport(v=>({...v,x:vx+e.clientX-mx,y:vy+e.clientY-my}));
  },[]);
  const stopDrag=useCallback(()=>{dragOrigin.current=null;setIsDragging(false);},[]);

  function handleExportSvg(){
    const svg=wrapRef.current?.querySelector("svg");if(!svg)return;
    const blob=new Blob([new XMLSerializer().serializeToString(svg)],{type:"image/svg+xml;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    Object.assign(document.createElement("a"),{href:url,download:`${activePanel}-automata.svg`}).click();
    URL.revokeObjectURL(url);
  }

  if(!result)return<AutomataShell><EmptyState icon="⬡" title="Sin análisis" description="Ejecuta una gramática válida para construir los autómatas."/></AutomataShell>;

  return(
    <AutomataShell>
      {/* Panel tabs */}
<div style={{display:"flex",flexDirection:"column",gap:8}}>
  <PanelGroup label="Analizadores LR — Bottom-Up" cols={3}>
    {VISIBLE_AUTOMATA_PANELS.map((panel) => (
      <PanelTab
        key={panel.id}
        panel={panel}
        active={activePanel === panel.id}
        available={Boolean(getAutomatonByPanel(result, panel.id))}
        onSelect={handlePanelChange}
      />
    ))}
  </PanelGroup>
</div>
      {!automaton?(
        <EmptyState icon="◈" title={`${getPanelLabel(activePanel)} no disponible`}
          description="Ejecuta el análisis con una gramática válida para generar este autómata."/>
      ):(

<div
  style={{
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) 288px",
    gap: 12,
    flex: "1 1 auto",
    minHeight: 0,
    overflow: "hidden",
    alignItems: "stretch"
  }}
>
<section style={CSS.canvasPanel}>
            {/* Header */}
            <div style={CSS.canvasHeader}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={CSS.iconBubble}>⬡</span>
                <div>
                  <div style={{fontSize:12,fontWeight:800,color:"var(--txt0)",letterSpacing:"-.2px"}}>{getPanelLabel(activePanel)}</div>
                  <div style={{fontSize:10,color:"var(--txt3)",marginTop:1}}>
                    {rawStates.length} estados · {rawEdges.length} transiciones · {itemCount} ítems
                  </div>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                {conflictCount>0
                  ?<span className="badge b-amber">⚠ {conflictCount} conflicto{conflictCount!==1?"s":""}</span>
                  :<span className="badge b-green">✓ Sin conflictos</span>}
                <ViewModeSwitcher current={viewMode} onChange={setViewMode}/>
                {viewMode==="graph"&&(
                  <><ZoomBar viewport={viewport} setViewport={setViewport}/>
                  <SmallBtn onClick={fitToView} title="Ajustar">⊡</SmallBtn>
                  <SmallBtn onClick={handleExportSvg} title="Exportar SVG">↓ SVG</SmallBtn></>
                )}
              </div>
            </div>

            {/* ── View area ─────────────────────────────────────────────── */}
            {viewMode==="graph"&&(
              <div ref={wrapRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
                onMouseUp={stopDrag} onMouseLeave={stopDrag} onWheel={handleWheel}
                style={{flex:1,overflow:"hidden",position:"relative",cursor:isDragging?"grabbing":"grab",
                  background:`radial-gradient(ellipse at 18% 18%,rgba(99,102,241,.06) 0%,transparent 52%),radial-gradient(ellipse at 82% 80%,rgba(52,211,153,.04) 0%,transparent 48%),var(--bg1)`}}>
                <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}>
                  <defs><pattern id="asgrid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r=".85" fill="rgba(99,102,241,.13)"/>
                  </pattern></defs>
                  <rect width="100%" height="100%" fill="url(#asgrid)"/>
                </svg>
                <div style={{position:"absolute",inset:0,transform:`translate(${viewport.x}px,${viewport.y}px) scale(${viewport.scale})`,transformOrigin:"0 0",willChange:"transform"}}>
                  <AutomataGraphSvg panelId={activePanel} nodes={layout.nodes} routed={routed}
                    width={layout.width} height={layout.height}
                    selectedStateId={selectedState?.id??null}
                    onSelectState={setSelectedStateId} productionById={productionById}/>
                </div>
                <div style={{position:"absolute",bottom:10,right:12,fontSize:9,color:"var(--txt3)",letterSpacing:.5,userSelect:"none",pointerEvents:"none"}}>
                  Scroll para zoom · Arrastra para mover
                </div>
              </div>
            )}

            {viewMode==="table"&&(
              <TransitionTableView table={transitionTable} states={rawStates}
                selectedId={selectedState?.id??null} onSelect={setSelectedStateId} productionById={productionById}/>
            )}

            {viewMode==="tree"&&(
              <TreeView root={treeRoot} states={rawStates}
                selectedId={selectedState?.id??null} onSelect={setSelectedStateId} productionById={productionById}/>
            )}

            {viewMode==="3d"&&(
              <Automata3DView states={rawStates} edges={rawEdges}
                selectedId={selectedState?.id??null} onSelect={setSelectedStateId} productionById={productionById}/>
            )}

            <AutomataLegend viewMode={viewMode}/>
          </section>

          {/* Sidebar */}
<aside
  style={{
    minWidth: 0,
    minHeight: 0,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    overflow: "hidden"
  }}
>
  <StatsGrid
    states={rawStates.length}
    transitions={rawEdges.length}
    items={itemCount}
    conflicts={conflictCount}
  />

  {selectedState ? (
    <StateInspector
      state={selectedState}
      productionById={productionById}
    />
  ) : (
    <EmptyState
      icon="◎"
      title="Sin estado"
      description="Selecciona un estado para inspeccionarlo."
      compact
    />
  )}
</aside>
        </div>
      )}
    </AutomataShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VIEW MODE SWITCHER
// ═══════════════════════════════════════════════════════════════════════════

const VIEW_MODES: Array<{id:ViewMode;icon:string;label:string;tip:string}> = [
  {id:"graph",icon:"⬡",label:"Grafo",  tip:"Vista 2D Sugiyama"},
  {id:"table",icon:"⊞",label:"Tabla",  tip:"Tabla de transiciones"},
  {id:"tree", icon:"⊤",label:"Árbol",  tip:"Árbol colapsable"},
  {id:"3d",   icon:"◉",label:"3D",     tip:"Vista tridimensional interactiva"},
];

function ViewModeSwitcher({current,onChange}:{current:ViewMode;onChange:(m:ViewMode)=>void}){
  return(
    <div style={{display:"flex",gap:2,background:"var(--bg1)",border:"1px solid var(--border)",borderRadius:9,padding:3}}>
      {VIEW_MODES.map(m=>{
        const active=current===m.id;
        const is3d=m.id==="3d";
        return(
          <button key={m.id} type="button" onClick={()=>onChange(m.id)} title={m.tip} style={{
            display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:6,
            border:"none",cursor:"pointer",fontSize:10,fontWeight:700,letterSpacing:.2,
            background:active?is3d?"linear-gradient(135deg,rgba(99,102,241,.3),rgba(52,211,153,.2))":"var(--bg3)":"transparent",
            color:active?is3d?"#a5b4fc":"var(--txt0)":"var(--txt3)",
            transition:"all .12s ease",
            boxShadow:active?"0 1px 4px rgba(0,0,0,.25)":"none",
          }}>
            <span style={{fontSize:12}}>{m.icon}</span>
            {m.label}
            {is3d&&<span style={{fontSize:8,padding:"1px 4px",borderRadius:4,background:"rgba(99,102,241,.25)",color:"#a5b4fc",letterSpacing:.8,fontWeight:800}}>NEW</span>}
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SVG GRAPH (2D)
// ═══════════════════════════════════════════════════════════════════════════

function AutomataGraphSvg({panelId,nodes,routed,width,height,selectedStateId,onSelectState,productionById}:{
  panelId:AutomataPanelId;nodes:LayoutNode[];routed:RoutedEdge[];
  width:number;height:number;selectedStateId:string|null;
  onSelectState:(id:string)=>void;productionById:ProductionMap;
}){
  const mid=`arr-${panelId}`,gId=`glow-${panelId}`,sId=`sglow-${panelId}`;
  return(
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={{display:"block",overflow:"visible"}}>
      <defs>
        {(["normal","reduce","accept","conflict"] as NodeStatus[]).map(st=>(
          <marker key={st} id={`${mid}-${st}`} markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
            <path d="M0,0 L0,7 L9,3.5 z" fill={PALETTE[st].edge}/>
          </marker>
        ))}
        <filter id={gId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id={sId} x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="7" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <g>
        {routed.map((e,i)=>{
          const tn=nodes.find(n=>n.id===e.to),fn=nodes.find(n=>n.id===e.from);
          const st:NodeStatus=tn?getStateStatus(tn,productionById):"normal";
          const pal=PALETTE[st];
          if(e.isSelfLoop){
            if(!fn)return null;
            const li=e.selfLoopIndex,rad=46+li*16,cx=fn.x+rad+li*12;
            return(<g key={i}>
              <path d={`M ${fn.x+NODE_R*.55} ${fn.y-NODE_R*.55} C ${cx} ${fn.y-rad*1.7},${cx} ${fn.y-rad*.3},${fn.x+NODE_R*.55} ${fn.y+NODE_R*.45}`}
                fill="none" stroke={pal.strokeA} strokeWidth="1.6" strokeDasharray="4 2.5" markerEnd={`url(#${mid}-${st})`}/>
              <EdgeLabel symbol={e.symbol} x={e.labelX} y={e.labelY}/>
            </g>);
          }
          return(<g key={i}>
            <path d={`M ${e.x1} ${e.y1} C ${e.cx1} ${e.cy1} ${e.cx2} ${e.cy2} ${e.x2} ${e.y2}`}
              fill="none" stroke={pal.strokeA} strokeWidth="1.7" markerEnd={`url(#${mid}-${st})`}/>
            <EdgeLabel symbol={e.symbol} x={e.labelX} y={e.labelY}/>
          </g>);
        })}
      </g>
      {nodes.map(node=>(
        <AutomataNodeSvg key={node.id} state={node} selected={selectedStateId===node.id}
          onSelect={onSelectState} productionById={productionById} glowId={gId} selGlowId={sId}/>
      ))}
      {nodes.length===0&&<text x={width/2} y={height/2} textAnchor="middle" fill="var(--txt3)" fontSize="13">No hay estados disponibles.</text>}
    </svg>
  );
}

function EdgeLabel({symbol,x,y}:{symbol:string;x:number;y:number}){
  const isEps=symbol.split(", ").some(s=>s==="ε"||s.toLowerCase()==="eps");
  const bw=Math.max(22,symbol.length*6+10);
  return(<g>
    <rect x={x-bw/2} y={y-9} width={bw} height={18} rx={5} fill="rgba(7,11,22,.92)"
      stroke={isEps?"rgba(52,211,153,.28)":"rgba(99,102,241,.22)"} strokeWidth="1"/>
    <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
      fill={isEps?"rgba(52,211,153,.92)":"rgba(165,180,252,.94)"}
      fontFamily="Fira Code, monospace" fontSize="9.5" fontWeight="700">{symbol}</text>
  </g>);
}

function AutomataNodeSvg({state,selected,onSelect,productionById,glowId,selGlowId}:{
  state:LayoutNode;selected:boolean;onSelect:(id:string)=>void;
  productionById:ProductionMap;glowId:string;selGlowId:string;
}){
  const st=getStateStatus(state,productionById),pal=PALETTE[st];
  return(<g data-node onClick={()=>onSelect(state.id)} style={{cursor:"pointer"}} role="button" aria-label={`Estado ${state.id}`}>
    {selected&&<circle cx={state.x} cy={state.y} r={NODE_R+12} fill={pal.glow} filter={`url(#${selGlowId})`}/>}
    {selected&&<circle cx={state.x} cy={state.y} r={NODE_R+12} fill="none" stroke={pal.strokeA} strokeWidth="1.5" strokeDasharray="5 3" opacity={.8}>
      <animate attributeName="stroke-dashoffset" from="0" to="16" dur="1.4s" repeatCount="indefinite"/>
    </circle>}
    <circle cx={state.x} cy={state.y} r={NODE_R} fill={pal.fill}
      stroke={selected?pal.stroke:pal.strokeA} strokeWidth={selected?2.2:1.5}
      filter={selected?`url(#${glowId})`:undefined}/>
    {st==="accept"&&<circle cx={state.x} cy={state.y} r={NODE_R-6} fill="none" stroke="rgba(52,211,153,.28)" strokeWidth="1.2"/>}
    <text x={state.x} y={state.y-3} textAnchor="middle" dominantBaseline="middle"
      fill={pal.text} fontFamily="Fira Code, monospace" fontSize="11.5" fontWeight="800">I{state.id}</text>
    <text x={state.x} y={state.y+14} textAnchor="middle"
      fill={pal.muted} fontFamily="Fira Code, monospace" fontSize="7" fontWeight="600" letterSpacing="0.6">
      {getStatusLabel(st)}</text>
  </g>);
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSITION TABLE VIEW
// ═══════════════════════════════════════════════════════════════════════════

function TransitionTableView({table,states,selectedId,onSelect,productionById}:{
  table:TransitionTable;states:GraphState[];selectedId:string|null;
  onSelect:(id:string)=>void;productionById:ProductionMap;
}){
  const stateMap=useMemo(()=>new Map(states.map(s=>[s.id,s])),[states]);
  return(
    <div style={{flex:1,overflow:"auto",padding:16,background:"var(--bg1)"}}>
      <div style={{marginBottom:12,padding:"8px 12px",borderRadius:8,background:"rgba(99,102,241,.07)",border:"1px solid rgba(99,102,241,.15)",fontSize:11,color:"var(--txt2)",lineHeight:1.6}}>
        <strong style={{color:"var(--accent)"}}>Tabla de transiciones</strong> — haz clic en cualquier celda o estado para inspeccionarlo.
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{borderCollapse:"separate",borderSpacing:3,minWidth:"100%",fontSize:11}}>
          <thead><tr>
            <th style={{...CSS.th,minWidth:70,textAlign:"left",background:"var(--bg2)",position:"sticky",left:0,zIndex:2}}>Estado</th>
            {table.symbols.map(sym=>{
              const isEps=sym==="ε"||sym.toLowerCase()==="eps";
              return<th key={sym} style={{...CSS.th,minWidth:56,color:isEps?"#34d399":"#a5b4fc",fontFamily:"var(--mono)"}}>{sym}</th>;
            })}
          </tr></thead>
          <tbody>
            {table.rows.map(({state,cells})=>{
              const st=getStateStatus(state,productionById),pal=PALETTE[st],isSel=selectedId===state.id;
              return(<tr key={state.id}>
                <td onClick={()=>onSelect(state.id)} style={{...CSS.td,position:"sticky",left:0,zIndex:1,
                  background:isSel?pal.fill:"var(--bg2)",border:isSel?`1px solid ${pal.strokeA}`:"1px solid var(--border)",
                  cursor:"pointer",fontFamily:"var(--mono)",fontWeight:800,color:pal.text,textAlign:"center",transition:"all .1s ease"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                    <span style={{width:6,height:6,borderRadius:999,background:pal.stroke,flexShrink:0,display:"inline-block"}}/>I{state.id}
                  </div>
                  {st==="accept"&&<div style={{fontSize:7,color:pal.muted,marginTop:1,letterSpacing:.5}}>accept</div>}
                </td>
                {table.symbols.map(sym=>{
                  const targets=cells.get(sym)??[],isEmpty=targets.length===0,hasConflict=targets.length>1;
                  return(<td key={sym} style={{...CSS.td,
                    background:isEmpty?"transparent":hasConflict?"rgba(248,113,113,.06)":"var(--bg2)",
                    border:hasConflict?"1px solid rgba(248,113,113,.28)":"1px solid var(--border)",textAlign:"center"}}>
                    {isEmpty?<span style={{color:"var(--txt3)",fontSize:9}}>—</span>:(
                      <div style={{display:"flex",flexWrap:"wrap",gap:3,justifyContent:"center"}}>
                        {targets.map(tid=>{
                          const tSt=stateMap.get(tid)?getStateStatus(stateMap.get(tid)!,productionById):"normal";
                          const tPal=PALETTE[tSt],isST=selectedId===tid;
                          return<button key={tid} type="button" onClick={()=>onSelect(tid)} style={{
                            padding:"2px 8px",borderRadius:5,fontSize:10,fontWeight:800,
                            fontFamily:"var(--mono)",cursor:"pointer",
                            background:isST?tPal.fill:"var(--bg3)",color:tPal.text,
                            border:isST?`1px solid ${tPal.strokeA}`:"1px solid var(--border)",transition:"all .1s ease"}}>I{tid}</button>;
                        })}
                      </div>
                    )}
                  </td>);
                })}
              </tr>);
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TREE VIEW
// ═══════════════════════════════════════════════════════════════════════════

function TreeView({root,states,selectedId,onSelect,productionById}:{
  root:TreeNode|null;states:GraphState[];selectedId:string|null;
  onSelect:(id:string)=>void;productionById:ProductionMap;
}){
  const[collapsed,setCollapsed]=useState<Set<string>>(new Set());
  const toggle=useCallback((key:string)=>{setCollapsed(p=>{const n=new Set(p);n.has(key)?n.delete(key):n.add(key);return n;});},[]);
  if(!root)return<EmptyState icon="⊤" title="Sin datos" description="No hay estados para mostrar." compact/>;
  return(
    <div style={{flex:1,overflow:"auto",padding:16,background:"var(--bg1)"}}>
      <div style={{marginBottom:12,padding:"8px 12px",borderRadius:8,background:"rgba(99,102,241,.07)",border:"1px solid rgba(99,102,241,.15)",fontSize:11,color:"var(--txt2)",lineHeight:1.6}}>
        <strong style={{color:"var(--accent)"}}>Árbol de expansión</strong> — desde el estado inicial. Los nodos <span style={{color:"var(--amber)",fontWeight:700}}>↩ ciclo</span> ya fueron visitados en esta rama.
      </div>
      <TreeNodeRow node={root} collapsed={collapsed} onToggle={toggle}
        selectedId={selectedId} onSelect={onSelect} productionById={productionById} isLast={true} prefix=""/>
    </div>
  );
}

function TreeNodeRow({node,collapsed,onToggle,selectedId,onSelect,productionById,isLast,prefix}:{
  node:TreeNode;collapsed:Set<string>;onToggle:(key:string)=>void;
  selectedId:string|null;onSelect:(id:string)=>void;
  productionById:ProductionMap;isLast:boolean;prefix:string;
}){
  const key=`${prefix}/${node.state.id}`;
  const isCollapsed=collapsed.has(key),hasChildren=node.children.length>0&&!node.isBackEdge;
  const st=getStateStatus(node.state,productionById),pal=PALETTE[st],isSel=selectedId===node.state.id;
  const connector=node.depth===0?"":(isLast?"└─ ":"├─ ");
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:0,marginBottom:3}}>
        {node.depth>0&&<span style={{fontFamily:"var(--mono)",fontSize:11,color:"rgba(99,102,241,.25)",whiteSpace:"pre",flexShrink:0,lineHeight:1}}>{prefix}{connector}</span>}
        {hasChildren
          ?<button type="button" onClick={()=>onToggle(key)} style={{background:"transparent",border:"none",cursor:"pointer",color:"var(--txt3)",fontSize:11,padding:"0 4px 0 0",lineHeight:1,flexShrink:0}}>{isCollapsed?"▶":"▼"}</button>
          :<span style={{width:15,flexShrink:0}}/>}
        {node.symbol&&<span style={{marginRight:6,padding:"1px 7px",borderRadius:5,fontSize:9,fontWeight:800,fontFamily:"var(--mono)",flexShrink:0,
          background:node.symbol==="ε"?"rgba(52,211,153,.12)":"rgba(99,102,241,.12)",
          color:node.symbol==="ε"?"#34d399":"#a5b4fc",
          border:node.symbol==="ε"?"1px solid rgba(52,211,153,.25)":"1px solid rgba(99,102,241,.22)"}}>{node.symbol}</span>}
        <button type="button" onClick={()=>onSelect(node.state.id)} style={{
          display:"flex",alignItems:"center",gap:7,padding:"4px 12px",borderRadius:8,cursor:"pointer",
          background:isSel?pal.fill:node.isBackEdge?"rgba(99,102,241,.04)":"var(--bg2)",
          border:isSel?`1.5px solid ${pal.strokeA}`:node.isBackEdge?"1px dashed rgba(99,102,241,.22)":"1px solid var(--border)",
          transition:"all .1s ease"}}>
          <span style={{width:7,height:7,borderRadius:999,background:pal.stroke,flexShrink:0}}/>
          <span style={{fontFamily:"var(--mono)",fontWeight:800,fontSize:12,color:pal.text}}>I{node.state.id}</span>
          <span style={{fontSize:9,color:pal.muted,fontWeight:700,letterSpacing:.5,textTransform:"uppercase"}}>{getStatusLabel(st)}</span>
          {node.isBackEdge&&<span style={{fontSize:9,color:"var(--amber)",fontWeight:700,marginLeft:2}}>↩ ciclo</span>}
          {st==="accept"&&!node.isBackEdge&&<span style={{fontSize:9,color:"#34d399",fontWeight:700}}>✓</span>}
          {node.state.items.length>0&&!node.isBackEdge&&<span style={{fontSize:9,color:"var(--txt3)",marginLeft:2}}>{node.state.items.length} ítem{node.state.items.length!==1?"s":""}</span>}
        </button>
      </div>
      {hasChildren&&!isCollapsed&&<div>
        {node.children.map((child,i)=>{
          const childIsLast=i===node.children.length-1;
          const childPrefix=node.depth===0?"":(prefix+(isLast?"   ":"│  "));
          return<TreeNodeRow key={`${key}/${child.state.id}/${i}`} node={child}
            collapsed={collapsed} onToggle={onToggle}
            selectedId={selectedId} onSelect={onSelect} productionById={productionById}
            isLast={childIsLast} prefix={childPrefix}/>;
        })}
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LEGEND
// ═══════════════════════════════════════════════════════════════════════════

function AutomataLegend({viewMode}:{viewMode:ViewMode}){
  const modeLabel={graph:"Layout Sugiyama · Bézier",table:"Tabla de transiciones",tree:"Árbol colapsable","3d":"Vista 3D interactiva · Three.js"}[viewMode];
  return(
    <div style={{padding:"7px 14px",borderTop:"1px solid var(--border)",display:"flex",gap:16,flexWrap:"wrap",background:"var(--bg2)",alignItems:"center"}}>
      <span style={{fontSize:9,color:"var(--txt3)",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Leyenda</span>
      {(["normal","reduce","accept","conflict"] as NodeStatus[]).map(st=>(
        <div key={st} style={{display:"flex",alignItems:"center",gap:6,fontSize:10,color:"var(--txt2)"}}>
          <span style={{width:10,height:10,borderRadius:999,background:PALETTE[st].fill,border:`1.5px solid ${PALETTE[st].strokeA}`,display:"inline-block"}}/>
          {getStatusLabel(st)}
        </div>
      ))}
      <span style={{marginLeft:"auto",fontSize:9,color:"rgba(99,102,241,.5)",fontWeight:600}}>{modeLabel}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function PanelGroup({label,cols,children}:{label:string;cols:number;children:ReactNode}){
  return(<div>
    <div style={{fontSize:9,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:"var(--txt3)",marginBottom:6,paddingLeft:2}}>{label}</div>
    <div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:8}}>{children}</div>
  </div>);
}

function PanelTab({panel,active,available,onSelect}:{panel:PanelDef;active:boolean;available:boolean;onSelect:(id:AutomataPanelId)=>void;}){
  return(<button type="button" onClick={()=>onSelect(panel.id)} disabled={!available} style={{
    position:"relative",padding:"12px 14px",textAlign:"left",borderRadius:10,
    border:active?"1.5px solid rgba(99,102,241,.65)":"1px solid var(--border)",
    background:active?"linear-gradient(135deg,rgba(99,102,241,.16),rgba(99,102,241,.05))":"var(--bg2)",
    cursor:available?"pointer":"not-allowed",opacity:available?1:.4,overflow:"hidden",transition:"all .15s ease"}}>
    {active&&<span style={{position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(99,102,241,.07),transparent)",pointerEvents:"none"}}/>}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
      <span style={{fontFamily:"var(--mono)",fontSize:14,fontWeight:800,color:active?"#a5b4fc":"var(--txt0)",letterSpacing:"-.3px"}}>{panel.shortLabel}</span>
      <span style={{fontSize:9,fontWeight:700,letterSpacing:1,textTransform:"uppercase",padding:"2px 7px",borderRadius:99,
        background:active?"rgba(99,102,241,.22)":"var(--bg3)",color:active?"#a5b4fc":"var(--txt3)",
        border:`1px solid ${active?"rgba(99,102,241,.28)":"var(--border)"}`}}>{panel.badge}</span>
    </div>
    <span style={{fontSize:10,color:"var(--txt3)",lineHeight:1.5,display:"block"}}>{panel.description}</span>
    <span style={{position:"absolute",bottom:0,left:0,height:2,width:"100%",
      background:active?"linear-gradient(90deg,rgba(99,102,241,.8),rgba(99,102,241,.1))":"transparent",transition:"all .15s ease"}}/>
  </button>);
}

function ZoomBar({viewport,setViewport}:{viewport:Viewport;setViewport:(v:Viewport)=>void}){
  const z=(d:number)=>setViewport({...viewport,scale:Math.max(.12,Math.min(4,viewport.scale+d))});
  return(<div style={{display:"flex",alignItems:"center",gap:2,background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:7,padding:"2px 4px"}}>
    <button type="button" onClick={()=>z(-.12)} style={CSS.smBtn}>−</button>
    <span style={{fontSize:9,color:"var(--txt2)",minWidth:34,textAlign:"center",fontFamily:"var(--mono)"}}>{Math.round(viewport.scale*100)}%</span>
    <button type="button" onClick={()=>z(+.12)} style={CSS.smBtn}>+</button>
  </div>);
}

function SmallBtn({onClick,title,children}:{onClick:()=>void;title:string;children:ReactNode}){
  return<button type="button" onClick={onClick} title={title} style={{padding:"4px 10px",borderRadius:7,border:"1px solid var(--border)",background:"var(--bg2)",color:"var(--txt2)",fontSize:11,cursor:"pointer"}}>{children}</button>;
}

function StatsGrid({states,transitions,items,conflicts}:{states:number;transitions:number;items:number;conflicts:number}){
  const data=[
    {label:"Estados",value:states,icon:"⬡",warn:false},
    {label:"Transiciones",value:transitions,icon:"→",warn:false},
    {label:"Ítems",value:items,icon:"·",warn:false},
    {label:"Conflictos",value:conflicts,icon:"⚠",warn:conflicts>0},
  ];
  return(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
    {data.map(d=>(
      <div key={d.label} style={{padding:"10px 12px",borderRadius:10,position:"relative",overflow:"hidden",
        border:d.warn?"1px solid rgba(251,191,36,.28)":"1px solid var(--border)",
        background:d.warn?"linear-gradient(135deg,rgba(251,191,36,.08),rgba(251,191,36,.02))":"var(--bg2)"}}>
        <div style={{position:"absolute",top:8,right:10,fontSize:16,opacity:.18,color:d.warn?"var(--amber)":"var(--txt3)"}}>{d.icon}</div>
        <div style={{fontSize:9,color:"var(--txt3)",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>{d.label}</div>
        <div style={{marginTop:5,fontFamily:"var(--mono)",fontSize:22,fontWeight:800,lineHeight:1,color:d.warn?"var(--amber)":"var(--txt0)"}}>{d.value}</div>
      </div>
    ))}
  </div>);
}

function StateInspector({state,productionById}:{state:GraphState;productionById:ProductionMap}){
  const st=getStateStatus(state,productionById),pal=PALETTE[st];
  const rc=state.items.filter(it=>isReduceItem(it,productionById)).length;
  return(<section style={{background:"var(--bg2)",border:`1px solid ${pal.strokeA}`,borderRadius:10,overflow:"hidden",flexShrink:0}}>
    <div style={{padding:"10px 12px",background:pal.fill,borderBottom:`1px solid ${pal.strokeA}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div>
        <div style={{fontSize:9,color:pal.muted,textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Estado seleccionado</div>
        <div style={{fontFamily:"var(--mono)",fontSize:22,fontWeight:800,color:pal.text,lineHeight:1.1,marginTop:2}}>I{state.id}</div>
      </div>
      <span className={getBadgeClass(st)}>{getStatusLabel(st)}</span>
    </div>
    <div style={{padding:"7px 12px",display:"flex",gap:5,flexWrap:"wrap",borderBottom:"1px solid var(--border)"}}>
      <span className="badge b-blue">{state.items.length} ítems</span>
      {rc>0&&<span className="badge b-amber">{rc} reduce</span>}
      {state.conflicts.length>0&&<span className="badge b-amber">{state.conflicts.length} conflicto{state.conflicts.length!==1?"s":""}</span>}
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:200,overflowY:"auto",padding:"9px 10px"}}>
      {state.items.length?state.items.map((item,i)=>{
        const red=isReduceItem(item,productionById);
        return(<div key={i} style={{padding:"5px 9px",borderRadius:7,display:"flex",gap:6,
          border:red?"1px solid rgba(251,191,36,.22)":"1px solid rgba(99,102,241,.12)",
          background:red?"rgba(251,191,36,.06)":"rgba(99,102,241,.04)",
          fontFamily:"var(--mono)",fontSize:11,lineHeight:1.6,color:red?"var(--amber)":"var(--txt1)"}}>
          {red&&<span style={{fontSize:8,opacity:.7,flexShrink:0,marginTop:2}}>▶</span>}
          <FormattedItem value={formatItem(item,productionById)}/>
        </div>);
      }):<p style={{fontSize:12,color:"var(--txt3)",margin:0,lineHeight:1.6}}>Sin ítems expuestos.</p>}
    </div>
  </section>);
}

function StateQuickList({states,allCount,selectedId,onSelect,productionById,search,onSearch}:{
  states:GraphState[];allCount:number;selectedId:string|null;
  onSelect:(id:string)=>void;productionById:ProductionMap;search:string;onSearch:(q:string)=>void;
}){
  return(<section style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:10,overflow:"hidden",display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
    <div style={{padding:"9px 12px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <span style={{fontSize:10,fontWeight:700,color:"var(--txt2)",textTransform:"uppercase",letterSpacing:1}}>Estados</span>
      <span style={{fontSize:10,color:"var(--txt3)",fontFamily:"var(--mono)"}}>{states.length}/{allCount}</span>
    </div>
    <div style={{padding:"7px 10px",borderBottom:"1px solid var(--border)"}}>
      <div style={{display:"flex",alignItems:"center",gap:6,background:"var(--bg1)",border:"1px solid var(--border)",borderRadius:7,padding:"4px 9px"}}>
        <span style={{color:"var(--txt3)",fontSize:12}}>⌕</span>
        <input type="text" value={search} onChange={e=>onSearch(e.target.value)} placeholder="Buscar estado o ítem..."
          style={{flex:1,background:"transparent",border:"none",outline:"none",fontSize:11,color:"var(--txt0)",fontFamily:"var(--mono)"}}/>
        {search&&<button type="button" onClick={()=>onSearch("")} style={{background:"transparent",border:"none",cursor:"pointer",color:"var(--txt3)",fontSize:13,padding:0}}>×</button>}
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(50px,1fr))",gap:5,padding:10,overflowY:"auto",flex:1}}>
      {states.map(s=>{
        const st=getStateStatus(s,productionById),pal=PALETTE[st],act=selectedId===s.id;
        return(<button key={s.id} type="button" onClick={()=>onSelect(s.id)} title={`I${s.id} — ${getStatusLabel(st)}`}
          style={{border:act?`1.5px solid ${pal.strokeA}`:"1px solid var(--border)",borderRadius:8,padding:"7px 4px",
            background:act?pal.fill:"var(--bg3)",color:act?pal.text:"var(--txt2)",
            fontFamily:"var(--mono)",fontSize:11,fontWeight:800,cursor:"pointer",position:"relative",overflow:"hidden",transition:"all .12s ease"}}>
          {act&&<span style={{position:"absolute",bottom:0,left:0,right:0,height:2,background:pal.text}}/>}
          I{s.id}
        </button>);
      })}
      {states.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:"14px 0",fontSize:11,color:"var(--txt3)"}}>Sin resultados para "{search}"</div>}
    </div>
  </section>);
}

function AutomataShell({children}:{children:ReactNode}){
  return<div className="module" style={{display:"flex",flexDirection:"column",flex:1,overflowY:"auto",padding:16,gap:12}}>{children}</div>;
}
function EmptyState({icon="◈",title,description,compact=false}:{icon?:string;title:string;description:ReactNode;compact?:boolean}){
  return(<div style={{minHeight:compact?110:240,display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center"}}>
    <div style={{maxWidth:420,padding:compact?"14px 20px":"26px 32px",border:"1px dashed rgba(99,102,241,.22)",borderRadius:12,background:"rgba(99,102,241,.04)"}}>
      <div style={{fontSize:compact?18:28,color:"rgba(99,102,241,.35)",marginBottom:8}}>{icon}</div>
      <div style={{marginBottom:6,fontSize:11,fontWeight:800,letterSpacing:1,textTransform:"uppercase",color:"var(--accent)"}}>{title}</div>
      <p style={{fontSize:12,lineHeight:1.7,color:"var(--txt3)",margin:0}}>{description}</p>
    </div>
  </div>);
}
function FormattedItem({value}:{value:string}){
  const parts=value.split("·");
  if(parts.length===1){const m=value.match(/^(.+?)(\s+\{.+\})$/);if(m)return<><span>{m[1]}</span><span style={{color:"rgba(99,102,241,.7)",fontSize:"0.9em"}}>{m[2]}</span></>;return<>{value}</>;}
  return<>{parts[0]}<span style={{color:"var(--accent)",fontWeight:900,fontSize:"1.1em"}}>·</span>{parts.slice(1).join("·")}</>;
}

// ═══════════════════════════════════════════════════════════════════════════
// CSS CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const CSS={
  canvasPanel:{minWidth:0,border:"1px solid var(--border)",borderRadius:12,background:"var(--bg2)",overflow:"hidden",display:"flex",flexDirection:"column"} as React.CSSProperties,
  canvasHeader:{padding:"10px 14px",borderBottom:"1px solid var(--border)",background:"var(--bg3)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"} as React.CSSProperties,
  iconBubble:{display:"flex",alignItems:"center",justifyContent:"center",width:28,height:28,borderRadius:7,fontSize:13,color:"#a5b4fc",background:"rgba(99,102,241,.14)",border:"1px solid rgba(99,102,241,.25)"} as React.CSSProperties,
  smBtn:{width:22,height:22,borderRadius:5,border:"none",background:"transparent",cursor:"pointer",color:"var(--txt2)",fontSize:14,lineHeight:"1",display:"flex",alignItems:"center",justifyContent:"center"} as React.CSSProperties,
  th:{padding:"7px 10px",background:"var(--bg3)",border:"1px solid var(--border)",color:"var(--txt2)",fontSize:10,fontWeight:700,textTransform:"uppercase" as const,letterSpacing:.8,whiteSpace:"nowrap" as const},
  td:{padding:"5px 8px",minHeight:34},
};

// ═══════════════════════════════════════════════════════════════════════════
// DATA EXTRACTION (original logic preserved)
// ═══════════════════════════════════════════════════════════════════════════

function getAutomatonByPanel(result:AutomataStudioResult|null,panel:AutomataPanelId):unknown{
  if(!result)return undefined;
  if(panel==="afn")return result.afn;if(panel==="afd")return result.afd;
  if(panel==="lr0")return result.lr0Automaton;if(panel==="lr1")return result.lr1?.automaton;
  return result.lalr1?.automaton;
}
function getPanelLabel(panel:AutomataPanelId){return AUTOMATA_PANELS.find(p=>p.id===panel)?.label??"Autómata";}
function extractStates(automaton:unknown):GraphState[]{
  const r=asRecord(automaton);
  const raw=getArray(r.states)??getArray(r.canonicalCollection)??getArray(r.collection)??[];
  return raw.map((rs,i)=>({id:getStateId(rs,i),raw:rs,items:getArray(asRecord(rs).items)??[],conflicts:getArray(asRecord(rs).conflicts)??[]}));
}
function extractEdges(automaton:unknown,states:GraphState[]):GraphEdge[]{
  const all:GraphEdge[]=[];
  for(const s of states)all.push(...extractStateEdges(s));
  all.push(...extractGlobalEdges(automaton));
  const valid=new Set(states.map(s=>s.id)),unique=new Map<string,GraphEdge>();
  for(const e of all){if(!valid.has(e.from)||!valid.has(e.to))continue;unique.set(`${e.from}→${e.to}∥${e.symbol}`,e);}
  return[...unique.values()];
}
function extractStateEdges(state:GraphState):GraphEdge[]{
  const transitions=asRecord(state.raw).transitions;const edges:GraphEdge[]=[];
  if(transitions instanceof Map){for(const[sym,tgt]of transitions.entries())edges.push({from:state.id,to:normalizeStateId(tgt),symbol:formatGrammarSymbol(sym)});return edges;}
  if(Array.isArray(transitions)){for(const t of transitions){const p=parseTransition(t,state.id);if(p)edges.push(p);}return edges;}
  if(isObject(transitions)){for(const[sym,tgt]of Object.entries(transitions)){const r=asRecord(tgt);edges.push({from:state.id,to:normalizeStateId(r.to??r.target??r.state??r.stateId??tgt),symbol:sym});}}
  return edges;
}
function extractGlobalEdges(automaton:unknown):GraphEdge[]{
  const r=asRecord(automaton);
  return(getArray(r.transitions)??getArray(r.edges)??[]).map(e=>parseTransition(e)).filter((e):e is GraphEdge=>Boolean(e));
}
function parseTransition(t:unknown,fallback?:string):GraphEdge|null{
  if(Array.isArray(t)){const[sym,tgt]=t;if(!fallback||tgt===undefined)return null;return{from:fallback,to:normalizeStateId(tgt),symbol:formatGrammarSymbol(sym)};}
  const r=asRecord(t);
  const from=r.from??r.source??r.sourceState??r.sourceStateId??fallback;
  const to=r.to??r.target??r.targetState??r.targetStateId??r.next??r.nextState;
  const sym=r.symbol??r.label??r.on??r.grammarSymbol??r.transitionSymbol;
  if(from===undefined||to===undefined||sym===undefined)return null;
  return{from:normalizeStateId(from),to:normalizeStateId(to),symbol:formatGrammarSymbol(sym)};
}
function getConflictCount(result:AutomataStudioResult|null,panel:AutomataPanelId,states:GraphState[]):number{
  if(!result)return 0;
  const tr=panel==="lr0"?result.lr0:panel==="lr1"?result.lr1:result.lalr1;
  const tc=getArray(asRecord(tr).conflicts);
  return tc?tc.length:states.reduce((t,s)=>t+s.conflicts.length,0);
}

function getConflictStateIds(
  result: AutomataStudioResult | null,
  panel: AutomataPanelId
): Set<string> {
  const ids = new Set<string>();

  if (!result) return ids;

  const table =
    panel === "lr0"
      ? result.lr0
      : panel === "lr1"
        ? result.lr1
        : panel === "lalr1"
          ? result.lalr1
          : undefined;

  const conflicts = getArray(asRecord(table).conflicts) ?? [];

  for (const conflict of conflicts) {
    const record = asRecord(conflict);
    const state = record.stateId ?? record.state ?? record.fromState;

    if (state !== undefined) {
      ids.add(normalizeStateId(state));
    }
  }

  return ids;
}
function getStateStatus(state: GraphState, pm: ProductionMap): NodeStatus {
  if (state.conflicts.length > 0) return "conflict";

  const r = asRecord(state.raw);

  if (
    r.isAccepting === true ||
    r.accept === true ||
    r.accepting === true ||
    state.items.some((item) => isAcceptItem(item, pm))
  ) {
    return "accept";
  }

  if (state.items.some((item) => isReduceItem(item, pm))) {
    return "reduce";
  }

  return "normal";
}
function getItemProduction(item:unknown,pm:ProductionMap):Production|null{
  const r=asRecord(item);const dp=r.production??r.prod;if(isProductionLike(dp))return dp;
  const pid=r.productionId??r.prodId??r.productionID??r.idProduction;
  if(pid!==undefined)return pm.get(String(pid))??null;return null;
}
function getItemDot(item:unknown):number{const r=asRecord(item);return getNumber(r.dot)??getNumber(r.dotPosition)??getNumber(r.position)??getNumber(r.cursor)??0;}
function isReduceItem(item:unknown,pm:ProductionMap):boolean{
  const r=asRecord(item);if(r.isComplete===true||r.complete===true)return true;
  const p=getItemProduction(item,pm);if(!p)return false;return getItemDot(item)>=getEffectiveRight(p.right).length;
}
function isProductionLike(v:unknown):v is Production{const r=asRecord(v);return typeof r.id==="string"&&typeof r.left==="string"&&Array.isArray(r.right)&&typeof r.raw==="string";}

function isAcceptItem(item: unknown, pm: ProductionMap): boolean {
  const p = getItemProduction(item, pm);
  if (!p) return false;

  const right = getEffectiveRight(p.right);
  const dot = getItemDot(item);

  if (dot < right.length) return false;

  const left = String(p.left);
  const base = left.endsWith("'") ? left.slice(0, -1) : "";

  const looksLikeAugmentedStart =
    base.length > 0 &&
    right.length === 1 &&
    right[0] === base;

  if (!looksLikeAugmentedStart) return false;

  const lookaheads = getItemLookaheads(item);

  if (lookaheads.length === 0) {
    return true;
  }

  return lookaheads.some(isEndMarker);
}

function formatItem(item: unknown, pm: ProductionMap): string {
  if (typeof item === "string") return item;

  const r = asRecord(item);
  const p = getItemProduction(item, pm);
  const dot = getItemDot(item);

  if (!p) {
    const pid =
      r.productionId ??
      r.prodId ??
      r.productionID ??
      r.idProduction ??
      "?";

    return `Producción ${String(pid)} · posición ${dot}`;
  }

  const left = String(p.left);
  const right = getEffectiveRight(p.right);
  const vis = right.length > 0 ? [...right] : ["ε"];

  vis.splice(
    right.length === 0 ? 0 : Math.max(0, Math.min(dot, vis.length)),
    0,
    "·",
  );

  return `${left} → ${vis.join(" ")}${formatLookahead(item)}`;
}

function getItemLookaheads(item: unknown): string[] {
  const r = asRecord(item);
  const raw = r.lookahead ?? r.lookaheads ?? r.lookAhead ?? r.lookAheads;

  if (raw == null) return [];

  if (Array.isArray(raw)) {
    return raw.map(String);
  }

  if (raw instanceof Set) {
    return [...raw].map(String);
  }

  return [String(raw)];
}

function isEndMarker(symbol: string): boolean {
  const value = symbol.trim();
  return value === "$" || value === "EOF" || value === "eof";
}

function getEffectiveRight(right:unknown):string[]{
  if(!Array.isArray(right))return[];
  return right.map(String).filter(s=>{const n=s.trim().toLowerCase();return n!==""&&n!=="ε"&&n!=="eps"&&n!=="epsilon";});
}
function formatLookahead(item:unknown):string{
  const r=asRecord(item);const raw=r.lookahead??r.lookaheads??r.lookAhead??r.lookAheads;
  if(raw==null)return"";if(Array.isArray(raw))return`    { ${raw.map(String).join(", ")} }`;
  if(raw instanceof Set)return`    { ${[...raw].map(String).join(", ")} }`;return`    { ${String(raw)} }`;
}
function formatGrammarSymbol(v:unknown):string{
  if(typeof v==="string"||typeof v==="number")return String(v);
  const r=asRecord(v);return String(r.name??r.value??r.symbol??r.id??r.label??"?");
}
function getStateId(state:unknown,i:number):string{return normalizeStateId(asRecord(state).id??asRecord(state).stateId??i);}
function normalizeStateId(v:unknown):string{
  if(typeof v==="number"||typeof v==="string")return String(v);
  const r=asRecord(v);if(typeof r.id==="number"||typeof r.id==="string")return String(r.id);
  if(typeof r.stateId==="number"||typeof r.stateId==="string")return String(r.stateId);return String(v);
}
function getNumber(v:unknown):number|null{return typeof v==="number"&&isFinite(v)?v:null;}
function getArray(v:unknown):unknown[]|null{return Array.isArray(v)?v:null;}
function asRecord(v:unknown):Record<string,unknown>{return isObject(v)?(v as Record<string,unknown>):{};}
function isObject(v:unknown):v is object{return v!==null&&typeof v==="object";}