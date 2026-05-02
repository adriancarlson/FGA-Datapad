export type EntityId = string;
export type IsoDate = string;
export type IsoDateTime = string;

export type UserStatus = "active" | "disabled" | "deleted";
export type UserAccountType = "guest" | "registered";
export type CampaignStatus = "active" | "archived";
export type CampaignMode = "classic" | "completionist" | "ironman";
export type CampaignStructure = "missionDeck" | "chronological";
export type ParticipantStatus = "active" | "left" | "removed";
export type PlayerStatus = "active" | "retired" | "killed" | "archived";
export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";
export type ReviewStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface Timestamped {
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface User extends Timestamped {
  id: EntityId;
  email: string;
  emailVerifiedAt: IsoDateTime | null;
  accountType: UserAccountType;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl: string | null;
  status: UserStatus;
  lastLoginAt: IsoDateTime | null;
}

export interface Campaign extends Timestamped {
  id: EntityId;
  name: string;
  campaignMode: CampaignMode;
  campaignStructure: CampaignStructure;
  includeNonTourMissions: boolean;
  startWithIntroductoryMission: boolean;
  status: CampaignStatus;
  startDate: IsoDate;
  createdByUserId: EntityId;
  managerParticipantId: EntityId;
  launchedAt: IsoDateTime | null;
  archivedAt: IsoDateTime | null;
}

export interface CampaignParticipant extends Timestamped {
  id: EntityId;
  campaignId: EntityId;
  userId: EntityId;
  isCampaignManager: boolean;
  joinedAt: IsoDateTime;
  leftAt: IsoDateTime | null;
  status: ParticipantStatus;
}

export interface CampaignInvite {
  id: EntityId;
  campaignId: EntityId;
  invitedEmail: string;
  invitedByParticipantId: EntityId;
  tokenHash: string;
  status: InviteStatus;
  expiresAt: IsoDateTime;
  acceptedByUserId: EntityId | null;
  acceptedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
}

export interface PlayerClaimRequest {
  id: EntityId;
  campaignId: EntityId;
  playerId: EntityId;
  requestedByParticipantId: EntityId;
  status: ReviewStatus;
  reviewedByParticipantId: EntityId | null;
  reviewedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
}

export interface CampaignManagerTransferRequest {
  id: EntityId;
  campaignId: EntityId;
  fromParticipantId: EntityId;
  toParticipantId: EntityId;
  status: ReviewStatus;
  approvedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
}

export type CareerPath = "ace" | "forceUser" | "coordinate" | "tech";

export interface PlayerStats {
  bankedXp: number;
  bankedUmPoints: number;
  bankedCpp: number;
  ejectionsMade: number;
  shipsFlown: Record<string, number>;
  missionsCompleted: EntityId[];
  toursCompleted: EntityId[];
  goldStars: EntityId[];
  silverStars: EntityId[];
  enemyKills: number;
  careerProgression: CareerPath | null;
}

export interface Player extends Timestamped {
  id: EntityId;
  campaignId: EntityId;
  participantId: EntityId | null;
  name: string;
  callSign: string;
  status: PlayerStatus;
  createdByParticipantId: EntityId;
  stats: PlayerStats;
}

export type TourCategory = "initial" | "midGame" | "final";

export interface Tour {
  id: EntityId;
  tourNumber: number;
  name: string;
  category: TourCategory;
  categoryName: string;
  categoryOrder: number;
  tourOrder: number;
}

export type TerritoryType = "Friendly" | "Neutral" | "Hostile" | "Enemy";
export type RoundLimit = "limited" | "none";
export type XpFeature = "enemyBulkFreighter" | "enemyEmplacement";
export type MissionReplayPolicy = "campaignMode";
export type CampaignModeReplayRule = "missionCard" | "always" | "never";

export interface MissionReplayability {
  policy: MissionReplayPolicy;
  byCampaignMode: Record<CampaignMode, CampaignModeReplayRule>;
}

export interface Mission {
  id: EntityId;
  name: string;
  tourId: EntityId | null;
  partNumber: number;
  ship: string[];
  xpFeatures: XpFeature[];
  territory: TerritoryType;
  roundLimit: RoundLimit;
  rounds: number | null;
  replayability: MissionReplayability;
}

export type ExperienceCategory =
  | "Dealing damage to enemy ships"
  | "Reducing opponent's performance"
  | "Taking damage"
  | "Boosting Flight Group Alpha's performance"
  | "Negative Points";

export interface ExperienceChartEntry {
  id: string;
  category: ExperienceCategory;
  description: string;
  xp: number;
  per: string;
  maxPerRound?: number;
  notes?: string;
}

export type SquadAi = "Player" | "Attack" | "Strike" | "Escape" | "Flee" | "Special" | null;
export type SquadEliteStatus = "Elite" | "non-elite";

export interface ShipIconRef {
  code: string;
  name: string | null;
  commonName: string | null;
  fontClass: string | null;
  needsReview?: boolean;
}

export interface MissionSquad {
  name: string;
  vector: string | null;
  ai: SquadAi;
  ship: ShipIconRef[] | null;
  elite: SquadEliteStatus;
  raw: string;
}

export interface MissionRoundEvent {
  round: number;
  remindAfterRound: number;
  squads: MissionSquad[];
}

export interface MissionEventRecord {
  missionId: EntityId;
  missionName: string;
  roundEvents: MissionRoundEvent[];
  specialArrivals: MissionSquad[];
}

export interface MissionEventsFile {
  schemaVersion: number;
  notes: string[];
  missions: MissionEventRecord[];
}

export type MissionSessionStatus = "setup" | "inProgress" | "completed" | "aborted";
export type MissionOutcome = "success" | "failure";

export interface CampaignMissionProgress extends Timestamped {
  id: EntityId;
  campaignId: EntityId;
  missionId: EntityId;
  attempts: number;
  replayCount: number;
  successes: number;
  failures: number;
  lastOutcome: MissionOutcome | null;
  lastPlayedAt: IsoDateTime | null;
  completedAt: IsoDateTime | null;
}

export interface MissionSession extends Timestamped {
  id: EntityId;
  campaignId: EntityId;
  missionId: EntityId;
  status: MissionSessionStatus;
  outcome: MissionOutcome | null;
  currentRound: number;
  attemptNumber: number;
  replayNumber: number;
  startedAt: IsoDateTime;
  completedAt: IsoDateTime | null;
  managedByParticipantId: EntityId;
  playerIds: EntityId[];
  xpPool: number;
  xpEligible: boolean | null;
}

export interface MissionSessionXpEvent {
  id: EntityId;
  missionSessionId: EntityId;
  playerId: EntityId;
  round: number | null;
  experienceChartEntryId: string;
  quantity: number;
  xpDelta: number;
  createdAt: IsoDateTime;
}
