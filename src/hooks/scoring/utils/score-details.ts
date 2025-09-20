import { MatchScoreDetails, AllianceScoreDetails, AllianceScoreBreakdown } from "../types";
import { MatchScoreDetailsPayload } from "@/types/types";

const SCORE_VALUES = {
  flagsSecured: 20,
  successfulFlagHits: 10,
  opponentFieldAmmo: 5,
} as const;

const normaliseAllianceDetails = (
  details?: Partial<AllianceScoreDetails> | null,
): AllianceScoreDetails => ({
  flagsSecured: Math.max(0, Math.floor(Number(details?.flagsSecured ?? 0))),
  successfulFlagHits: Math.max(0, Math.floor(Number(details?.successfulFlagHits ?? 0))),
  opponentFieldAmmo: Math.max(0, Math.floor(Number(details?.opponentFieldAmmo ?? 0))),
});

const calculateBreakdown = (details: AllianceScoreDetails): AllianceScoreBreakdown => {
  const flagsPoints = details.flagsSecured * SCORE_VALUES.flagsSecured;
  const flagHitsPoints = details.successfulFlagHits * SCORE_VALUES.successfulFlagHits;
  const fieldControlPoints = details.opponentFieldAmmo * SCORE_VALUES.opponentFieldAmmo;

  return {
    flagsPoints,
    flagHitsPoints,
    fieldControlPoints,
    totalPoints: flagsPoints + flagHitsPoints + fieldControlPoints,
  };
};

const normaliseBreakdown = (
  breakdown?: Partial<AllianceScoreBreakdown> | null,
): AllianceScoreBreakdown => {
  const flagsPoints = Math.max(0, Number(breakdown?.flagsPoints ?? 0));
  const flagHitsPoints = Math.max(0, Number(breakdown?.flagHitsPoints ?? 0));
  const fieldControlPoints = Math.max(0, Number(breakdown?.fieldControlPoints ?? 0));
  const totalPoints = Math.max(0, Number(breakdown?.totalPoints ?? flagsPoints + flagHitsPoints + fieldControlPoints));

  return {
    flagsPoints,
    flagHitsPoints,
    fieldControlPoints,
    totalPoints,
  };
};

export const convertScoreDetailsPayload = (
  payload?: MatchScoreDetailsPayload | MatchScoreDetails | null,
): MatchScoreDetails => {
  if (!payload) {
    return createEmptyScoreDetails();
  }

  // If payload already matches MatchScoreDetails structure, return a cloned version
  if ((payload as MatchScoreDetails)?.red && (payload as MatchScoreDetails)?.blue) {
    const redDetails = normaliseAllianceDetails((payload as MatchScoreDetails).red);
    const blueDetails = normaliseAllianceDetails((payload as MatchScoreDetails).blue);

    const redBreakdown = (payload as MatchScoreDetails).breakdown?.red
      ? normaliseBreakdown((payload as MatchScoreDetails).breakdown!.red)
      : calculateBreakdown(redDetails);
    const blueBreakdown = (payload as MatchScoreDetails).breakdown?.blue
      ? normaliseBreakdown((payload as MatchScoreDetails).breakdown!.blue)
      : calculateBreakdown(blueDetails);

    return {
      red: redDetails,
      blue: blueDetails,
      breakdown: {
        red: redBreakdown,
        blue: blueBreakdown,
      },
    };
  }

  const payloadDetails = payload as MatchScoreDetailsPayload;

  const redDetails = normaliseAllianceDetails(payloadDetails.red as AllianceScoreDetails);
  const blueDetails = normaliseAllianceDetails(payloadDetails.blue as AllianceScoreDetails);

  const redBreakdown = payloadDetails.breakdown?.red
    ? normaliseBreakdown(payloadDetails.breakdown.red)
    : calculateBreakdown(redDetails);
  const blueBreakdown = payloadDetails.breakdown?.blue
    ? normaliseBreakdown(payloadDetails.breakdown.blue)
    : calculateBreakdown(blueDetails);

  return {
    red: redDetails,
    blue: blueDetails,
    breakdown: {
      red: redBreakdown,
      blue: blueBreakdown,
    },
  };
};

export const createEmptyScoreDetails = (): MatchScoreDetails => {
  const red = normaliseAllianceDetails();
  const blue = normaliseAllianceDetails();
  return {
    red,
    blue,
    breakdown: {
      red: calculateBreakdown(red),
      blue: calculateBreakdown(blue),
    },
  };
};
