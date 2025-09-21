# Match Bracket View Implementation Plan

## Goal
Create an intuitive bracket-style schedule experience that works for both playoff elimination stages and record-based Swiss stages, providing parity between the control tools and the audience display.

## Assumptions & Open Questions
1. **Design alignment** – final visual language (colors, spacing, typography) will follow existing RMS design tokens; no external design system required.
2. **Data availability** – backend can expose bracket metadata (round numbers, advancement links, record buckets).
3. **Real-time updates** – existing websocket/react-query setup can be reused; otherwise, polling intervals need to be defined.
4. **Swiss specifics** – clarification needed on loss thresholds (e.g. best-of-five rounds vs. win-three/lose-three) and how tiebreakers seed final placements.

## Phase 1 – Backend Enablement
1. **Extend Prisma models** to store bracket context per match (e.g. `roundNumber`, `bracketSlot`, `feedsIntoMatchId`, `loserFeedsIntoMatchId`, `recordBucket`).
2. **Update match scheduler service** to populate the new fields for playoff generation and Swiss schedule creation.
3. **Expose read APIs** (`GET /stages/:id/bracket`) returning a normalized graph structure for the front-end (matches grouped by round or record).
4. **Emit update events** when match scores change so bracket consumers receive fresh data.
5. **Migration planning** – write Prisma migration, ensure legacy data is back-filled or defaulted safely.

## Phase 2 – Front-End Data Layer
1. **Type updates** – extend `Match` and related FE types with bracket metadata (`RMS_FE/src/types/match.types.ts`).
2. **Query hooks** – add `useStageBracket(stageId)` leveraging react-query to hit the new bracket endpoint; include websocket subscription fallback.
3. **State normalization** – build selectors/utilities to map API results into column-based layout data for both playoff and Swiss formats.
4. **Error handling** – surface graceful empty/error states when bracket data is missing or mid-generation.

## Phase 3 – UI Foundations
1. **Shared primitives** – create reusable components (`BracketColumn`, `MatchCard`, `ConnectorLayer`) under `components/features/bracket`.
2. **Responsive layout** – implement flex/absolute positioning that supports desktop displays and scales down for tablet usage; add horizontal scroll with snap points.
3. **Alliance rendering** – display multiple teams per alliance, surrogate markers, logos, and current record.
4. **Status indicators** – add badges for `PENDING`, `LIVE`, `FINAL`; show scores, highlight winners.
5. **Swiss view** – render columns organized by record (e.g. `2–0`, `1–1`, `0–2`), with arrows showing win/loss flow; include tooltip explaining advancement rules.
6. **Accessibility** – ensure keyboard navigation within the bracket and ARIA labels on match cards.

## Phase 4 – Feature Integration
1. **Audience display** – replace existing playoff bracket logic in `ScheduleDisplay` with the new shared components.
2. **Match scheduler dialog** – embed the bracket preview so admins see the generated structure before saving.
3. **Stages dashboard** – add a “Bracket” tab for stage detail pages with filtering (all matches vs. selected field).
4. **Live control panel** – optional: show mini bracket for quick navigation between matches.

## Phase 5 – Testing & QA
1. **Unit tests** – cover data mappers, utilities, and component rendering edge cases (odd team counts, byes).
2. **Integration tests** – use Playwright/RTL to verify bracket renders correctly after scheduling a stage.
3. **Performance checks** – profile bracket rendering for large tournaments (e.g. 64-team playoff, extended Swiss rounds).
4. **Visual QA** – capture Storybook/Chromatic snapshots for each bracket state.
5. **Regression pass** – ensure existing schedule tables still work and toggle correctly with the new view.

## Phase 6 – Rollout
1. **Feature flag** – gate the new bracket behind an env-driven flag for initial tournaments.
2. **Documentation** – update admin guide and release notes; include explanation of Swiss advancement visuals.
3. **User training** – run a quick demo for event staff highlighting navigation and interpretation.
4. **Monitoring** – log client-side errors related to bracket rendering; set up alert for API failures.
5. **Post-launch review** – gather feedback after first live event and prioritize enhancements (e.g. printable bracket export).
