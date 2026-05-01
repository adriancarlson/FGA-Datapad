import type { CampaignMode, CampaignModeReplayRule } from "./types";

export interface CampaignModeDefinition {
  id: CampaignMode;
  label: string;
  missionReplayability: string;
  replayRule: CampaignModeReplayRule;
  awardsXpForFailedMission: boolean;
  comments: string;
}

export const campaignModeDefinitions: Record<CampaignMode, CampaignModeDefinition> = {
  classic: {
    id: "classic",
    label: "Classic",
    missionReplayability: "Only if stated on mission cards",
    replayRule: "missionCard",
    awardsXpForFailedMission: true,
    comments: "Pilot progression depends on mission success and tour consequences.",
  },
  completionist: {
    id: "completionist",
    label: "Completionist",
    missionReplayability: "Always",
    replayRule: "always",
    awardsXpForFailedMission: false,
    comments: "Failed missions can be replayed, but failed attempts do not award XP.",
  },
  ironman: {
    id: "ironman",
    label: "Ironman",
    missionReplayability: "Never",
    replayRule: "never",
    awardsXpForFailedMission: true,
    comments: "Reshuffle and replay instructions are ignored after failure.",
  },
};

export const campaignModeOptions = Object.values(campaignModeDefinitions);

export function getCampaignModeLabel(mode: CampaignMode | string): string {
  return getCampaignModeDefinition(mode).label;
}

export function getCampaignModeDefinition(mode: CampaignMode | string): CampaignModeDefinition {
  if (isCampaignMode(mode)) {
    return campaignModeDefinitions[mode];
  }

  return campaignModeDefinitions.classic;
}

function isCampaignMode(mode: string): mode is CampaignMode {
  return mode === "classic" || mode === "completionist" || mode === "ironman";
}
