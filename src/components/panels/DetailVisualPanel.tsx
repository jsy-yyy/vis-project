import { Info, LocateFixed, Lock, Trash2, Unlock } from "lucide-react";
import { getBattlePopupModel, type PopupSide } from "../../lib/battlePopup";
import { getBattleSideGroups } from "../../lib/detailAnalytics";
import type { Battle, Participant } from "../../types/domain";

type DetailVisualPanelProps = {
  battle: Battle | null;
  participants: Participant[];
  emptyMessage?: string | null;
  locked?: boolean;
  outOfScope?: boolean;
  outOfMapYear?: boolean;
  onToggleLock?: () => void;
  onClearSelection?: () => void;
  onJumpToEvent?: () => void;
};

function MatchupSide({ side, label }: { side: PopupSide; label: string }) {
  return (
    <div className={`detail-matchup-side ${side.role}`}>
      {side.flag ? (
        <img src={side.flag.src} alt={side.flag.label} />
      ) : (
        <span aria-hidden="true">{side.fallbackCode}</span>
      )}
      <strong>{side.name}</strong>
      <small>{label}</small>
    </div>
  );
}

export function DetailVisualPanel({
  battle,
  participants,
  emptyMessage,
  locked = false,
  outOfScope = false,
  outOfMapYear = false,
  onToggleLock,
  onClearSelection,
  onJumpToEvent,
}: DetailVisualPanelProps) {
  const popupModel = battle ? getBattlePopupModel(battle) : null;
  const sideGroups = battle ? getBattleSideGroups(battle, participants) : null;

  return (
    <section className="side-panel detail-panel detail-visual-panel">
      <div className="section-heading">
        <Info size={18} />
        <h2>事件详情</h2>
      </div>
      {!battle || !popupModel ? (
        <div className="empty-state">{emptyMessage ?? "请选择一个冲突事件以查看详情。"}</div>
      ) : (
        <>
          <div className="detail-title-row">
            <h3>{battle.name}</h3>
            {locked ? <span className="detail-lock-badge"><Lock size={14} />已锁定</span> : null}
          </div>
          {outOfScope || outOfMapYear ? (
            <div className="detail-scope-notice" role="status">
              {outOfScope
                ? "此事件当前不在筛选结果中，锁定状态保留了详情。"
                : "此事件不在当前地图年份中，锁定状态保留了详情。"}
            </div>
          ) : null}
          <div className="detail-actions">
            <button className="secondary-action-button compact" type="button" onClick={onToggleLock}>
              {locked ? <Unlock size={15} /> : <Lock size={15} />}
              {locked ? "解锁事件" : "锁定事件"}
            </button>
            {outOfScope || outOfMapYear ? (
              <button className="secondary-action-button compact" type="button" onClick={onJumpToEvent}>
                <LocateFixed size={15} />
                跳转到事件年份
              </button>
            ) : null}
            <button className="secondary-action-button compact" type="button" onClick={onClearSelection}>
              <Trash2 size={15} />
              清除选择
            </button>
          </div>

          {popupModel.hasReliableSides && popupModel.winner && popupModel.loser ? (
            <div className="detail-matchup" aria-label="冲突胜负双方">
              <MatchupSide side={popupModel.winner} label="胜方" />
              <strong className="detail-matchup-vs">VS</strong>
              <MatchupSide side={popupModel.loser} label="败方" />
            </div>
          ) : (
            <div className="detail-matchup-insufficient">胜负方或历史国家映射数据不足</div>
          )}

          <div className="detail-fact-band">
            <div><small>时间</small><strong>{battle.startDate ?? battle.year}{battle.endDate ? ` 至 ${battle.endDate}` : ""}</strong></div>
            <div><small>地点</small><strong>{battle.locationName ?? "未知地点"}</strong></div>
            <div><small>类型</small><strong>{popupModel.type}</strong></div>
            <div><small>结果</small><strong>{battle.result ?? "未记录"}</strong></div>
          </div>

          {sideGroups ? (
            <div className="detail-side-composition">
              <h4>阵营构成</h4>
              <div className="detail-side-groups">
                <section className="winner">
                  <strong>胜方</strong>
                  <div>{sideGroups.winner.length > 0
                    ? sideGroups.winner.map((name) => <span key={name}>{name}</span>)
                    : <small>未记录</small>}</div>
                </section>
                <section className="loser">
                  <strong>败方</strong>
                  <div>{sideGroups.loser.length > 0
                    ? sideGroups.loser.map((name) => <span key={name}>{name}</span>)
                    : <small>未记录</small>}</div>
                </section>
                {sideGroups.other.length > 0 ? (
                  <section className="other">
                    <strong>其他参战方</strong>
                    <div>{sideGroups.other.map((name) => <span key={name}>{name}</span>)}</div>
                  </section>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
