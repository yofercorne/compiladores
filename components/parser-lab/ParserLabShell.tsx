"use client";

import type { ReactNode } from "react";
import {
  ParserTopbar,
  type ParserLabModule,
} from "@/components/parser-lab/ParserTopbar";

type ParserLabShellProps = {
  activeModule: ParserLabModule;
  onModuleChange: (module: ParserLabModule) => void;
  onRun: () => void;
  isRunning?: boolean;

  leftTitle: string;
  leftBadge?: ReactNode;
  leftPanel: ReactNode;

  centerPanel: ReactNode;

  rightTitle: string;
  rightBadge?: ReactNode;
  rightPanel: ReactNode;

  statusbar: ReactNode;

  onTogglePresentation?: () => void;
  onToggleTheme?: () => void;
};

export function ParserLabShell({
  activeModule,
  onModuleChange,
  onRun,
  isRunning = false,

  leftTitle,
  leftBadge,
  leftPanel,

  centerPanel,

  rightTitle,
  rightBadge,
  rightPanel,

  statusbar,

  onTogglePresentation,
  onToggleTheme,
}: ParserLabShellProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--bg0)] text-[var(--txt0)]">
      <ParserTopbar
        activeModule={activeModule}
        onModuleChange={onModuleChange}
        onRun={onRun}
        isRunning={isRunning}
        {...(onTogglePresentation !== undefined
          ? { onTogglePresentation }
          : {})}
        {...(onToggleTheme !== undefined ? { onToggleTheme } : {})}
      />

      <div className="app-grid">
        <aside className="panel">
          <div className="panel-hd">
            <span className="panel-title">{leftTitle}</span>
            {leftBadge}
          </div>

          <div className="panel-body">{leftPanel}</div>
        </aside>

        <section className="panel" style={{ borderRight: "none" }}>
          <div className="center-body">{centerPanel}</div>
        </section>

        <aside className="panel right">
          <div className="panel-hd">
            <span className="panel-title">{rightTitle}</span>
            {rightBadge}
          </div>

          <div className="panel-body">{rightPanel}</div>
        </aside>
      </div>

      {statusbar}
    </main>
  );
}