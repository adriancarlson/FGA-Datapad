# FGA Datapad Domain Model

This document defines the first online-ready structure for FGA Datapad accounts, campaigns,
campaign participants, and players. The app can still run local-first, but the
data model should not block future hosted accounts or campaign sharing.

## Terminology

- **User**: A real person with an app login.
- **Campaign**: One running instance of a Flight Group Alpha campaign.
- **CampaignParticipant**: A user's participation in a specific campaign.
- **Participant**: The user-facing label for a CampaignParticipant.
- **Campaign Manager**: The one participant who administers and runs enemy AI for a campaign.
- **Player**: One in-game pilot/player record inside a campaign.

Important distinction: a user is not the same thing as a player. A user can
participate in many campaigns, can own multiple players in one campaign, can be
the campaign manager and also a player, or can be campaign manager only.

## Entity Overview

```text
User
  has many CampaignParticipants
  may own many Players through CampaignParticipants

Campaign
  has one Campaign Manager CampaignParticipant
  has many CampaignParticipants
  has many Players
  has many Invites

CampaignParticipant
  belongs to one User
  belongs to one Campaign
  may be the Campaign Manager for that Campaign
  may own zero or more Players

Player
  belongs to one Campaign
  may belong to one CampaignParticipant
  may be unclaimed/manual and managed by the Campaign Manager
  cannot move between Campaigns

CampaignInvite
  belongs to one Campaign
  is created by the Campaign Manager
  lets a User join as a CampaignParticipant

PlayerClaimRequest
  belongs to one Player
  is requested by one CampaignParticipant
  is approved or rejected by the Campaign Manager
```

## Users

Users are login/account records. Authentication should be email-only, such as
magic links or one-time email codes. Password fields should not exist in the app
model.

Suggested fields:

```json
{
  "id": "user_01",
  "email": "pilot@example.com",
  "emailVerifiedAt": "2026-05-01T18:00:00.000Z",
  "username": "delta7",
  "firstName": "Ada",
  "lastName": "Lovelace",
  "displayName": "Ada",
  "avatarUrl": null,
  "status": "active",
  "createdAt": "2026-05-01T18:00:00.000Z",
  "updatedAt": "2026-05-01T18:00:00.000Z",
  "lastLoginAt": null
}
```

Notes:

- `email` should be unique.
- `username` should be unique if used publicly.
- `displayName` is useful so the UI does not have to concatenate first and last
  names everywhere.
- `status` can start as `active`, but leaves room for `disabled` or `deleted`.

## Campaigns

Campaigns are game instances. They have one Campaign Manager, a mode, a start
date, and can be archived.

Suggested fields:

```json
{
  "id": "campaign_01",
  "name": "Thursday Night Flight Group",
  "campaignMode": "classic",
  "campaignStructure": "missionDeck",
  "includeNonTourMissions": true,
  "startWithIntroductoryMission": true,
  "status": "active",
  "startDate": "2026-05-01",
  "createdByUserId": "user_01",
  "managerParticipantId": "participant_01",
  "archivedAt": null,
  "createdAt": "2026-05-01T18:00:00.000Z",
  "updatedAt": "2026-05-01T18:00:00.000Z"
}
```

Rules:

- A campaign must have exactly one Campaign Manager.
- `campaignMode` should be one of `classic`, `completionist`, or `ironman`.
- `campaignStructure` should be one of `missionDeck` or `chronological`.
- `missionDeck` should be the default campaign structure.
- `includeNonTourMissions` controls whether non-tour mission cards are included
  when using the Mission Deck structure.
- `startWithIntroductoryMission` forces mission `0:1` to be the first mission
  regardless of campaign structure.
- The Campaign Manager must be a `CampaignParticipant` of the campaign.
- Campaign Manager ownership can be transferred to another participant, but only when
  approved by the current Campaign Manager.
- Archived campaigns are read-only.
- Active campaigns should show in the normal campaign list.
- Archived campaigns should show only when the user enables an archived-campaigns
  toggle.

### Campaign Modes

Campaign modes follow Instruction Manual sections 1.3.3 and 1.3.4.

| Mode | Mission replayability | XP for failed mission | App rule |
| --- | --- | --- | --- |
| Classic | Only if stated on mission cards | Yes | Check the mission-card replay instruction before allowing a replay. |
| Completionist | Always | No | Allow mission replay, but failed attempts should not award XP. |
| Ironman | Never | Yes | Do not allow replay; ignore reshuffle/replay instructions after failure. |

The shared mission data should not store campaign-specific history. Instead,
each mission marks replay handling as campaign-mode-driven, and each campaign
stores its own mission progress.

### Campaign Structures

Campaign structure controls how the next mission is selected.

| Structure | App rule |
| --- | --- |
| Mission Deck | Use the mission deck rules from Instruction Manual section 1.4.1. The first mission cards of the Initial Tours enter the deck, then successful missions add the next mission from that tour. Once Initial Tours are complete, repeat the same pattern for Mid-Game Tours, then play the Final Tour. |
| Chronological | Play missions in order: Tour 1 Mission 1, Tour 1 Mission 2, and so on until the tour is complete; then continue to the next tour. |

Mission Deck notes:

- If `startWithIntroductoryMission` is true, mission `0:1` is played before
  drawing from the deck. After mission `0:1` is completed, remove it from the
  deck before continuing with normal Mission Deck rules.
- Initial Tour deck starts with `1:1`, `2:1`, `3:1`, and `4:1`.
- If `includeNonTourMissions` is true, non-tour mission cards are added to the Initial Tours Mission Deck.
- A successful mission can add the next mission card from that tour to the deck.
- When all Initial Tours are complete, the Mid-Game Mission Deck starts with `5:1` and `6:1`. Any incomplete non-tour mission cards are added to the Mid-Game Mission Deck if `includeNonTourMissions` is true.
- The Final Tour has mission cards but is played chronologically.

Chronological notes:

- If `startWithIntroductoryMission` is true, mission `0:1` is played first.
- After completing mission `0:1`, chronological play starts at Tour 1 Mission 1.

## Campaign Participants

CampaignParticipants connect users to campaigns. The user-facing label should be
Participant, while the code/database entity should be `CampaignParticipant`.

Suggested fields:

```json
{
  "id": "participant_01",
  "campaignId": "campaign_01",
  "userId": "user_01",
  "isCampaignManager": true,
  "joinedAt": "2026-05-01T18:00:00.000Z",
  "status": "active",
  "createdAt": "2026-05-01T18:00:00.000Z",
  "updatedAt": "2026-05-01T18:00:00.000Z"
}
```

Rules:

- A user can participate in many campaigns.
- A campaign can have many participants.
- For now, a participant either is or is not the Campaign Manager.
- Do not add observer, assistant manager, or extra roles yet.
- A Campaign Manager can also own one or more players in the campaign.

## Players

Players are the in-game pilot records. A player belongs to a campaign and may be
linked to a participant. If `participantId` is `null`, the player is a manual/offline player
created and managed by the Campaign Manager.

Suggested fields:

```json
{
  "id": "player_01",
  "campaignId": "campaign_01",
  "participantId": "participant_01",
  "name": "Davin Fel",
  "callSign": "Razor",
  "status": "active",
  "createdByParticipantId": "participant_01",
  "createdAt": "2026-05-01T18:00:00.000Z",
  "updatedAt": "2026-05-01T18:00:00.000Z",
  "stats": {
    "bankedXp": 0,
    "bankedUmPoints": 0,
    "bankedCpp": 0,
    "ejectionsMade": 0,
    "shipsFlown": {},
    "missionsCompleted": [],
    "toursCompleted": [],
    "goldStars": [],
    "silverStars": [],
    "enemyKills": 0,
    "careerProgression": null
  }
}
```

Rules:

- A user may own multiple players in the same campaign.
- A player can start unclaimed with `participantId: null`.
- A player and its stats are permanently tied to one campaign.
- Players and player stats cannot transfer from one campaign to another.
- The Campaign Manager can manually create unclaimed players.
- A participant can request to claim an unclaimed player.
- The Campaign Manager chooses which participant receives a manually-created player.
- Once claimed, `participantId` should point to the owning participant.

Editable fields:

- The owning participant and Campaign Manager can edit player name and call sign.
- Early versions may let users edit additional player fields manually.
- Long term, app-managed stats should be updated by mission/session flows.
- The Campaign Manager should have admin override ability for player stats.

App-managed stats:

- `bankedXp`
- `bankedUmPoints`
- `bankedCpp`
- `ejectionsMade`
- `shipsFlown`
- `missionsCompleted`
- `toursCompleted`
- `goldStars`
- `silverStars`
- `enemyKills`
- `careerProgression`

Recommended later addition: a stat adjustment/audit log so Campaign Manager
overrides can be reviewed.

## Campaign Mission Progress

Mission progress belongs to a campaign and mission pair. This is where the app
tracks attempts, replays, and whether the mission ended in success or failure.

Suggested fields:

```json
{
  "id": "mission_progress_01",
  "campaignId": "campaign_01",
  "missionId": "patrol-jump-point-d-34",
  "attempts": 1,
  "replayCount": 0,
  "successes": 1,
  "failures": 0,
  "lastOutcome": "success",
  "lastPlayedAt": "2026-05-01T18:00:00.000Z",
  "completedAt": "2026-05-01T18:00:00.000Z",
  "createdAt": "2026-05-01T18:00:00.000Z",
  "updatedAt": "2026-05-01T18:00:00.000Z"
}
```

Rules:

- A progress record is scoped to one campaign and one mission.
- `attempts` counts every play of that mission in that campaign.
- `replayCount` is `attempts - 1`.
- `lastOutcome` is `success` or `failure`.
- The current campaign mode determines whether another replay is available.
- Completionist failed attempts should not award mission XP.
- Classic replays require mission-card replay instructions.
- Ironman missions cannot be replayed.

## Campaign Invites

Campaign Managers invite users to join campaigns. Invites can be email-based,
link/code-based, or both.

Suggested fields:

```json
{
  "id": "invite_01",
  "campaignId": "campaign_01",
  "invitedEmail": "pilot@example.com",
  "invitedByParticipantId": "participant_01",
  "tokenHash": "hashed-token",
  "status": "pending",
  "expiresAt": "2026-05-08T18:00:00.000Z",
  "acceptedByUserId": null,
  "acceptedAt": null,
  "createdAt": "2026-05-01T18:00:00.000Z"
}
```

Rules:

- Only the Campaign Manager can create campaign invites.
- Accepting an invite creates a `CampaignParticipant` record.
- Invites should expire.
- Store only a token hash, not the raw invite token.

## Player Claim Requests

CampaignParticipants can ask to claim a manual player. The Campaign Manager approves or
rejects the request and chooses the target participant/player assignment.

Suggested fields:

```json
{
  "id": "claim_01",
  "campaignId": "campaign_01",
  "playerId": "player_01",
  "requestedByParticipantId": "participant_02",
  "status": "pending",
  "reviewedByParticipantId": null,
  "reviewedAt": null,
  "createdAt": "2026-05-01T18:00:00.000Z"
}
```

Rules:

- Only unclaimed players can be claimed.
- The requester must be a participant of the same campaign.
- Only the Campaign Manager can approve or reject.
- Approving sets `player.participantId` to the chosen participant.

## Campaign Manager Transfer

Campaign Manager transfer should be explicit so we do not silently orphan
campaign administration.

Suggested fields:

```json
{
  "id": "transfer_01",
  "campaignId": "campaign_01",
  "fromParticipantId": "participant_01",
  "toParticipantId": "participant_02",
  "status": "pending",
  "approvedAt": null,
  "createdAt": "2026-05-01T18:00:00.000Z"
}
```

Rules:

- Only the current Campaign Manager can initiate or approve transfer.
- The destination must be an active participant of the same campaign.
- Completing transfer updates `campaign.managerParticipantId`.
- The previous manager remains a normal participant unless removed later.

## Campaign Participant Leaving A Campaign

When a participant leaves a campaign, their players remain in that campaign and become
manual Campaign Manager-managed players.

Rules:

- Player records are not deleted when a participant leaves.
- Player stats remain attached to the same campaign.
- Each player owned by the leaving participant has `participantId` set to `null`.
- Those players are then managed by the Campaign Manager.
- The same user, or a different user, may later request to claim those players.
- Claiming still requires Campaign Manager approval.
- Players cannot be transferred to another campaign as part of leaving.

## Permission Summary

| Action | Campaign Manager | Owning participant | Other participant |
| --- | --- | --- | --- |
| Create campaign | Yes | Yes | Yes |
| Archive campaign | Yes | No | No |
| Resume active campaign | Yes | Yes, if participating | Yes, if participating |
| View archived campaign | Yes, read-only | Yes, read-only | Yes, read-only |
| Invite users | Yes | No | No |
| Manually create player | Yes | No | No |
| Create own player | Yes | Yes | Yes |
| Edit player name/call sign | Yes | Own players only | Own players only |
| Edit app-managed stats | Yes, override | Eventually via app flows | Eventually via app flows |
| Approve player claim | Yes | No | No |
| Transfer Campaign Manager | Yes | No | No |

## Open Questions

1. Should campaign invites be email-only, invite-code-only, or support both?
2. Should a user be able to join a campaign before creating a player, or should
   joining require creating or claiming a player immediately?
3. Should the Campaign Manager be allowed to remove a participant from a campaign?
4. Should the app keep a record of previous owners when a player becomes manual
   after a participant leaves?
5. Should a player be allowed to move from one participant to another after initial
   claim?
6. Should archived campaigns block all stat edits, including Campaign Manager
   overrides?
7. Should the app keep a full audit log for stat changes from the beginning?
