import { type FormEvent, type MouseEvent, useEffect, useState } from "react";
import { nonTourMissions } from "../data/missions";
import { orderedTours } from "../data/tours";
import { getMissionsForTour } from "../data/missions";
import { campaignModeOptions, getCampaignModeDefinition, getCampaignModeLabel } from "../domain/campaignModes";
import {
  campaignStructureOptions,
  getCampaignStructureDefinition,
  getCampaignStructureLabel,
} from "../domain/campaignStructures";
import {
  archiveCampaign,
  createManualPlayer,
  createCampaign,
  getCampaignDetail,
  type CampaignDetail,
  type CampaignSummary,
  listCampaignSummaries,
  restoreCampaign,
} from "../storage/localDb";
import type { CampaignMode, CampaignStructure } from "../domain/types";

const today = new Date().toISOString().slice(0, 10);
const instructionManualUrl = "/rulebooks/Flight_Group_Alpha_Instruction_Manual_v208_beta_1.pdf";
const missionBriefingsUrl = "/rulebooks/Flight_Group_Alpha_Mission_Briefings_v208_beta_1.pdf";

type SettingHelpKey =
  | "campaignMode"
  | "campaignStructure"
  | "includeNonTourMissions"
  | "startWithIntroductoryMission";

interface SettingHelpReference {
  label: string;
  href: string;
}

interface SettingHelpContent {
  title: string;
  body: string;
  items?: Array<{
    label: string;
    description: Array<string | { text: string; underline?: boolean; strong?: boolean }[]>;
  }>;
  references: SettingHelpReference[];
}

const settingHelp: Record<SettingHelpKey, SettingHelpContent> = {
  campaignMode: {
    title: "Campaign Mode",
    body: "Campaign mode controls mission replayability and whether failed missions award XP.",
    items: [
      {
        label: "Classic",
        description: [
          "Missions can be replayed.",
          "If using the Mission Deck structure, follow the mission-card replay instructions.",
          "Failed missions still award XP.",
        ],
      },
      {
        label: "Completionist",
        description: [
          "Replay any mission until successful.",
          "Failed attempts do not award XP.",
          "XP is gained from only one successful play of each mission.",
        ],
      },
      {
        label: "Ironman",
        description: [
          "Play each mission once; missions cannot be replayed.",
          "Failed missions still award XP.",
          "If using the Mission Deck structure, remove a failed mission card from the deck.",
        ],
      },
    ],
    references: [
      {
        label: "Instruction Manual 1.3.3 Campaign Modes",
        href: `${instructionManualUrl}#page=7`,
      },
      {
        label: "Instruction Manual 1.3.4 Campaign Structure",
        href: `${instructionManualUrl}#page=8`,
      },
    ],
  },
  campaignStructure: {
    title: "Campaign Structure",
    body: "Campaign structure controls how the next mission is chosen.",
    items: [
      {
        label: "Mission Deck",
        description: [
          "The first four tours can be played in parallel.",
          "Separate mission cards 1:1, 2:1, 3:1, and 4:1 into the initial deck.",
          "Draw randomly from the eligible mission cards.",
          "After a successful mission, add the next mission card from that tour to the deck.",
          "Initial Tours are handled first, then Mid-Game Tours, then the Final Tour.",
        ],
      },
      {
        label: "Chronological",
        description: [
          "Start with Tour 1 Mission 1.",
          "Continue through all missions in Tour 1, then move to Tour 2.",
          "Continue this pattern through each tour in order.",
        ],
      },
    ],
    references: [
      {
        label: "Instruction Manual 1.4.1 Mission Deck",
        href: `${instructionManualUrl}#page=10`,
      },
    ],
  },
  includeNonTourMissions: {
    title: "Include Non-Tour Missions",
    body: "This setting only applies when Mission Deck is selected for Campaign Structure.",
    items: [
      {
        label: "Enabled",
        description: [
          "Add non-tour mission cards to the Initial Tours Mission Deck.",
          "Any incomplete non-tour mission cards are added to the Mid-Game Mission Deck.",
        ],
      },
      {
        label: "Disabled",
        description: [
          "Do not add non-tour mission cards to the campaign deck.",
          "Tour missions still follow the normal Mission Deck flow.",
        ],
      },
    ],
    references: [
      {
        label: "Mission Briefings Mission Cards",
        href: `${missionBriefingsUrl}#page=12`,
      },
      {
        label: "Instruction Manual 1.4.1 Mission Deck",
        href: `${instructionManualUrl}#page=10`,
      },
    ],
  },
  startWithIntroductoryMission: {
    title: "Start With Introductory Mission",
    body: "",
    items: [
      {
        label: "Enabled",
        description: [
          [{ text: "Recommended for new cooperative or Flight Group Alpha players.", underline: true }],
          [
            { text: "Play the introductory mission " },
            { text: "Escorting the Decimator", strong: true },
            { text: " (mission 0:1) first." },
          ],
          "After completion, continue with the selected campaign structure.",
          "For Mission Deck, remove mission 0:1 from the deck after completion.",
        ],
      },
      {
        label: "Disabled",
        description: [
          "Skip the introductory mission.",
          "Begin directly with the selected campaign structure.",
        ],
      },
    ],
    references: [
      {
        label: "Instruction Manual 1.3.2 The Introductory Mission",
        href: `${instructionManualUrl}#page=6`,
      },
    ],
  },
};

export function App() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignMode, setCampaignMode] = useState<CampaignMode>("classic");
  const [campaignStructure, setCampaignStructure] = useState<CampaignStructure>("missionDeck");
  const [includeNonTourMissions, setIncludeNonTourMissions] = useState(true);
  const [startWithIntroductoryMission, setStartWithIntroductoryMission] = useState(true);
  const [startDate, setStartDate] = useState(today);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [campaignDetail, setCampaignDetail] = useState<CampaignDetail | null>(null);
  const [isPlayerFormOpen, setIsPlayerFormOpen] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [playerCallSign, setPlayerCallSign] = useState("");
  const [statusMessage, setStatusMessage] = useState("Local campaign data ready.");
  const [isBusy, setIsBusy] = useState(false);
  const [activeHelpKey, setActiveHelpKey] = useState<SettingHelpKey | null>(null);

  useEffect(() => {
    void refreshCampaigns(showArchived);
  }, [showArchived]);

  useEffect(() => {
    if (!activeHelpKey) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveHelpKey(null);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [activeHelpKey]);

  useEffect(() => {
    if (!selectedCampaignId) {
      setCampaignDetail(null);
      return;
    }

    void refreshCampaignDetail(selectedCampaignId);
  }, [selectedCampaignId]);

  const archivedCount = campaigns.filter((campaign) => campaign.status === "archived").length;
  const activeHelp = activeHelpKey ? settingHelp[activeHelpKey] : null;

  async function refreshCampaigns(includeArchived = showArchived) {
    const summaries = await listCampaignSummaries(includeArchived);
    setCampaigns(summaries);
  }

  async function refreshCampaignDetail(campaignId = selectedCampaignId) {
    if (!campaignId) {
      return;
    }

    const detail = await getCampaignDetail(campaignId);
    setCampaignDetail(detail);
  }

  async function handleCreateCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = campaignName.trim();
    if (!trimmedName) {
      setStatusMessage("Campaign name is required.");
      return;
    }

    if (!startDate) {
      setStatusMessage("Campaign start date is required.");
      return;
    }

    setIsBusy(true);
    try {
      const campaign = await createCampaign({
        name: trimmedName,
        campaignMode,
        campaignStructure,
        includeNonTourMissions,
        startWithIntroductoryMission,
        startDate,
      });

      setCampaignName("");
      setCampaignMode("classic");
      setCampaignStructure("missionDeck");
      setIncludeNonTourMissions(true);
      setStartWithIntroductoryMission(true);
      setStartDate(today);
      setIsCreateOpen(false);
      setSelectedCampaignId(campaign.id);
      setStatusMessage(`Campaign created: ${campaign.name}.`);
      await refreshCampaigns();
      await refreshCampaignDetail(campaign.id);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleArchiveCampaign(campaign: CampaignSummary) {
    setIsBusy(true);
    try {
      await archiveCampaign(campaign.id);
      setStatusMessage(`Campaign archived: ${campaign.name}.`);
      if (selectedCampaignId === campaign.id) {
        setSelectedCampaignId(null);
        setCampaignDetail(null);
      }
      await refreshCampaigns();
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRestoreCampaign(campaign: CampaignSummary) {
    setIsBusy(true);
    try {
      await restoreCampaign(campaign.id);
      setStatusMessage(`Campaign restored: ${campaign.name}.`);
      await refreshCampaigns(true);
    } finally {
      setIsBusy(false);
    }
  }

  function handleResumeCampaign(campaign: CampaignSummary) {
    setSelectedCampaignId(campaign.id);
    setStatusMessage(`Campaign loaded: ${campaign.name}.`);
  }

  async function handleCreateManualPlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCampaignId || !campaignDetail) {
      setStatusMessage("Select a campaign before creating a player.");
      return;
    }

    const trimmedName = playerName.trim();
    if (!trimmedName) {
      setStatusMessage("Player name is required.");
      return;
    }

    setIsBusy(true);
    try {
      const player = await createManualPlayer({
        campaignId: selectedCampaignId,
        name: trimmedName,
        callSign: playerCallSign.trim(),
      });

      setPlayerName("");
      setPlayerCallSign("");
      setIsPlayerFormOpen(false);
      setStatusMessage(`Manual player created: ${player.name}.`);
      await refreshCampaigns();
      await refreshCampaignDetail(selectedCampaignId);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main className="app-shell" id="app-shell">
      <aside className="side-rail" id="side-rail" aria-label="Application navigation">
        <div className="brand-mark" id="brand-mark">FGA</div>
        <nav className="nav-stack" id="primary-nav">
          <a className="nav-link nav-link-active" id="nav-campaigns" href="#campaigns">
            Campaigns
          </a>
          <a className="nav-link" id="nav-missions" href="#missions">
            Missions
          </a>
          <a className="nav-link" id="nav-tracker" href="#tracker">
            Turn Tracker
          </a>
          <a className="nav-link" id="nav-data" href="#data">
            Data
          </a>
        </nav>
      </aside>

      <section className="work-surface" id="work-surface">
        <header className="command-header" id="command-header">
          <div>
            <p className="eyebrow" id="command-header-eyebrow">FGA Datapad</p>
            <h1 id="page-title">Campaign Hub</h1>
          </div>
          <div className="header-actions" id="campaign-actions" aria-label="Campaign actions">
            <button type="button" id="button-join-campaign" disabled={isBusy}>
              Join Campaign
            </button>
            <button
              type="button"
              className="primary-action"
              id="button-create-campaign"
              disabled={isBusy}
              onClick={() => setIsCreateOpen((current) => !current)}
            >
              Create Campaign
            </button>
          </div>
        </header>

        <section className="campaign-panel" id="campaigns">
          <div className="panel-heading" id="campaigns-heading">
            <div>
              <p className="eyebrow" id="campaigns-eyebrow">Active Operations</p>
              <h2 id="campaigns-title">Campaigns</h2>
            </div>
            <label className="toggle-label" id="label-show-archived-campaigns">
              <input
                type="checkbox"
                id="toggle-show-archived-campaigns"
                checked={showArchived}
                onChange={(event) => setShowArchived(event.target.checked)}
              />
              Show archived
            </label>
          </div>

          <p className="status-line" id="campaign-status-message" role="status">
            {statusMessage}
          </p>

          {isCreateOpen && (
            <form className="create-campaign-form" id="form-create-campaign" onSubmit={handleCreateCampaign}>
              <div className="create-campaign-form-row" id="create-campaign-form-row-identity">
                <label id="label-campaign-name">
                  Campaign name
                  <input
                    id="input-campaign-name"
                    value={campaignName}
                    onChange={(event) => setCampaignName(event.target.value)}
                    placeholder="Outpost D-34 Patrol"
                    required
                  />
                </label>
                <label id="label-campaign-start-date">
                  Start date
                  <input
                    id="input-campaign-start-date"
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    required
                  />
                </label>
              </div>
              <div className="create-campaign-form-row" id="create-campaign-form-row-rules">
                <label id="label-campaign-mode">
                  <span className="field-label-row" id="label-row-campaign-mode">
                    <span id="label-text-campaign-mode">Campaign mode</span>
                    <InfoButton
                      id="button-info-campaign-mode"
                      helpKey="campaignMode"
                      onOpen={setActiveHelpKey}
                    />
                  </span>
                  <select
                    id="select-campaign-mode"
                    value={campaignMode}
                    onChange={(event) => setCampaignMode(event.target.value as CampaignMode)}
                    required
                  >
                    {campaignModeOptions.map((mode) => (
                      <option id={`option-campaign-mode-${mode.id}`} value={mode.id} key={mode.id}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label id="label-campaign-structure">
                  <span className="field-label-row" id="label-row-campaign-structure">
                    <span id="label-text-campaign-structure">Campaign structure</span>
                    <InfoButton
                      id="button-info-campaign-structure"
                      helpKey="campaignStructure"
                      onOpen={setActiveHelpKey}
                    />
                  </span>
                  <select
                    id="select-campaign-structure"
                    value={campaignStructure}
                    onChange={(event) => setCampaignStructure(event.target.value as CampaignStructure)}
                    required
                  >
                    {campaignStructureOptions.map((structure) => (
                      <option id={`option-campaign-structure-${structure.id}`} value={structure.id} key={structure.id}>
                        {structure.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="create-campaign-form-row checkbox-row" id="create-campaign-form-row-options">
                <div className="checkbox-field" id="field-start-with-introductory-mission">
                  <label className="checkbox-label" id="label-start-with-introductory-mission">
                    <input
                      type="checkbox"
                      id="checkbox-start-with-introductory-mission"
                      checked={startWithIntroductoryMission}
                      onChange={(event) => setStartWithIntroductoryMission(event.target.checked)}
                    />
                    Start with introductory mission
                  </label>
                  <InfoButton
                    id="button-info-start-with-introductory-mission"
                    helpKey="startWithIntroductoryMission"
                    onOpen={setActiveHelpKey}
                  />
                </div>
                {campaignStructure === "missionDeck" && (
                <div className="checkbox-field" id="field-include-non-tour-missions">
                  <label className="checkbox-label" id="label-include-non-tour-missions">
                    <input
                      type="checkbox"
                      id="checkbox-include-non-tour-missions"
                      checked={includeNonTourMissions}
                      onChange={(event) => setIncludeNonTourMissions(event.target.checked)}
                    />
                    Include non-tour missions
                  </label>
                  <InfoButton
                    id="button-info-include-non-tour-missions"
                    helpKey="includeNonTourMissions"
                    onOpen={setActiveHelpKey}
                  />
                </div>
                )}
              </div>
              <div className="form-actions" id="create-campaign-form-actions">
                <button type="button" id="button-cancel-create-campaign" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-action" id="button-submit-create-campaign" disabled={isBusy}>
                  Save Campaign
                </button>
              </div>
            </form>
          )}

          <div className="campaign-table" id="campaign-table" role="table" aria-label="Campaigns">
            <div className="table-row table-head" id="campaign-table-header" role="row">
              <span id="campaign-table-column-campaign" role="columnheader">Campaign</span>
              <span id="campaign-table-column-manager" role="columnheader">Manager</span>
              <span id="campaign-table-column-mode" role="columnheader">Mode</span>
              <span id="campaign-table-column-structure" role="columnheader">Structure</span>
              <span id="campaign-table-column-players" role="columnheader">Players</span>
              <span id="campaign-table-column-current-mission" role="columnheader">Current Mission</span>
              <span id="campaign-table-column-action" role="columnheader">Action</span>
            </div>
            {campaigns.map((campaign) => (
              <div
                className={[
                  "table-row",
                  campaign.status === "archived" ? "table-row-muted" : "",
                  selectedCampaignId === campaign.id ? "table-row-selected" : "",
                ].join(" ")}
                id={`campaign-row-${campaign.id}`}
                role="row"
                key={campaign.id}
              >
                <span id={`campaign-row-${campaign.id}-name`} role="cell">
                  <strong id={`campaign-row-${campaign.id}-title`}>{campaign.name}</strong>
                  <small id={`campaign-row-${campaign.id}-start-date`}>Started {campaign.startDate}</small>
                </span>
                <span id={`campaign-row-${campaign.id}-manager`} role="cell">{campaign.manager}</span>
                <span id={`campaign-row-${campaign.id}-mode`} role="cell">
                  {getCampaignModeLabel(campaign.mode)}
                </span>
                <span id={`campaign-row-${campaign.id}-structure`} role="cell">
                  {getCampaignStructureLabel(campaign.structure)}
                </span>
                <span id={`campaign-row-${campaign.id}-players`} role="cell">{campaign.players}</span>
                <span id={`campaign-row-${campaign.id}-active-mission`} role="cell">{campaign.activeMission}</span>
                <span id={`campaign-row-${campaign.id}-action`} role="cell" className="row-actions">
                  <button
                    type="button"
                    className="compact-action"
                    id={`button-resume-${campaign.id}`}
                    disabled={isBusy || campaign.status === "archived"}
                    onClick={() => handleResumeCampaign(campaign)}
                  >
                    Resume
                  </button>
                  {campaign.status === "archived" ? (
                    <button
                      type="button"
                      className="compact-action"
                      id={`button-restore-${campaign.id}`}
                      disabled={isBusy}
                      onClick={() => handleRestoreCampaign(campaign)}
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="compact-action"
                      id={`button-archive-${campaign.id}`}
                      disabled={isBusy}
                      onClick={() => handleArchiveCampaign(campaign)}
                    >
                      Archive
                    </button>
                  )}
                </span>
              </div>
            ))}
            {campaigns.length === 0 && (
              <div className="empty-row" id="campaign-table-empty-row" role="row">
                <span id="campaign-table-empty-message" role="cell">
                  No campaigns found. Create one to begin operations.
                </span>
              </div>
            )}
          </div>

          <div className="archived-strip" id="archived-campaigns-preview" aria-label="Archived campaigns preview">
            <span id="archived-campaigns-label">Archived campaigns visible:</span>
            <strong id="archived-campaigns-count">{archivedCount}</strong>
          </div>
        </section>

        <section className="campaign-detail-panel" id="campaign-detail">
          <div className="panel-heading" id="campaign-detail-heading">
            <div id="campaign-detail-title-block">
              <p className="eyebrow" id="campaign-detail-eyebrow">Campaign Roster</p>
              <h2 id="campaign-detail-title">
                {campaignDetail ? campaignDetail.campaign.name : "Select a Campaign"}
              </h2>
            </div>
            <div className="header-actions" id="campaign-detail-actions">
              <button
                type="button"
                className="primary-action"
                id="button-add-manual-player"
                disabled={isBusy || !campaignDetail || campaignDetail.campaign.status === "archived"}
                onClick={() => setIsPlayerFormOpen((current) => !current)}
              >
                Add Manual Player
              </button>
            </div>
          </div>

          {campaignDetail ? (
            <>
              <div className="campaign-detail-grid" id="campaign-detail-grid">
                <div className="detail-field" id="campaign-detail-manager">
                  <span id="campaign-detail-manager-label">Campaign Manager</span>
                  <strong id="campaign-detail-manager-value">{campaignDetail.managerName}</strong>
                </div>
                <div className="detail-field" id="campaign-detail-mode">
                  <span id="campaign-detail-mode-label">Mode</span>
                  <strong id="campaign-detail-mode-value">
                    {getCampaignModeLabel(campaignDetail.campaign.campaignMode)}
                  </strong>
                </div>
                <div className="detail-field" id="campaign-detail-replayability">
                  <span id="campaign-detail-replayability-label">Replayability</span>
                  <strong id="campaign-detail-replayability-value">
                    {getCampaignModeDefinition(campaignDetail.campaign.campaignMode).missionReplayability}
                  </strong>
                </div>
                <div className="detail-field" id="campaign-detail-structure">
                  <span id="campaign-detail-structure-label">Structure</span>
                  <strong id="campaign-detail-structure-value">
                    {getCampaignStructureLabel(campaignDetail.campaign.campaignStructure)}
                  </strong>
                </div>
                <div className="detail-field detail-field-wide" id="campaign-detail-structure-summary">
                  <span id="campaign-detail-structure-summary-label">Mission Selection</span>
                  <strong id="campaign-detail-structure-summary-value">
                    {getCampaignStructureDefinition(campaignDetail.campaign.campaignStructure).summary}
                  </strong>
                </div>
                {campaignDetail.campaign.campaignStructure === "missionDeck" && (
                  <div className="detail-field" id="campaign-detail-non-tour-missions">
                    <span id="campaign-detail-non-tour-missions-label">Non-Tour Missions</span>
                    <strong id="campaign-detail-non-tour-missions-value">
                      {campaignDetail.campaign.includeNonTourMissions ? "Included" : "Excluded"}
                    </strong>
                  </div>
                )}
                <div className="detail-field" id="campaign-detail-introductory-mission">
                  <span id="campaign-detail-introductory-mission-label">Introductory Mission</span>
                  <strong id="campaign-detail-introductory-mission-value">
                    {campaignDetail.campaign.startWithIntroductoryMission ? "Starts with 0:1" : "Skipped"}
                  </strong>
                </div>
                <div className="detail-field" id="campaign-detail-failed-xp">
                  <span id="campaign-detail-failed-xp-label">Failed Mission XP</span>
                  <strong id="campaign-detail-failed-xp-value">
                    {getCampaignModeDefinition(campaignDetail.campaign.campaignMode).awardsXpForFailedMission
                      ? "Allowed"
                      : "Not awarded"}
                  </strong>
                </div>
                <div className="detail-field" id="campaign-detail-start-date">
                  <span id="campaign-detail-start-date-label">Start Date</span>
                  <strong id="campaign-detail-start-date-value">{campaignDetail.campaign.startDate}</strong>
                </div>
                <div className="detail-field" id="campaign-detail-status">
                  <span id="campaign-detail-status-label">Status</span>
                  <strong id="campaign-detail-status-value">{campaignDetail.campaign.status}</strong>
                </div>
                <div className="detail-field" id="campaign-detail-participants">
                  <span id="campaign-detail-participants-label">Participants</span>
                  <strong id="campaign-detail-participants-value">
                    {campaignDetail.participants.filter((participant) => participant.status === "active").length}
                  </strong>
                </div>
                <div className="detail-field" id="campaign-detail-players">
                  <span id="campaign-detail-players-label">Players</span>
                  <strong id="campaign-detail-players-value">{campaignDetail.players.length}</strong>
                </div>
              </div>

              {isPlayerFormOpen && (
                <form className="player-form" id="form-create-manual-player" onSubmit={handleCreateManualPlayer}>
                  <label id="label-player-name">
                    Player name
                    <input
                      id="input-player-name"
                      value={playerName}
                      onChange={(event) => setPlayerName(event.target.value)}
                      placeholder="Pilot name"
                    />
                  </label>
                  <label id="label-player-call-sign">
                    Call sign
                    <input
                      id="input-player-call-sign"
                      value={playerCallSign}
                      onChange={(event) => setPlayerCallSign(event.target.value)}
                      placeholder="Red Two"
                    />
                  </label>
                  <div className="form-actions" id="create-manual-player-form-actions">
                    <button
                      type="button"
                      id="button-cancel-create-manual-player"
                      disabled={isBusy}
                      onClick={() => setIsPlayerFormOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="primary-action"
                      id="button-submit-create-manual-player"
                      disabled={isBusy}
                    >
                      Save Player
                    </button>
                  </div>
                </form>
              )}

              <div className="player-table" id="player-table" role="table" aria-label="Campaign players">
                <div className="player-row player-table-head" id="player-table-header" role="row">
                  <span id="player-table-column-player" role="columnheader">Player</span>
                  <span id="player-table-column-owner" role="columnheader">Owner</span>
                  <span id="player-table-column-xp" role="columnheader">Banked XP</span>
                  <span id="player-table-column-um" role="columnheader">U&amp;M</span>
                  <span id="player-table-column-cpp" role="columnheader">CCP</span>
                  <span id="player-table-column-kills" role="columnheader">Kills</span>
                  <span id="player-table-column-status" role="columnheader">Status</span>
                </div>
                {campaignDetail.players.map((player) => (
                  <div className="player-row" id={`player-row-${player.id}`} role="row" key={player.id}>
                    <span id={`player-row-${player.id}-name`} role="cell">
                      <strong id={`player-row-${player.id}-title`}>{player.name}</strong>
                      <small id={`player-row-${player.id}-call-sign`}>
                        Call sign: {player.callSign || "None"}
                      </small>
                    </span>
                    <span id={`player-row-${player.id}-owner`} role="cell">
                      {player.owner}
                      {player.isManual && (
                        <small id={`player-row-${player.id}-manual-label`}>Manual player</small>
                      )}
                    </span>
                    <span id={`player-row-${player.id}-banked-xp`} role="cell">{player.stats.bankedXp}</span>
                    <span id={`player-row-${player.id}-banked-um`} role="cell">{player.stats.bankedUmPoints}</span>
                    <span id={`player-row-${player.id}-banked-cpp`} role="cell">{player.stats.bankedCpp}</span>
                    <span id={`player-row-${player.id}-enemy-kills`} role="cell">{player.stats.enemyKills}</span>
                    <span id={`player-row-${player.id}-status`} role="cell">{player.status}</span>
                  </div>
                ))}
                {campaignDetail.players.length === 0 && (
                  <div className="empty-row" id="player-table-empty-row" role="row">
                    <span id="player-table-empty-message" role="cell">
                      No players assigned. Add a manual player to start building the roster.
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-row" id="campaign-detail-empty-state">
              <span id="campaign-detail-empty-message">
                Create or resume a campaign to manage its players.
              </span>
            </div>
          )}
        </section>

        <section className="mission-index" id="missions">
          <div className="panel-heading" id="missions-heading">
            <div>
              <p className="eyebrow" id="missions-eyebrow">Mission Deck</p>
              <h2 id="missions-title">Tour Index</h2>
            </div>
          </div>

          <div className="tour-list" id="tour-list">
            {orderedTours.map((tour) => (
              <article className="tour-row" id={`tour-row-${tour.id}`} key={tour.id}>
                <div className="tour-code" id={`tour-row-${tour.id}-code`}>TOD {tour.tourNumber}</div>
                <div>
                  <h3 id={`tour-row-${tour.id}-name`}>{tour.name}</h3>
                  <p id={`tour-row-${tour.id}-summary`}>
                    {tour.categoryName} · {getMissionsForTour(tour.id).length} missions
                  </p>
                </div>
              </article>
            ))}
            <article className="tour-row" id="tour-row-non-tour">
              <div className="tour-code" id="tour-row-non-tour-code">NT</div>
              <div>
                <h3 id="tour-row-non-tour-name">Non-Tour Missions</h3>
                <p id="tour-row-non-tour-summary">{nonTourMissions.length} standalone missions</p>
              </div>
            </article>
          </div>
        </section>
      </section>

      {activeHelp && (
        <div
          className="modal-backdrop"
          id="help-modal-backdrop"
          role="presentation"
          onClick={() => setActiveHelpKey(null)}
        >
          <section
            className="help-modal"
            id="help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header" id="help-modal-header">
              <div id="help-modal-title-block">
                <p className="eyebrow" id="help-modal-eyebrow">Rule Reference</p>
                <h2 id="help-modal-title">{activeHelp.title}</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                id="button-close-help-modal"
                aria-label="Close setting information"
                title="Close"
                onClick={() => setActiveHelpKey(null)}
              >
                X
              </button>
            </div>
            {activeHelp.body && (
              <p className="help-modal-body" id="help-modal-body">
                {activeHelp.body}
              </p>
            )}
            {activeHelp.items && (
              <div className="help-modal-list" id="help-modal-list">
                {activeHelp.items.map((item, index) => (
                  <div className="help-modal-list-item" id={`help-modal-list-item-${index + 1}`} key={item.label}>
                    <strong id={`help-modal-list-item-${index + 1}-label`}>{item.label}</strong>
                    <span id={`help-modal-list-item-${index + 1}-description`}>
                      {item.description.map((line, lineIndex) => (
                        <span
                          className="help-modal-list-line"
                          id={`help-modal-list-item-${index + 1}-line-${lineIndex + 1}`}
                          key={typeof line === "string" ? line : lineIndex}
                        >
                          {typeof line === "string"
                            ? line
                            : line.map((part, partIndex) => {
                                const content = part.strong ? <strong>{part.text}</strong> : part.text;
                                return part.underline ? <u key={partIndex}>{content}</u> : <span key={partIndex}>{content}</span>;
                              })}
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="rulebook-links" id="help-modal-rulebook-links">
              {activeHelp.references.map((reference, index) => (
                <a
                  id={`help-modal-rulebook-link-${index + 1}`}
                  href={reference.href}
                  target="_blank"
                  rel="noreferrer"
                  key={reference.href}
                >
                  {reference.label}
                </a>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function InfoButton({
  id,
  helpKey,
  onOpen,
}: {
  id: string;
  helpKey: SettingHelpKey;
  onOpen: (helpKey: SettingHelpKey) => void;
}) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    onOpen(helpKey);
  }

  return (
    <button
      type="button"
      className="info-button"
      id={id}
      aria-label={`Open help about ${settingHelp[helpKey].title}`}
      title={`Help: ${settingHelp[helpKey].title}`}
      onClick={handleClick}
    >
      ?
    </button>
  );
}
