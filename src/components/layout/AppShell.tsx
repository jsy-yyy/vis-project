import type { ReactNode } from "react";
import { ViewNavigation } from "./ViewNavigation";

type AppShellProps = {
  header: ReactNode;
  primary: ReactNode;
  sidebar: ReactNode;
  onCopyLink: () => void;
};

export function AppShell({ header, primary, sidebar, onCopyLink }: AppShellProps) {
  return (
    <div className="app-shell">
      {header}
      <main className="app-main">
        <ViewNavigation onCopyLink={onCopyLink} />
        <section className="dashboard-grid">
          <div className="primary-grid">{primary}</div>
          <aside id="analysis-view" className="sidebar-grid">{sidebar}</aside>
        </section>
      </main>
    </div>
  );
}
