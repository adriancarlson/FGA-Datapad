import { type FormEvent, type MouseEvent, useEffect, useState } from "react";
import { campaignModeOptions, getCampaignModeLabel } from "../domain/campaignModes";
import {
  campaignStructureOptions,
  getCampaignStructureLabel,
} from "../domain/campaignStructures";
import {
  createCampaign,
  ensureLocalUser,
  type CampaignSummary,
  listCampaignSummaries,
} from "../storage/localDb";
import type { CampaignMode, CampaignStructure, User } from "../domain/types";

const today = new Date().toISOString().slice(0, 10);
const instructionManualUrl = "/rulebooks/Flight_Group_Alpha_Instruction_Manual_v208_beta_1.pdf";
const missionBriefingsUrl = "/rulebooks/Flight_Group_Alpha_Mission_Briefings_v208_beta_1.pdf";
const panelTransitionMs = 220;

function formatDisplayDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);

  if (!year || !month || !day) {
    return isoDate;
  }

  return new Date(year, month - 1, day).toLocaleDateString();
}

type SettingHelpKey =
  | "campaignMode"
  | "campaignStructure"
  | "includeNonTourMissions"
  | "startWithIntroductoryMission"
  | "campaignManager"
  | "player";

type HelpLine = string | { text: string; underline?: boolean; strong?: boolean }[];

interface SettingHelpReference {
  label: string;
  href: string;
}

interface SettingHelpContent {
  title: string;
  eyebrow?: string;
  body: string | HelpLine[];
  items?: Array<{
    label: string;
    description: HelpLine[];
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
  campaignManager: {
    title: "Campaign Manager",
    eyebrow: "Datapad Reference",
    body: "The Campaign Manager runs the campaign session, controls enemy AI, handles end-of-turn steps, manages pilot setup, and can adjust pilot records for this campaign. Campaign Managers can create manual pilots that are not tied to a user account. The Campaign Manager can also fly as a pilot, or can run the campaign without a pilot record.",
    references: [],
  },
  player: {
    title: "Pilot",
    eyebrow: "Datapad Reference",
    body: [
      [
        { text: "Pilots serve in " },
        { text: "Flight Group Alpha", strong: true },
        { text: ", a small group of Academy pilots in the Imperial Navy." },
      ],
      "A user can control one or more pilots in a campaign.",
      "Pilot records track campaign progress such as XP, upgrades, missions completed, ships flown, ejections, enemy kills, and career progression.",
    ],
    references: [],
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
  const [createCampaignAttempted, setCreateCampaignAttempted] = useState(false);
  const [isCreatePanelEntering, setIsCreatePanelEntering] = useState(false);
  const [isCreatePanelClosing, setIsCreatePanelClosing] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [launchSetupCampaign, setLaunchSetupCampaign] = useState<CampaignSummary | null>(null);
  const [isCampaignPanelClosing, setIsCampaignPanelClosing] = useState(false);
  const [isLaunchSetupClosing, setIsLaunchSetupClosing] = useState(false);
  const [isReturningFromLaunch, setIsReturningFromLaunch] = useState(false);
  const [currentUserIsCampaignManager, setCurrentUserIsCampaignManager] = useState<"yes" | "no" | null>(null);
  const [campaignManagerPlayerRole, setCampaignManagerPlayerRole] = useState<"managerAndPlayer" | "managerOnly" | null>(null);
  const [campaignManagerQuestionAttempted, setCampaignManagerQuestionAttempted] = useState(false);
  const [playerRoleQuestionAttempted, setPlayerRoleQuestionAttempted] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [activeHelpKey, setActiveHelpKey] = useState<SettingHelpKey | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    void ensureLocalUser().then(setCurrentUser);
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


  const activeHelp = activeHelpKey ? settingHelp[activeHelpKey] : null;
  const isLoggedInPreview = true;
  const currentUserName = isLoggedInPreview
    ? "Adrian"
    : currentUser?.accountType === "guest"
      ? "Guest"
      : currentUser?.displayName ?? currentUser?.username ?? "Commander";
  const isGuestSession = isLoggedInPreview ? false : currentUser?.accountType !== "registered";
  const visibleCampaigns = showArchived
    ? campaigns.filter((campaign) => campaign.status === "archived")
    : campaigns.filter((campaign) => campaign.status !== "archived");
  const isCampaignNameMissing = campaignName.trim().length === 0;
  const isStartDateMissing = startDate.length === 0;
  const isCampaignModeMissing = campaignMode.length === 0;
  const isCampaignStructureMissing = campaignStructure.length === 0;

  useEffect(() => {
    if (!isGuestSession || campaigns.length === 0) {
      return;
    }

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [campaigns.length, isGuestSession]);

  async function refreshCampaigns(includeArchived = showArchived) {
    const summaries = await listCampaignSummaries(includeArchived);
    setCampaigns(summaries);
  }

  function resetCreateCampaignForm() {
    setCampaignName("");
    setCampaignMode("classic");
    setCampaignStructure("missionDeck");
    setIncludeNonTourMissions(true);
    setStartWithIntroductoryMission(true);
    setStartDate(today);
    setCreateCampaignAttempted(false);
  }

  function handleOpenCreateCampaign() {
    if (isCreateOpen) {
      return;
    }

    setCreateCampaignAttempted(false);
    setIsCreatePanelClosing(false);
    setIsCreateOpen(true);
    setIsCreatePanelEntering(true);

    window.setTimeout(() => {
      setIsCreatePanelEntering(false);
    }, panelTransitionMs);
  }

  function handleCancelCreateCampaign() {
    if (isCreatePanelClosing) {
      return;
    }

    setIsCreatePanelClosing(true);

    window.setTimeout(() => {
      resetCreateCampaignForm();
      setIsCreateOpen(false);
      setIsCreatePanelClosing(false);
    }, panelTransitionMs);
  }


  async function handleCreateCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateCampaignAttempted(true);

    const trimmedName = campaignName.trim();
    if (!trimmedName) {
      return;
    }

    if (!startDate) {
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

      resetCreateCampaignForm();
      setIsCreateOpen(false);
      setSelectedCampaignId(campaign.id);
      await refreshCampaigns();
    } finally {
      setIsBusy(false);
    }
  }


  function handleResumeCampaign(campaign: CampaignSummary) {
    setSelectedCampaignId(campaign.id);

    if (!campaign.launchedAt) {
      if (isCampaignPanelClosing) {
        return;
      }

      setIsCampaignPanelClosing(true);
      setIsLaunchSetupClosing(false);
      setIsReturningFromLaunch(false);
      setCurrentUserIsCampaignManager(null);
      setCampaignManagerPlayerRole(null);
      setCampaignManagerQuestionAttempted(false);
      setPlayerRoleQuestionAttempted(false);

      window.setTimeout(() => {
        setLaunchSetupCampaign(campaign);
        setIsCampaignPanelClosing(false);
      }, panelTransitionMs);
    }
  }

  function handleCancelLaunchSetup() {
    if (isLaunchSetupClosing) {
      return;
    }

    setIsLaunchSetupClosing(true);

    window.setTimeout(() => {
      setLaunchSetupCampaign(null);
      setCurrentUserIsCampaignManager(null);
      setCampaignManagerPlayerRole(null);
      setCampaignManagerQuestionAttempted(false);
      setPlayerRoleQuestionAttempted(false);
      setIsLaunchSetupClosing(false);
      setIsReturningFromLaunch(true);

      window.setTimeout(() => {
        setIsReturningFromLaunch(false);
      }, panelTransitionMs);
    }, panelTransitionMs);
  }

  function handleLaunchSetupNext(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCampaignManagerQuestionAttempted(true);

    if (!currentUserIsCampaignManager) {
      return;
    }

    if (currentUserIsCampaignManager === "yes") {
      setPlayerRoleQuestionAttempted(true);
    }

    if (currentUserIsCampaignManager === "yes" && !campaignManagerPlayerRole) {
      return;
    }
  }


  return (
    <main className="app-shell" id="app-shell">
      <section className="work-surface" id="work-surface">
        <section className="welcome-panel" id="welcome-user-panel" aria-labelledby="welcome-user-title">
          {isGuestSession && <span className="session-badge" id="guest-session-badge">Guest Session</span>}
          <div className="welcome-panel-content" id="welcome-user-panel-content">
            <div className="welcome-main-row" id="welcome-user-main-row">
              <div id="welcome-user-title-block">
                <p className="eyebrow" id="welcome-user-eyebrow">Flight Group Alpha Datapad</p>
                <h1 id="welcome-user-title">Welcome, {currentUserName}</h1>
              </div>
              {isGuestSession && (
                <button
                  type="button"
                  className="primary-action"
                  id="button-create-account"
                  title="Email account creation will be connected when hosted auth is added."
                >
                  Create Account
                </button>
              )}
            </div>
            {isGuestSession && (
              <p className="guest-session-note" id="guest-session-note">
                Guest session data is not saved. Create an account to save permanently.
              </p>
            )}
          </div>
        </section>

        {launchSetupCampaign ? (
          <section
            className={[
              "campaign-panel",
              "launch-setup-panel",
              isLaunchSetupClosing ? "launch-setup-panel-closing" : "",
            ].join(" ")}
            id="campaign-launch-setup"
            aria-labelledby="campaign-launch-setup-title"
          >
            <div className="panel-heading" id="campaign-launch-setup-heading">
              <div>
                <p className="launch-setup-title-like" id="campaign-launch-setup-eyebrow">Campaign Launch</p>
              </div>
              <button
                type="button"
                id="button-cancel-campaign-launch-setup"
                onClick={handleCancelLaunchSetup}
              >
                Cancel
              </button>
            </div>

            <form id="form-campaign-launch-setup" onSubmit={handleLaunchSetupNext} noValidate>
              <fieldset className="launch-setup-context" id="campaign-launch-setup-context">
                <legend id="campaign-launch-setup-campaign-name-label">Campaign Name:</legend>
                <strong id="campaign-launch-setup-campaign-name">{launchSetupCampaign.name}</strong>
                <span id="campaign-launch-setup-campaign-start-date">
                  Started {formatDisplayDate(launchSetupCampaign.startDate)}
                </span>
              </fieldset>

              <div className="launch-setup-section-title-row" id="campaign-launch-setup-title-row">
                <h2 className="launch-setup-section-title" id="campaign-launch-setup-title">Set Up Pilots</h2>
                <InfoButton
                  id="button-info-launch-setup-player"
                  helpKey="player"
                  onOpen={setActiveHelpKey}
                />
              </div>

              <div className="launch-setup-questions" id="campaign-launch-setup-questions">
                <fieldset className="launch-question" id="question-current-user-campaign-manager">
                  <legend id="question-current-user-campaign-manager-label">
                    <span className="legend-content" id="question-current-user-campaign-manager-label-content">
                      <span id="question-current-user-campaign-manager-label-text">
                        {isGuestSession ? "Are you going to be the Campaign Manager?" : `${currentUserName}, are you going to be the Campaign Manager?`}
                      </span>
                      <InfoButton
                        id="button-info-current-user-campaign-manager"
                        helpKey="campaignManager"
                        onOpen={setActiveHelpKey}
                      />
                    </span>
                  </legend>
                  {campaignManagerQuestionAttempted && !currentUserIsCampaignManager && (
                    <span className="required-marker required-marker-float" id="required-current-user-campaign-manager">
                      Required
                    </span>
                  )}
                  <div className="choice-row" id="choices-current-user-campaign-manager">
                    <label className="choice-card" id="choice-current-user-campaign-manager-yes">
                      <input
                        type="radio"
                        id="radio-current-user-campaign-manager-yes"
                        name="current-user-campaign-manager"
                        checked={currentUserIsCampaignManager === "yes"}
                        onChange={() => {
                          setCurrentUserIsCampaignManager("yes");
                          setCampaignManagerPlayerRole(null);
                          setPlayerRoleQuestionAttempted(false);
                        }}
                        required
                      />
                      Yes
                    </label>
                    <label className="choice-card" id="choice-current-user-campaign-manager-no">
                      <input
                        type="radio"
                        id="radio-current-user-campaign-manager-no"
                        name="current-user-campaign-manager"
                        checked={currentUserIsCampaignManager === "no"}
                        onChange={() => {
                          setCurrentUserIsCampaignManager("no");
                          setCampaignManagerPlayerRole(null);
                          setPlayerRoleQuestionAttempted(false);
                        }}
                        required
                      />
                      No
                    </label>
                  </div>
                  {campaignManagerQuestionAttempted && !currentUserIsCampaignManager && (
                    <p className="field-error" id="error-current-user-campaign-manager">
                      Choose whether you will be the Campaign Manager.
                    </p>
                  )}
                </fieldset>

                {currentUserIsCampaignManager === "yes" && (
                  <fieldset className="launch-question" id="question-campaign-manager-player-role">
                    <legend id="question-campaign-manager-player-role-label">
                      <span className="legend-content" id="question-campaign-manager-player-role-label-content">
                        <span id="question-campaign-manager-player-role-label-text">
                          Are you also going to be a pilot?
                        </span>
                        <InfoButton
                          id="button-info-campaign-manager-player-role"
                          helpKey="player"
                          onOpen={setActiveHelpKey}
                        />
                      </span>
                    </legend>
                    {playerRoleQuestionAttempted && !campaignManagerPlayerRole && (
                      <span className="required-marker required-marker-float" id="required-campaign-manager-player-role">
                        Required
                      </span>
                    )}
                    <div className="choice-row" id="choices-campaign-manager-player-role">
                      <label className="choice-card" id="choice-campaign-manager-and-player">
                        <input
                          type="radio"
                          id="radio-campaign-manager-and-player"
                          name="campaign-manager-player-role"
                          checked={campaignManagerPlayerRole === "managerAndPlayer"}
                          onChange={() => setCampaignManagerPlayerRole("managerAndPlayer")}
                          required={currentUserIsCampaignManager === "yes"}
                        />
                        Campaign Manager and Pilot
                      </label>
                      <label className="choice-card" id="choice-campaign-manager-only">
                        <input
                          type="radio"
                          id="radio-campaign-manager-only"
                          name="campaign-manager-player-role"
                          checked={campaignManagerPlayerRole === "managerOnly"}
                          onChange={() => setCampaignManagerPlayerRole("managerOnly")}
                          required={currentUserIsCampaignManager === "yes"}
                        />
                        Campaign Manager Only
                      </label>
                    </div>
                    {playerRoleQuestionAttempted && !campaignManagerPlayerRole && (
                      <p className="field-error" id="error-campaign-manager-player-role">
                        Choose whether the Campaign Manager will also have a pilot record.
                      </p>
                    )}
                  </fieldset>
                )}
              </div>

              <div className="form-actions launch-setup-actions" id="campaign-launch-setup-actions">
                <button type="submit" className="primary-action" id="button-campaign-launch-setup-next">
                  Next <span className="button-chevron" id="button-campaign-launch-setup-next-chevron">&gt;</span>
                </button>
              </div>
            </form>
          </section>
        ) : (
        <section
          className={[
            "campaign-panel",
            isReturningFromLaunch ? "campaign-panel-returning" : "",
            isCampaignPanelClosing ? "campaign-panel-closing" : "",
          ].join(" ")}
          id="campaigns"
        >
          <div className="panel-heading" id="campaigns-heading">
            <div>
              <p className="eyebrow" id="campaigns-eyebrow">Campaign Command</p>
              <h2 id="campaigns-title">{isCreateOpen ? "Create Campaign" : "Active Operations"}</h2>
            </div>
            {!isCreateOpen && (
              <div className="header-actions" id="campaign-actions" aria-label="Campaign actions">
                <button type="button" id="button-join-campaign" disabled={isBusy}>
                  Join Campaign
                </button>
                <button
                  type="button"
                  className="primary-action"
                  id="button-create-campaign"
                  disabled={isBusy}
                  onClick={handleOpenCreateCampaign}
                >
                  Create Campaign
                </button>
              </div>
            )}
          </div>


          {isCreateOpen && (
            <form
              className={[
                "create-campaign-form",
                isCreatePanelEntering ? "create-campaign-form-entering" : "",
                isCreatePanelClosing ? "create-campaign-form-closing" : "",
              ].join(" ")}
              id="form-create-campaign"
              onSubmit={handleCreateCampaign}
              noValidate
            >
              <div className="create-campaign-form-row" id="create-campaign-form-row-identity">
                <label id="label-campaign-name">
                  Campaign name
                  {createCampaignAttempted && isCampaignNameMissing && (
                    <span className="required-marker required-marker-float" id="required-campaign-name">
                      Required
                    </span>
                  )}
                  <input
                    id="input-campaign-name"
                    value={campaignName}
                    onChange={(event) => setCampaignName(event.target.value)}
                    placeholder="Outpost D-34 Patrol"
                    required
                  />
                  {createCampaignAttempted && isCampaignNameMissing && (
                    <span className="field-error" id="error-campaign-name">
                      Enter a campaign name.
                    </span>
                  )}
                </label>
                <label id="label-campaign-start-date">
                  Start date
                  {createCampaignAttempted && isStartDateMissing && (
                    <span className="required-marker required-marker-float" id="required-campaign-start-date">
                      Required
                    </span>
                  )}
                  <input
                    id="input-campaign-start-date"
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    required
                  />
                  {createCampaignAttempted && isStartDateMissing && (
                    <span className="field-error" id="error-campaign-start-date">
                      Choose a campaign start date.
                    </span>
                  )}
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
                  {createCampaignAttempted && isCampaignModeMissing && (
                    <span className="required-marker required-marker-float" id="required-campaign-mode">
                      Required
                    </span>
                  )}
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
                  {createCampaignAttempted && isCampaignModeMissing && (
                    <span className="field-error" id="error-campaign-mode">
                      Choose a campaign mode.
                    </span>
                  )}
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
                  {createCampaignAttempted && isCampaignStructureMissing && (
                    <span className="required-marker required-marker-float" id="required-campaign-structure">
                      Required
                    </span>
                  )}
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
                  {createCampaignAttempted && isCampaignStructureMissing && (
                    <span className="field-error" id="error-campaign-structure">
                      Choose a campaign structure.
                    </span>
                  )}
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
                <button
                  type="button"
                  id="button-cancel-create-campaign"
                  onClick={handleCancelCreateCampaign}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-action" id="button-submit-create-campaign" disabled={isBusy}>
                  Save Campaign
                </button>
              </div>
            </form>
          )}

          {!isCreateOpen && (
            <>
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
                {visibleCampaigns.map((campaign) => (
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
                      <small id={`campaign-row-${campaign.id}-start-date`}>Started {formatDisplayDate(campaign.startDate)}</small>
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
                        id={`button-${campaign.launchedAt ? "resume" : "launch"}-${campaign.id}`}
                        disabled={isBusy || campaign.status === "archived"}
                        onClick={() => handleResumeCampaign(campaign)}
                      >
                        {campaign.launchedAt ? "Resume" : "Launch"}
                      </button>
                    </span>
                  </div>
                ))}
                {visibleCampaigns.length === 0 && (
                  <div className="empty-row" id="campaign-table-empty-row" role="row">
                    <span id="campaign-table-empty-message" role="cell">
                      {showArchived ? "No archived campaigns found." : "No campaigns found. Create one to begin operations."}
                    </span>
                  </div>
                )}
              </div>

              <div className="archived-strip" id="archived-campaigns-preview" aria-label="Campaign archive view toggle">
                <label className="archive-view-toggle" id="archived-campaigns-label">
                  <span id="archived-campaigns-label-text">{showArchived ? "View Active" : "View Archived"}</span>
                  <input
                    className="archive-view-toggle-input"
                    type="checkbox"
                    id="toggle-show-archived-campaigns"
                    checked={showArchived}
                    onChange={(event) => setShowArchived(event.target.checked)}
                  />
                  <span className="archive-view-toggle-track" id="archived-campaigns-toggle-track" aria-hidden="true">
                    <span className="archive-view-toggle-thumb" id="archived-campaigns-toggle-thumb" />
                  </span>
                </label>
              </div>
            </>
          )}
        </section>
        )}
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
                <p className="eyebrow" id="help-modal-eyebrow">{activeHelp.eyebrow ?? "Rule Reference"}</p>
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
              <div className="help-modal-body" id="help-modal-body">
                {typeof activeHelp.body === "string"
                  ? activeHelp.body
                  : activeHelp.body.map((line, lineIndex) => (
                      <span className="help-modal-list-line" id={`help-modal-body-line-${lineIndex + 1}`} key={lineIndex}>
                        {renderHelpLine(line)}
                      </span>
                    ))}
              </div>
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
                          {renderHelpLine(line)}
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {activeHelp.references.length > 0 && (
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
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function renderHelpLine(line: HelpLine) {
  if (typeof line === "string") {
    return line;
  }

  return line.map((part, partIndex) => {
    const content = part.strong ? <strong>{part.text}</strong> : part.text;
    return part.underline ? <u key={partIndex}>{content}</u> : <span key={partIndex}>{content}</span>;
  });
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
