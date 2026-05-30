import { Share2 } from "lucide-react";
import type { Battle, Participant } from "../../types/domain";

type NetworkViewProps = {
  battles: Battle[];
  participants: Participant[];
  selectedParticipant: string | null;
  onSelectParticipant: (participantId: string | null) => void;
};

function countParticipantBattles(battles: Battle[]) {
  const counts = new Map<string, number>();

  for (const battle of battles) {
    for (const participantId of battle.participants) {
      counts.set(participantId, (counts.get(participantId) ?? 0) + 1);
    }
  }

  return counts;
}

export function NetworkView({ battles, participants, selectedParticipant, onSelectParticipant }: NetworkViewProps) {
  const counts = countParticipantBattles(battles);
  const visibleParticipants = participants.filter((participant) => counts.has(participant.id));

  return (
    <section className="view-panel network-panel">
      <div className="section-heading">
        <Share2 size={18} />
        <h2>Network View</h2>
      </div>
      {visibleParticipants.length === 0 ? (
        <div className="empty-state">No participant network for the current filters.</div>
      ) : (
        <div className="network-stage">
          {visibleParticipants.map((participant, index) => {
            const selected = selectedParticipant === participant.id;
            return (
              <button
                key={participant.id}
                className={selected ? "network-node active" : "network-node"}
                style={{ "--node-index": index } as React.CSSProperties}
                type="button"
                onClick={() => onSelectParticipant(selected ? null : participant.id)}
              >
                <span>{participant.name}</span>
                <small>{counts.get(participant.id)} battles</small>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
