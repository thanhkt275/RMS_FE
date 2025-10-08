import React, { useMemo } from "react";

// Types and Interfaces
export interface Match {
  id: string;
  matchNumber: string | number;
  scheduledTime: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  winningAlliance?: "RED" | "BLUE" | "TIE" | null;
  redScore?: number;
  blueScore?: number;
  alliances?: Array<{
    color: "RED" | "BLUE";
    teamAlliances: Array<{
      teamId: string;
      team?: {
        id: string;
        name: string;
        teamNumber?: string;
      };
    }>;
  }>;
  roundNumber?: number | null;
  bracket?: string;
  stage?: {
    id: string;
    name: string;
    tournamentId: string;
    type: "SWISS" | "PLAYOFF" | "FINAL";
  };
}

interface PlayoffBracketDisplayProps {
  matches: Match[];
  stageName?: string;
  stageType?: "PLAYOFF" | "FINAL";
}

interface SourceMatches {
  red?: Match;
  blue?: Match;
}

interface MatchCardProps {
  match: Match;
  isFinal?: boolean;
  sourceMatches?: SourceMatches;
}

// Constants based on Figma design
const DESIGN_CONFIG = {
  // Match card dimensions from Figma
  MATCH_WIDTH: 213.33,
  MATCH_HEIGHT: 67.5,

  // Spacing between rounds from Figma analysis
  ROUND_GAP: 133.33, // Distance between match cards and connection lines

  // Vertical spacing between matches in same round
  MATCH_VERTICAL_GAP: 67.5, // Gap between matches vertically

  // Colors from Figma
  COLORS: {
    REGULAR_BORDER: "#2563EB",
    FINAL_BORDER: "#DC2626",
    FINAL_TEXT: "#DC2626",
    REGULAR_TEXT: "#1E293B",
    GRAY_TEXT: "#64748B",
    CONNECTION_LINE: "#94A3B8",
    BACKGROUND: "#F8FAFC",
    DIVIDER: "#CBD5E1",
  },

  // Typography from Figma
  FONTS: {
    ROUND_TITLE: {
      size: 20,
      weight: 800,
      family: "Inter",
    },
    TEAM_TEXT: {
      size: 15,
      weight: 500,
      family: "Inter",
    },
  },
} as const;

// Utility Functions
const getTeamDisplay = (
  team: { name: string; teamNumber?: string } | undefined
): string => {
  if (!team) return "TBD";
  return team.teamNumber ? `#${team.teamNumber} ${team.name}` : team.name;
};

const getTeams = (match: Match, color: "RED" | "BLUE"): string[] => {
  const alliance = match.alliances?.find((a) => a.color === color);
  if (!alliance?.teamAlliances) return ["TBD"];
  return alliance.teamAlliances.map((ta) => getTeamDisplay(ta.team));
};

const getRoundLabel = (roundIndex: number, maxRound: number): string => {
  const totalRounds = maxRound + 1;
  if (totalRounds === 1) return "Final";
  if (roundIndex === maxRound) return "Final";
  if (roundIndex === maxRound - 1) return "Semifinals";
  return `Round ${roundIndex + 1}`;
};

// Calculate responsive dimensions based on screen size
const calculateResponsiveDimensions = (
  containerWidth: number,
  totalRounds: number
) => {
  const minMatchWidth = 180;
  const maxMatchWidth = 240;
  const minGap = 100;
  const maxGap = 150;

  // Calculate available space
  const totalGapSpace = (totalRounds - 1) * minGap;
  const totalMatchSpace = totalRounds * minMatchWidth;
  const availableSpace = containerWidth - totalGapSpace - totalMatchSpace;

  // Distribute extra space
  const extraSpacePerMatch = Math.min(
    availableSpace / totalRounds,
    maxMatchWidth - minMatchWidth
  );
  const extraSpacePerGap = Math.min(
    availableSpace / (totalRounds - 1),
    maxGap - minGap
  );

  return {
    matchWidth: Math.max(minMatchWidth, minMatchWidth + extraSpacePerMatch),
    roundGap: Math.max(minGap, minGap + extraSpacePerGap),
    matchHeight: 67.5, // Keep consistent with Figma
  };
};

// Team Display Component
const TeamDisplay: React.FC<{
  teams: string[];
  isTBD: boolean;
  isWinner: boolean;
  isFinal: boolean;
  sourceMatch?: Match;
}> = ({ teams, isTBD, isWinner, isFinal, sourceMatch }) => {
  const getDisplayText = (): string => {
    if (!isTBD) return teams.join(", ");
    if (sourceMatch) return `Winner ${sourceMatch.matchNumber}`;
    return "TBD";
  };

  return (
    <div
      className="flex items-center justify-center h-full px-2 text-center"
      style={{
        color: isFinal
          ? DESIGN_CONFIG.COLORS.FINAL_TEXT
          : DESIGN_CONFIG.COLORS.REGULAR_TEXT,
        fontWeight: isWinner ? 600 : 500,
        fontStyle: isTBD ? "italic" : "normal",
        fontSize: `${DESIGN_CONFIG.FONTS.TEAM_TEXT.size}px`,
        fontFamily: DESIGN_CONFIG.FONTS.TEAM_TEXT.family,
        lineHeight: 1.2,
      }}
    >
      <span className="truncate">{getDisplayText()}</span>
    </div>
  );
};

// Future Match Display Component
const FutureMatchDisplay: React.FC<{ sourceMatches: SourceMatches }> = ({
  sourceMatches,
}) => (
  <div className="h-full flex items-center justify-center px-2">
    <div
      className="text-center"
      style={{
        fontSize: `${DESIGN_CONFIG.FONTS.TEAM_TEXT.size - 1}px`,
        fontFamily: DESIGN_CONFIG.FONTS.TEAM_TEXT.family,
        color: DESIGN_CONFIG.COLORS.GRAY_TEXT,
        fontStyle: "italic",
      }}
    >
      <div className="font-medium">Winner {sourceMatches.red?.matchNumber}</div>
      <div
        className="text-xs font-bold my-1"
        style={{ color: DESIGN_CONFIG.COLORS.GRAY_TEXT }}
      >
        VS
      </div>
      <div className="font-medium">
        Winner {sourceMatches.blue?.matchNumber}
      </div>
    </div>
  </div>
);

// Match Card Component
const MatchCard: React.FC<
  MatchCardProps & { dimensions: { width: number; height: number } }
> = ({ match, isFinal = false, sourceMatches, dimensions }) => {
  const redTeams = getTeams(match, "RED");
  const blueTeams = getTeams(match, "BLUE");
  const isCompleted = match.status === "COMPLETED";
  const winner = match.winningAlliance;
  const isRedWinner = isCompleted && winner === "RED";
  const isBlueWinner = isCompleted && winner === "BLUE";

  const redIsTBD = redTeams.length === 1 && redTeams[0] === "TBD";
  const blueIsTBD = blueTeams.length === 1 && blueTeams[0] === "TBD";

  const showFutureMatchDisplay =
    redIsTBD && blueIsTBD && sourceMatches?.red && sourceMatches?.blue;

  return (
    <div
      className="bg-white flex flex-col relative"
      style={{
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        border: isFinal
          ? `3px solid ${DESIGN_CONFIG.COLORS.FINAL_BORDER}`
          : `2px solid ${DESIGN_CONFIG.COLORS.REGULAR_BORDER}`,
        borderRadius: "4px",
      }}
    >
      {showFutureMatchDisplay ? (
        <FutureMatchDisplay sourceMatches={sourceMatches!} />
      ) : (
        <>
          {/* Red Alliance */}
          <div
            className="flex-1"
            style={{
              borderBottom: `1px solid ${DESIGN_CONFIG.COLORS.DIVIDER}`,
            }}
          >
            <TeamDisplay
              teams={redTeams}
              isTBD={redIsTBD}
              isWinner={isRedWinner}
              isFinal={isFinal}
              sourceMatch={sourceMatches?.red}
            />
          </div>

          {/* Blue Alliance */}
          <div className="flex-1">
            <TeamDisplay
              teams={blueTeams}
              isTBD={blueIsTBD}
              isWinner={isBlueWinner}
              isFinal={isFinal}
              sourceMatch={sourceMatches?.blue}
            />
          </div>
        </>
      )}
    </div>
  );
};

// Round Label Component
const RoundLabel: React.FC<{ label: string }> = ({ label }) => (
  <div className="text-center mb-4">
    <h4
      style={{
        fontSize: `${DESIGN_CONFIG.FONTS.ROUND_TITLE.size}px`,
        fontFamily: DESIGN_CONFIG.FONTS.ROUND_TITLE.family,
        fontWeight: DESIGN_CONFIG.FONTS.ROUND_TITLE.weight,
        color: DESIGN_CONFIG.COLORS.GRAY_TEXT,
        margin: 0,
      }}
    >
      {label}
    </h4>
  </div>
);

// Connection Line Component
const ConnectionLine: React.FC<{
  match1CenterY: number;
  match2CenterY: number;
  nextMatchCenterY: number;
  roundGap: number;
  matchWidth: number;
}> = ({
  match1CenterY,
  match2CenterY,
  nextMatchCenterY,
  roundGap,
  matchWidth,
}) => {
  const minY = Math.min(match1CenterY, match2CenterY, nextMatchCenterY);
  const maxY = Math.max(match1CenterY, match2CenterY, nextMatchCenterY);
  const connectionMidY = (match1CenterY + match2CenterY) / 2;

  return (
    <svg
      className="absolute pointer-events-none"
      style={{
        left: matchWidth,
        top: minY - 10,
        width: roundGap,
        height: maxY - minY + 20,
        zIndex: 0,
      }}
    >
      {/* Horizontal line from first match */}
      <line
        x1="0"
        y1={match1CenterY - minY + 10}
        x2={roundGap / 2}
        y2={match1CenterY - minY + 10}
        stroke={DESIGN_CONFIG.COLORS.CONNECTION_LINE}
        strokeWidth="2"
      />

      {/* Horizontal line from second match */}
      <line
        x1="0"
        y1={match2CenterY - minY + 10}
        x2={roundGap / 2}
        y2={match2CenterY - minY + 10}
        stroke={DESIGN_CONFIG.COLORS.CONNECTION_LINE}
        strokeWidth="2"
      />

      {/* Vertical connecting line */}
      <line
        x1={roundGap / 2}
        y1={match1CenterY - minY + 10}
        x2={roundGap / 2}
        y2={match2CenterY - minY + 10}
        stroke={DESIGN_CONFIG.COLORS.CONNECTION_LINE}
        strokeWidth="2"
      />

      {/* Line to next match */}
      <line
        x1={roundGap / 2}
        y1={connectionMidY - minY + 10}
        x2={roundGap - 12}
        y2={nextMatchCenterY - minY + 10}
        stroke={DESIGN_CONFIG.COLORS.CONNECTION_LINE}
        strokeWidth="2"
      />

      {/* Arrow head */}
      <polygon
        points={`${roundGap - 12},${nextMatchCenterY - minY + 6} ${roundGap - 4},${nextMatchCenterY - minY + 10} ${roundGap - 12},${nextMatchCenterY - minY + 14}`}
        fill={DESIGN_CONFIG.COLORS.CONNECTION_LINE}
      />
    </svg>
  );
};

// Main Component
export const PlayoffBracketDisplay: React.FC<PlayoffBracketDisplayProps> = ({
  matches,
  stageName,
}) => {
  // Organize matches by round
  const { rounds, maxRound, dimensions } = useMemo(() => {
    if (!matches.length)
      return {
        rounds: [],
        maxRound: 0,
        dimensions: { matchWidth: 213, roundGap: 133, matchHeight: 67.5 },
      };

    const sortedMatches = [...matches].sort((a, b) => {
      const roundA = a.roundNumber || 0;
      const roundB = b.roundNumber || 0;
      if (roundA !== roundB) return roundA - roundB;
      return String(a.matchNumber).localeCompare(String(b.matchNumber));
    });

    const rounds: Match[][] = [];
    let maxRound = 0;

    sortedMatches.forEach((match) => {
      const round = (match.roundNumber || 1) - 1;
      maxRound = Math.max(maxRound, round);
      if (!rounds[round]) rounds[round] = [];
      rounds[round].push(match);
    });

    // Calculate responsive dimensions
    const totalRounds = maxRound + 1;
    const containerWidth =
      typeof window !== "undefined" ? window.innerWidth - 64 : 1536; // Account for padding
    const dimensions = calculateResponsiveDimensions(
      containerWidth,
      totalRounds
    );

    return { rounds, maxRound, dimensions };
  }, [matches]);

  // Calculate match positions with responsive spacing
  const calculateMatchPosition = (
    roundIndex: number,
    matchIndex: number,
    rounds: Match[][]
  ): { yPosition: number; sourceMatches?: SourceMatches } => {
    const baseOffset = 60; // Top offset for round labels
    const matchSpacing = dimensions.matchHeight + 40; // Vertical spacing between matches

    if (roundIndex === 0) {
      return {
        yPosition: baseOffset + matchIndex * matchSpacing,
      };
    }

    const prevRound = rounds[roundIndex - 1];
    const sourceIndex1 = matchIndex * 2;
    const sourceIndex2 = matchIndex * 2 + 1;

    if (prevRound[sourceIndex1] && prevRound[sourceIndex2]) {
      const sourceMatches = {
        red: prevRound[sourceIndex1],
        blue: prevRound[sourceIndex2],
      };

      const source1Y = baseOffset + sourceIndex1 * matchSpacing;
      const source2Y = baseOffset + sourceIndex2 * matchSpacing;

      return {
        yPosition: (source1Y + source2Y) / 2,
        sourceMatches,
      };
    }

    return {
      yPosition: baseOffset + matchIndex * (matchSpacing * 2),
    };
  };

  if (!matches.length) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ backgroundColor: DESIGN_CONFIG.COLORS.BACKGROUND }}
      >
        <div
          style={{ color: DESIGN_CONFIG.COLORS.GRAY_TEXT, fontSize: "18px" }}
        >
          No bracket matches available
        </div>
      </div>
    );
  }

  // Calculate total bracket dimensions
  const totalWidth =
    rounds.length * dimensions.matchWidth +
    (rounds.length - 1) * dimensions.roundGap;
  const maxMatchesInRound = Math.max(...rounds.map((r) => r.length));
  const totalHeight = maxMatchesInRound * (dimensions.matchHeight + 40) + 100; // Extra space for labels

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{ backgroundColor: DESIGN_CONFIG.COLORS.BACKGROUND }}
    >
      {/* Header */}
      {/* <div className="flex-shrink-0 text-center py-4 bg-white border-b">
        <h3
          style={{
            fontSize: "24px",
            fontFamily: DESIGN_CONFIG.FONTS.ROUND_TITLE.family,
            fontWeight: 700,
            color: DESIGN_CONFIG.COLORS.REGULAR_TEXT,
            margin: 0,
          }}
        >
          {stageName} Bracket
        </h3>
      </div> */}

      {/* Bracket Display */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <div
          className="relative"
          style={{
            width: `${totalWidth}px`,
            height: `${totalHeight}px`,
            minWidth: "fit-content",
          }}
        >
          {rounds.map((roundMatches, roundIndex) => (
            <div
              key={roundIndex}
              className="absolute"
              style={{
                left:
                  roundIndex * (dimensions.matchWidth + dimensions.roundGap),
                top: 0,
                width: dimensions.matchWidth,
              }}
            >
              <RoundLabel label={getRoundLabel(roundIndex, maxRound)} />

              {/* Matches */}
              <div className="relative">
                {roundMatches.map((match, matchIndex) => {
                  const { yPosition, sourceMatches } = calculateMatchPosition(
                    roundIndex,
                    matchIndex,
                    rounds
                  );

                  return (
                    <div
                      key={match.id}
                      className="absolute z-10"
                      style={{ top: yPosition }}
                    >
                      <MatchCard
                        match={match}
                        isFinal={roundIndex === maxRound}
                        sourceMatches={sourceMatches}
                        dimensions={{
                          width: dimensions.matchWidth,
                          height: dimensions.matchHeight,
                        }}
                      />
                    </div>
                  );
                })}

                {/* Connection Lines */}
                {roundIndex < maxRound &&
                  rounds[roundIndex + 1] &&
                  roundMatches.map((match, matchIndex) => {
                    if (
                      matchIndex % 2 === 0 &&
                      matchIndex + 1 < roundMatches.length
                    ) {
                      const nextRoundMatchIndex = Math.floor(matchIndex / 2);
                      const nextRoundMatch =
                        rounds[roundIndex + 1][nextRoundMatchIndex];

                      if (nextRoundMatch) {
                        const baseOffset = 60;
                        const matchSpacing = dimensions.matchHeight + 40;

                        const match1Y = baseOffset + matchIndex * matchSpacing;
                        const match2Y =
                          baseOffset + (matchIndex + 1) * matchSpacing;
                        const nextMatchY = (match1Y + match2Y) / 2;

                        const match1CenterY =
                          match1Y + dimensions.matchHeight / 2;
                        const match2CenterY =
                          match2Y + dimensions.matchHeight / 2;
                        const nextMatchCenterY =
                          nextMatchY + dimensions.matchHeight / 2;

                        return (
                          <ConnectionLine
                            key={`connector-${match.id}`}
                            match1CenterY={match1CenterY}
                            match2CenterY={match2CenterY}
                            nextMatchCenterY={nextMatchCenterY}
                            roundGap={dimensions.roundGap}
                            matchWidth={dimensions.matchWidth}
                          />
                        );
                      }
                    }
                    return null;
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayoffBracketDisplay;
