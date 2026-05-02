import Dexie, { type Table } from "dexie";
import type {
  Campaign,
  CampaignMissionProgress,
  CampaignMode,
  CampaignParticipant,
  CampaignStructure,
  EntityId,
  MissionOutcome,
  PlayerStats,
  MissionSession,
  Player,
  User,
} from "../domain/types";

export interface CampaignSummary {
  id: EntityId;
  name: string;
  mode: CampaignMode;
  structure: CampaignStructure;
  manager: string;
  players: number;
  activeMission: string;
  launchedAt: string | null;
  status: Campaign["status"];
  startDate: string;
}

export interface PlayerSummary {
  id: EntityId;
  name: string;
  callSign: string;
  owner: string;
  isManual: boolean;
  status: Player["status"];
  stats: PlayerStats;
}

export interface CampaignDetail {
  campaign: Campaign;
  managerName: string;
  participants: CampaignParticipant[];
  players: PlayerSummary[];
}

class FgaDatapadLocalDatabase extends Dexie {
  users!: Table<User, EntityId>;
  campaigns!: Table<Campaign, EntityId>;
  campaignParticipants!: Table<CampaignParticipant, EntityId>;
  players!: Table<Player, EntityId>;
  missionSessions!: Table<MissionSession, EntityId>;
  campaignMissionProgress!: Table<CampaignMissionProgress, EntityId>;

  constructor() {
    super("fga-datapad-local");

    const versionOneSchema = {
      users: "id, email, username, status",
      campaigns: "id, status, startDate, managerParticipantId, createdByUserId",
      campaignParticipants: "id, campaignId, userId, status, isCampaignManager",
      players: "id, campaignId, participantId, status",
      missionSessions: "id, campaignId, missionId, status, startedAt",
    };

    this.version(1).stores(versionOneSchema);

    this.version(2).stores({
      ...versionOneSchema,
      campaignMissionProgress: "id, [campaignId+missionId], campaignId, missionId, lastOutcome",
    }).upgrade(async (transaction) => {
      await transaction.table<LegacyCampaignRecord, EntityId>("campaigns").toCollection().modify((campaign) => {
        const legacyMode = campaign.campaignMode;

        if (legacyMode === "standard" || legacyMode === "custom") {
          campaign.campaignMode = "classic";
        }
      });
    });

    this.version(3).stores({
      ...versionOneSchema,
      campaignMissionProgress: "id, [campaignId+missionId], campaignId, missionId, lastOutcome",
    }).upgrade(async (transaction) => {
      await transaction.table<Campaign, EntityId>("campaigns").toCollection().modify((campaign) => {
        campaign.campaignStructure ??= "missionDeck";
      });
    });

    this.version(4).stores({
      ...versionOneSchema,
      campaignMissionProgress: "id, [campaignId+missionId], campaignId, missionId, lastOutcome",
    }).upgrade(async (transaction) => {
      await transaction.table<Campaign, EntityId>("campaigns").toCollection().modify((campaign) => {
        campaign.includeNonTourMissions ??= true;
      });
    });

    this.version(5).stores({
      ...versionOneSchema,
      campaignMissionProgress: "id, [campaignId+missionId], campaignId, missionId, lastOutcome",
    }).upgrade(async (transaction) => {
      await transaction.table<Campaign, EntityId>("campaigns").toCollection().modify((campaign) => {
        campaign.startWithIntroductoryMission ??= false;
      });
    });

    this.version(6).stores({
      ...versionOneSchema,
      campaignMissionProgress: "id, [campaignId+missionId], campaignId, missionId, lastOutcome",
    }).upgrade(async (transaction) => {
      await transaction.table<Campaign, EntityId>("campaigns").toCollection().modify((campaign) => {
        campaign.launchedAt ??= null;
      });
    });
  }
}

type LegacyCampaignRecord = Omit<Campaign, "campaignMode"> & {
  campaignMode: CampaignMode | "standard" | "custom";
};

export const db = new FgaDatapadLocalDatabase();

export const LOCAL_USER_ID = "local-user";

export async function ensureLocalUser(): Promise<User> {
  const existingUser = await db.users.get(LOCAL_USER_ID);

  if (existingUser) {
    if (existingUser.accountType !== "guest") {
      const guestPatch: Partial<User> = {
        accountType: "guest",
        emailVerifiedAt: null,
        email: existingUser.email === "local@flight-group-alpha.test" ? "guest@local.fga-datapad.test" : existingUser.email || "guest@local.fga-datapad.test",
        username: existingUser.username || "guest",
        firstName: existingUser.firstName || "Guest",
        lastName: existingUser.lastName || "Commander",
        displayName: existingUser.displayName === "Local Commander" || existingUser.displayName === "Guest Commander" ? "Guest" : existingUser.displayName,
        updatedAt: now(),
      };

      await db.users.update(existingUser.id, guestPatch);
      return { ...existingUser, ...guestPatch };
    }

    return existingUser;
  }

  const timestamp = now();
  const localUser: User = {
    id: LOCAL_USER_ID,
    email: "guest@local.fga-datapad.test",
    emailVerifiedAt: null,
    accountType: "guest",
    username: "guest",
    firstName: "Guest",
    lastName: "",
    displayName: "Guest",
    avatarUrl: null,
    status: "active",
    lastLoginAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.users.add(localUser);
  return localUser;
}

export async function createCampaign(input: {
  name: string;
  startDate: string;
  campaignMode: CampaignMode;
  campaignStructure: CampaignStructure;
  includeNonTourMissions: boolean;
  startWithIntroductoryMission: boolean;
}): Promise<Campaign> {
  const user = await ensureLocalUser();
  const timestamp = now();
  const campaignId = createId("campaign");
  const participantId = createId("participant");

  const campaign: Campaign = {
    id: campaignId,
    name: input.name,
    campaignMode: input.campaignMode,
    campaignStructure: input.campaignStructure,
    includeNonTourMissions: input.includeNonTourMissions,
    startWithIntroductoryMission: input.startWithIntroductoryMission,
    status: "active",
    startDate: input.startDate,
    createdByUserId: user.id,
    managerParticipantId: participantId,
    launchedAt: null,
    archivedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const participant: CampaignParticipant = {
    id: participantId,
    campaignId,
    userId: user.id,
    isCampaignManager: true,
    joinedAt: timestamp,
    leftAt: null,
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.transaction("rw", db.campaigns, db.campaignParticipants, async () => {
    await db.campaigns.add(campaign);
    await db.campaignParticipants.add(participant);
  });

  return campaign;
}

export async function listCampaignSummaries(showArchived: boolean): Promise<CampaignSummary[]> {
  await ensureLocalUser();
  const campaigns = await db.campaigns.toArray();
  const visibleCampaigns = campaigns.filter(
    (campaign) => showArchived || campaign.status !== "archived",
  );

  const summaries = await Promise.all(
    visibleCampaigns.map(async (campaign): Promise<CampaignSummary> => {
      const [managerParticipant, players, activeSession] = await Promise.all([
        db.campaignParticipants.get(campaign.managerParticipantId),
        db.players.where("campaignId").equals(campaign.id).toArray(),
        db.missionSessions
          .where("campaignId")
          .equals(campaign.id)
          .and((session) => session.status === "inProgress" || session.status === "setup")
          .first(),
      ]);

      const manager = managerParticipant
        ? await db.users.get(managerParticipant.userId)
        : undefined;

      return {
        id: campaign.id,
        name: campaign.name,
        mode: campaign.campaignMode,
        structure: campaign.campaignStructure ?? "missionDeck",
        manager: "-",
        players: players.length,
        activeMission: activeSession?.missionId ?? "-",
        launchedAt: campaign.launchedAt ?? null,
        status: campaign.status,
        startDate: campaign.startDate,
      };
    }),
  );

  return summaries.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "active" ? -1 : 1;
    }

    return b.startDate.localeCompare(a.startDate);
  });
}

export async function archiveCampaign(campaignId: EntityId): Promise<void> {
  const timestamp = now();
  await db.campaigns.update(campaignId, {
    status: "archived",
    archivedAt: timestamp,
    updatedAt: timestamp,
  });
}

export async function restoreCampaign(campaignId: EntityId): Promise<void> {
  await db.campaigns.update(campaignId, {
    status: "active",
    archivedAt: null,
    updatedAt: now(),
  });
}

export async function getCampaignDetail(campaignId: EntityId): Promise<CampaignDetail | null> {
  const campaign = await db.campaigns.get(campaignId);

  if (!campaign) {
    return null;
  }

  const [participants, players, managerParticipant] = await Promise.all([
    db.campaignParticipants.where("campaignId").equals(campaignId).toArray(),
    db.players.where("campaignId").equals(campaignId).toArray(),
    db.campaignParticipants.get(campaign.managerParticipantId),
  ]);

  const usersById = new Map((await db.users.toArray()).map((user) => [user.id, user]));
  const participantsById = new Map(participants.map((participant) => [participant.id, participant]));
  const managerName = managerParticipant
    ? usersById.get(managerParticipant.userId)?.displayName ?? "Unknown"
    : "Unknown";

  return {
    campaign,
    managerName,
    participants,
    players: players.map((player) => {
      const ownerParticipant = player.participantId
        ? participantsById.get(player.participantId)
        : undefined;
      const ownerUser = ownerParticipant ? usersById.get(ownerParticipant.userId) : undefined;

      return {
        id: player.id,
        name: player.name,
        callSign: player.callSign,
        owner: ownerUser?.displayName ?? "Campaign Manager managed",
        isManual: player.participantId === null,
        status: player.status,
        stats: player.stats,
      };
    }),
  };
}

export async function createManualPlayer(input: {
  campaignId: EntityId;
  name: string;
  callSign: string;
}): Promise<Player> {
  const campaign = await db.campaigns.get(input.campaignId);

  if (!campaign) {
    throw new Error("Campaign was not found.");
  }

  const timestamp = now();
  const player: Player = {
    id: createId("player"),
    campaignId: input.campaignId,
    participantId: null,
    name: input.name,
    callSign: input.callSign,
    status: "active",
    createdByParticipantId: campaign.managerParticipantId,
    stats: createInitialPlayerStats(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.players.add(player);
  return player;
}

export async function getCampaignMissionProgress(
  campaignId: EntityId,
): Promise<CampaignMissionProgress[]> {
  return db.campaignMissionProgress.where("campaignId").equals(campaignId).toArray();
}

export async function recordMissionOutcome(input: {
  campaignId: EntityId;
  missionId: EntityId;
  outcome: MissionOutcome;
  playedAt?: string;
}): Promise<CampaignMissionProgress> {
  const timestamp = now();
  const playedAt = input.playedAt ?? timestamp;
  const existing = await db.campaignMissionProgress
    .where("[campaignId+missionId]")
    .equals([input.campaignId, input.missionId])
    .first();

  if (existing) {
    const nextProgress: CampaignMissionProgress = {
      ...existing,
      attempts: existing.attempts + 1,
      replayCount: existing.attempts,
      successes: existing.successes + (input.outcome === "success" ? 1 : 0),
      failures: existing.failures + (input.outcome === "failure" ? 1 : 0),
      lastOutcome: input.outcome,
      lastPlayedAt: playedAt,
      completedAt: input.outcome === "success" ? playedAt : existing.completedAt,
      updatedAt: timestamp,
    };

    await db.campaignMissionProgress.put(nextProgress);
    return nextProgress;
  }

  const progress: CampaignMissionProgress = {
    id: createId("mission_progress"),
    campaignId: input.campaignId,
    missionId: input.missionId,
    attempts: 1,
    replayCount: 0,
    successes: input.outcome === "success" ? 1 : 0,
    failures: input.outcome === "failure" ? 1 : 0,
    lastOutcome: input.outcome,
    lastPlayedAt: playedAt,
    completedAt: input.outcome === "success" ? playedAt : null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.campaignMissionProgress.add(progress);
  return progress;
}

function createInitialPlayerStats(): PlayerStats {
  return {
    bankedXp: 0,
    bankedUmPoints: 0,
    bankedCpp: 0,
    ejectionsMade: 0,
    shipsFlown: {},
    missionsCompleted: [],
    toursCompleted: [],
    goldStars: [],
    silverStars: [],
    enemyKills: 0,
    careerProgression: null,
  };
}

function now(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
