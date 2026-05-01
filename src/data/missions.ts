import missionData from "../../missions.json";
import type { Mission, MissionReplayability } from "../domain/types";

type MissionDataRecord = Omit<Mission, "replayability">;

const campaignModeReplayability: MissionReplayability = {
  policy: "campaignMode",
  byCampaignMode: {
    classic: "missionCard",
    completionist: "always",
    ironman: "never",
  },
};

export const missions = (missionData as MissionDataRecord[]).map((mission) => ({
  ...mission,
  replayability: campaignModeReplayability,
})) satisfies Mission[];

export const nonTourMissions = missions.filter((mission) => mission.tourId === null);

export function getMissionsForTour(tourId: string): Mission[] {
  return missions
    .filter((mission) => mission.tourId === tourId)
    .sort((a, b) => a.partNumber - b.partNumber);
}
