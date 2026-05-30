import { BookOpen } from "lucide-react";
import type { YearRange } from "../../types/domain";

type CaseStudyPanelProps = {
  onSelectWar: (warId: string | null) => void;
  onYearRangeChange: (range: YearRange) => void;
};

export function CaseStudyPanel({ onSelectWar, onYearRangeChange }: CaseStudyPanelProps) {
  return (
    <section className="side-panel">
      <div className="section-heading">
        <BookOpen size={18} />
        <h2>Case Study</h2>
      </div>
      <div className="case-study-list">
        <button
          type="button"
          onClick={() => {
            onSelectWar("napoleonic-wars");
            onYearRangeChange([1803, 1815]);
          }}
        >
          <strong>Napoleonic spread</strong>
          <span>Follow coalition battles from central Europe to Russia and Belgium.</span>
        </button>
        <button
          type="button"
          onClick={() => {
            onSelectWar("world-war-ii");
            onYearRangeChange([1939, 1945]);
          }}
        >
          <strong>World War II Europe</strong>
          <span>Trace early invasion, air defense, eastern reversal, and western landing.</span>
        </button>
      </div>
    </section>
  );
}
