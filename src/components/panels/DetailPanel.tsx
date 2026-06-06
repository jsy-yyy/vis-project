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

function formatActor(actor: NonNullable<Battle["actors"]>[number]) {
  const target = actor.mapTarget ? ` -> ${actor.mapTarget}` : "";
  return `${actor.name}${target} (${actor.role}, ${actor.type}, ${actor.confidence}, ${actor.status})`;
}

export function DetailPanel({ battle, wars, participants }: DetailPanelProps) {
  return (
    <section className="side-panel detail-panel">
      <div className="section-heading">
        <Info size={18} />
        <h2>Detail</h2>
      </div>
      {!battle ? (
        <div className="empty-state">Select a conflict event to inspect its fields.</div>
      ) : (
        <>
          <h3>{battle.name}</h3>
          <p>{battle.description}</p>
          <dl className="detail-list">
            <div>
              <dt>Conflict group</dt>
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
              <dd>
                {battle.participantNames?.length
                  ? battle.participantNames.join(", ")
                  : battle.participants.map((id) => lookupName(id, participants)).join(", ") || "Unmapped"}
              </dd>
            </div>
            {battle.rawParticipantNames?.length ? (
              <div>
                <dt>Raw participants</dt>
                <dd>{battle.rawParticipantNames.join(", ")}</dd>
              </div>
            ) : null}
            <div>
              <dt>Winner</dt>
              <dd>{battle.winnerNames?.join(", ") || "Unknown"}</dd>
            </div>
            <div>
              <dt>Loser</dt>
              <dd>{battle.loserNames?.join(", ") || "Unknown"}</dd>
            </div>
            {battle.actors?.length ? (
              <div>
                <dt>Actors</dt>
                <dd>{battle.actors.map(formatActor).join("; ")}</dd>
              </div>
            ) : null}
            <div>
              <dt>Result</dt>
              <dd>{battle.result ?? "Unknown"}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{battle.type ?? "Conflict event"}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{battle.source ?? "Historical Conflict Event Dataset"}</dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}
