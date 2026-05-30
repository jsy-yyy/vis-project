import { battles, participants, wars } from "../data/mockData";
import type { Battle, Participant, War } from "../types/domain";

type BattleDataState = {
  battles: Battle[];
  wars: War[];
  participants: Participant[];
  loading: boolean;
  error: Error | null;
};

export function useBattleData(): BattleDataState {
  return {
    battles,
    wars,
    participants,
    loading: false,
    error: null,
  };
}
