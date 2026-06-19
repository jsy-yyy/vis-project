import type { ReactNode } from "react";
import { ViewNavigation } from "./ViewNavigation";

type AppShellProps = {
  header: ReactNode;
  filters: ReactNode;
  primary: ReactNode;
  sidebar: ReactNode;
  onCopyLink: () => void;
};

export function AppShell({ header, filters, primary, sidebar, onCopyLink }: AppShellProps) {
  return (
    <div className="app-shell">
      {header}
      <main className="app-main">
        <ViewNavigation onCopyLink={onCopyLink} />
        <section className="control-band">{filters}</section>
        <section className="dashboard-grid">
          <div className="primary-grid">{primary}</div>
          <aside id="analysis-view" className="sidebar-grid">{sidebar}</aside>
        </section>
      </main>
    </div>
  );
}
