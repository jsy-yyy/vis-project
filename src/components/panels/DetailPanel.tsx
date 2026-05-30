import { Info } from "lucide-react";
import type { Battle, Participant, War } from "../../types/domain";

type DetailPanelProps = {
  battle: Battle | null;
  wars: War[];
  participants: Participant[];
};

function lookupName(id: string, rows: Array<{ id: string; name: string }>) {
  return rows.find((row) => row.id === id)?.name ?? id;
}

export function DetailPanel({ battle, wars, participants }: DetailPanelProps) {
  return (
    <section className="side-panel detail-panel">
      <div className="section-heading">
        <Info size={18} />
        <h2>Detail</h2>
      </div>
      {!battle ? (
        <div className="empty-state">Select a battle to inspect its fields.</div>
      ) : (
        <>
          <h3>{battle.name}</h3>
          <p>{battle.description}</p>
          <dl className="detail-list">
            <div>
              <dt>War</dt>
              <dd>{lookupName(battle.warId, wars)}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>
                {battle.startDate ?? battle.year}
                {battle.endDate ? ` to ${battle.endDate}` : ""}
              </dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{battle.locationName ?? `${battle.latitude}, ${battle.longitude}`}</dd>
            </div>
            <div>
              <dt>Participants</dt>
              <dd>{battle.participants.map((id) => lookupName(id, participants)).join(", ")}</dd>
            </div>
            <div>
              <dt>Result</dt>
              <dd>{battle.result ?? "Unknown"}</dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}
