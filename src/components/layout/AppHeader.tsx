import { Crosshair, Database, Timer } from "lucide-react";
import type { YearRange } from "../../types/domain";

type AppHeaderProps = {
  totalBattles: number;
  filteredBattles: number;
  yearRange: YearRange;
};

export function AppHeader({ totalBattles, filteredBattles, yearRange }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">BattleMap</p>
        <h1>战争与战役时空演化可视分析系统</h1>
        <p className="header-copy">
          用统一状态驱动地图、时间轴、参战方网络、统计和详情，为 A/B 的真实数据与核心视图预留接口。
        </p>
      </div>
      <div className="header-metrics" aria-label="Project summary">
        <div className="metric-chip">
          <Database size={18} />
          <span>{totalBattles} mock records</span>
        </div>
        <div className="metric-chip">
          <Crosshair size={18} />
          <span>{filteredBattles} visible</span>
        </div>
        <div className="metric-chip">
          <Timer size={18} />
          <span>
            {yearRange[0]}-{yearRange[1]}
          </span>
        </div>
      </div>
    </header>
  );
}
