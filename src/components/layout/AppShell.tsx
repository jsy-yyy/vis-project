import type { ReactNode } from "react";
import { ViewNavigation } from "./ViewNavigation";

type AppShellProps = {
  header: ReactNode;
  filters: ReactNode;
  primary: ReactNode;
  sidebar: ReactNode;
};

export function AppShell({ header, filters, primary, sidebar }: AppShellProps) {
  return (
    <div className="app-shell">
      {header}
      <main className="app-main">
        <ViewNavigation />
        <section className="control-band">{filters}</section>
        <section className="dashboard-grid">
          <div className="primary-grid">{primary}</div>
          <aside id="analysis-view" className="sidebar-grid">{sidebar}</aside>
        </section>
      </main>
    </div>
  );
}
