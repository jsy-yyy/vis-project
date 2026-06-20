import type { ReactNode } from "react";
import { ViewNavigation } from "./ViewNavigation";
import type { ViewStatusItem } from "./ViewNavigation";

type AppShellProps = {
  header: ReactNode;
  primary: ReactNode;
  sidebar: ReactNode;
  onCopyLink: () => void;
  statusItems: ViewStatusItem[];
};

export function AppShell({ header, primary, sidebar, onCopyLink, statusItems }: AppShellProps) {
  return (
    <div className="app-shell">
      {header}
      <main className="app-main">
        <ViewNavigation onCopyLink={onCopyLink} statusItems={statusItems} />
        <section className="dashboard-grid">
          <div className="primary-grid">{primary}</div>
          <aside id="analysis-view" className="sidebar-grid">{sidebar}</aside>
        </section>
      </main>
    </div>
  );
}
