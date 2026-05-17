"use client";

export type ParserLabModule =
  | "lab"
  | "automata"
  | "compare"
  | "conflict"
  | "refactor"
  | "tutor"
  | "gallery"
  | "report";

type ParserTopbarProps = {
  activeModule: ParserLabModule;
  onModuleChange: (module: ParserLabModule) => void;
  onRun: () => void;
  onTogglePresentation?: () => void;
  onToggleTheme?: () => void;
  isRunning?: boolean;
};

const MODULES: Array<{
  id: ParserLabModule;
  label: string;
  icon: string;
}> = [
  {
    id: "lab",
    label: "Lab",
    icon: "⚗"
  },
  {
    id: "automata",
    label: "Autómata",
    icon: "◎"
  },
  {
    id: "compare",
    label: "Comparar",
    icon: "⚔"
  },
  {
    id: "conflict",
    label: "Conflictos",
    icon: "⚡"
  },
  {
    id: "refactor",
    label: "Refactor",
    icon: "🔧"
  },
  {
    id: "tutor",
    label: "Tutor IA",
    icon: "🎓"
  },
  {
    id: "gallery",
    label: "Galería",
    icon: "📚"
  },
  {
    id: "report",
    label: "Reporte",
    icon: "📄"
  }
];

export function ParserTopbar({
  activeModule,
  onModuleChange,
  onRun,
  onTogglePresentation,
  onToggleTheme,
  isRunning = false
}: ParserTopbarProps) {
  return (
    <header className="topbar">
      <div className="logo">
        <div className="logo-mark">λ</div>

        <div>
          <div className="logo-name">
            Parser<em>Lab</em> Pro
          </div>
        </div>

        <span className="logo-tag">v1.0</span>
      </div>

      <nav className="nav" aria-label="Módulos principales">
        {MODULES.map((module) => (
          <button
            key={module.id}
            type="button"
            onClick={() => onModuleChange(module.id)}
            className={
              activeModule === module.id ? "nav-item active" : "nav-item"
            }
          >
            <span className="nav-icon">{module.icon}</span>
            {module.label}
          </button>
        ))}
      </nav>

      <div className="topbar-right">
        <button
          type="button"
          className="pill-btn"
          onClick={onTogglePresentation}
        >
          ⊞ Presentación
        </button>

        <button type="button" className="pill-btn" onClick={onToggleTheme}>
          ◑ Tema
        </button>

        <button
          type="button"
          className="pill-btn primary"
          onClick={onRun}
          disabled={isRunning}
        >
          {isRunning ? "⏳ Ejecutando…" : "▶ Ejecutar"}
        </button>
      </div>
    </header>
  );
}