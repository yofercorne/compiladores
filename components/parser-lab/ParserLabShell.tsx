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

  /**
   * Panel derecho opcional.
   * Si no se envía rightPanel, el centro se expande automáticamente.
   */
  rightTitle?: string;
  rightBadge?: ReactNode;
  rightPanel?: ReactNode;

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
  const hasRightPanel = rightPanel !== undefined && rightPanel !== null;

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

      <div
        className="app-grid"
        style={{
          gridTemplateColumns: hasRightPanel
            ? "minmax(335px, 365px) minmax(0, 1fr) minmax(300px, 360px)"
            : "minmax(335px, 365px) minmax(0, 1fr)",
        }}
      >
        <aside className="panel min-w-0">
          <div className="panel-hd">
            <span className="panel-title">{leftTitle}</span>
            {leftBadge}
          </div>

          <div className="panel-body min-w-0">{leftPanel}</div>
        </aside>

        <section
          className="panel min-w-0"
          style={{ borderRight: hasRightPanel ? undefined : "none" }}
        >
          <div className="center-body min-w-0">{centerPanel}</div>
        </section>

        {hasRightPanel ? (
          <aside className="panel right min-w-0">
            <div className="panel-hd">
              <span className="panel-title">{rightTitle ?? "Panel"}</span>
              {rightBadge}
            </div>

            <div className="panel-body min-w-0">{rightPanel}</div>
          </aside>
        ) : null}
      </div>

      {statusbar}
    </main>
  );
}
