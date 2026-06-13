import { BookOpen } from "lucide-react";
import type { YearRange } from "../../types/domain";

type CaseStudyPanelProps = {
  onApplyCaseStudy: (warId: string, range: YearRange) => void;
};

export function CaseStudyPanel({ onApplyCaseStudy }: CaseStudyPanelProps) {
  return (
    <section className="side-panel">
      <div className="section-heading">
        <BookOpen size={18} />
        <h2>案例分析</h2>
      </div>
      <div className="case-study-list">
        <button
          type="button"
          onClick={() => onApplyCaseStudy("world-war-i", [1914, 1918])}
        >
          <strong>第一次世界大战</strong>
          <span>查看 1914-1918 年全球冲突窗口中的 HCED 事件。</span>
          <small>重点观察时间轴上的事件集中期，以及中欧参战方 participant 的共现簇。</small>
        </button>
        <button
          type="button"
          onClick={() => onApplyCaseStudy("world-war-ii", [1939, 1945])}
        >
          <strong>第二次世界大战</strong>
          <span>结合历史国家边界追踪 1939-1945 年的全球事件点。</span>
          <small>先用网络比较主要共现关系，再在时间轴选择事件高峰年份。</small>
        </button>
      </div>
      <div className="case-study-notes">
        <h3>读图路径</h3>
        <p>
          选择案例后，在时间轴选择高峰年份，观察地图上的空间集中区，再点击核心 participant 查看一阶共现网络。
        </p>
      </div>
    </section>
  );
}
