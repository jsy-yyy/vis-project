import { Crosshair, Database, SlidersHorizontal, Timer } from "lucide-react";

type AppHeaderProps = {
  totalBattles: number;
  filteredBattles: number;
  visibleMapBattles: number;
  currentYear: number;
};

export function AppHeader({ totalBattles, filteredBattles, visibleMapBattles, currentYear }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">BattleMap</p>
        <h1>全球军事冲突事件时空可视分析系统</h1>
        <p className="header-copy">
          使用 HCED 军事冲突事件点与 CShapes 2.0 历史边界，联动地图、时间轴、参战方网络、统计和详情。
        </p>
      </div>
      <div className="header-metrics" aria-label="项目概览">
        <div className="metric-chip">
          <Database size={18} />
          <span>{totalBattles} 条 HCED 事件</span>
        </div>
        <div className="metric-chip">
          <SlidersHorizontal size={18} />
          <span>{filteredBattles} 条符合筛选</span>
        </div>
        <div className="metric-chip">
          <Crosshair size={18} />
          <span>{visibleMapBattles} 条地图可见</span>
        </div>
        <div className="metric-chip">
          <Timer size={18} />
          <span>{currentYear}</span>
        </div>
      </div>
    </header>
  );
}
