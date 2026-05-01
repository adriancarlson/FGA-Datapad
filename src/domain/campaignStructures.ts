import type { CampaignStructure } from "./types";

export interface CampaignStructureDefinition {
  id: CampaignStructure;
  label: string;
  summary: string;
}

export const campaignStructureDefinitions: Record<CampaignStructure, CampaignStructureDefinition> = {
  missionDeck: {
    id: "missionDeck",
    label: "Mission Deck",
    summary: "Draw eligible missions from the campaign deck and add follow-up cards after success.",
  },
  chronological: {
    id: "chronological",
    label: "Chronological",
    summary: "Play missions in tour and part order from Tour 1 through the final tour.",
  },
};

export const campaignStructureOptions = Object.values(campaignStructureDefinitions);

export function getCampaignStructureLabel(structure: CampaignStructure | string | undefined): string {
  return getCampaignStructureDefinition(structure).label;
}

export function getCampaignStructureDefinition(
  structure: CampaignStructure | string | undefined,
): CampaignStructureDefinition {
  if (structure === "chronological" || structure === "missionDeck") {
    return campaignStructureDefinitions[structure];
  }

  return campaignStructureDefinitions.missionDeck;
}
