import { BookOpen, Crosshair, Network } from "lucide-react";
import type { CaseStudyAnalysis } from "../../lib/caseStudyAnalytics";

type CaseStudyPanelProps = {
  cases: CaseStudyAnalysis[];
  onApplyCaseStudy: (analysis: CaseStudyAnalysis) => void;
  onFocusParticipant: (analysis: CaseStudyAnalysis) => void;
};

function getParticipantName(id: string) {
  return id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function CaseStudyInsightsPanel({
  cases,
  onApplyCaseStudy,
  onFocusParticipant,
}: CaseStudyPanelProps) {
  return (
    <section className="side-panel case-study-panel">
      <div className="section-heading">
        <BookOpen size={18} />
        <div>
          <h2>案例与可验证洞察</h2>
          <p>指标由当前 HCED 数据动态计算，不是预先写死的结论。</p>
        </div>
      </div>
      <div className="case-study-list">
        {cases.map((analysis, index) => {
          const primaryPair = analysis.topPairs[0];
          const secondaryPair = analysis.topPairs[1];
          const topType = analysis.topTypes[0];
          return (
            <article key={analysis.id} className={index === 0 ? "case-study-card primary" : "case-study-card"}>
              <header>
                <span>{index === 0 ? "主案例" : "对照案例"}</span>
                <strong>{analysis.label}</strong>
                <small>{analysis.range[0]}–{analysis.range[1]}</small>
              </header>
              <div className="case-study-metrics">
                <div><strong>{analysis.totalEvents}</strong><span>事件</span></div>
                <div><strong>{analysis.peakYear}</strong><span>峰值年份</span></div>
                <div><strong>{analysis.peakCount}</strong><span>峰值事件</span></div>
              </div>
              <p>{analysis.narrative}</p>
              <ul>
                {primaryPair ? (
                  <li>
                    最强共现：{getParticipantName(primaryPair.source)}–{getParticipantName(primaryPair.target)}
                    （{primaryPair.count}）
                  </li>
                ) : null}
                {secondaryPair ? (
                  <li>
                    次强共现：{getParticipantName(secondaryPair.source)}–{getParticipantName(secondaryPair.target)}
                    （{secondaryPair.count}）
                  </li>
                ) : null}
                {topType ? <li>主要事件类型：{topType[0]}（{topType[1]}）</li> : null}
              </ul>
              <div className="case-study-actions">
                <button type="button" onClick={() => onApplyCaseStudy(analysis)}>
                  <Crosshair size={15} />应用窗口并定位峰值
                </button>
                <button type="button" onClick={() => onFocusParticipant(analysis)}>
                  <Network size={15} />聚焦核心参战方
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <div className="case-study-notes">
        <h3>解释边界</h3>
        <p>共现表示两个参战方出现在同一事件记录中，不必然等于联盟；事件数量也不等于战争强度或伤亡规模。</p>
      </div>
    </section>
  );
}
