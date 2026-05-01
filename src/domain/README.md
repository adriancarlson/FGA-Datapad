# Domain Types

`types.ts` contains framework-agnostic TypeScript contracts for the app domain.
These types are intended to be shared by:

- local IndexedDB persistence
- future backend API payloads
- React UI state
- import/export JSON tooling

The naming follows the domain model in `docs/domain-model.md`:

- `User` is an account/login identity.
- `Campaign` is a running instance of Flight Group Alpha.
- `Campaign.campaignMode` controls replay and XP consequences.
- `Campaign.campaignStructure` controls mission selection order.
- `CampaignParticipant` connects a user to a campaign.
- `Participant` is the user-facing label for `CampaignParticipant`.
- `Campaign Manager` is represented by `Campaign.managerParticipantId` and
  `CampaignParticipant.isCampaignManager`.
- `Player` is an in-game pilot record tied to one campaign.

Players do not transfer between campaigns. If a participant leaves a campaign,
their players become manual/unclaimed players by setting `participantId` to
`null`.
