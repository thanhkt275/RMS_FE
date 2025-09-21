import type { BracketMatch, StageBracketResponse } from "@/types/match.types";

export interface BracketColumn {
  key: string;
  label: string;
  matches: BracketMatch[];
}

export interface BracketBucket {
  record: string;
  matches: BracketMatch[];
}

export type NormalizedBracket =
  | {
      type: 'elimination';
      columns: BracketColumn[];
    }
  | {
      type: 'swiss';
      columns: BracketColumn[];
      buckets: BracketBucket[];
    }
  | {
      type: 'standard';
      columns: BracketColumn[];
    };

export function normalizeBracketData(bracket: StageBracketResponse | undefined | null): NormalizedBracket | null {
  if (!bracket) {
    return null;
  }

  const matchMap = new Map<string, BracketMatch>();
  bracket.matches.forEach((match) => {
    matchMap.set(match.id, match);
  });

  const toMatches = (ids: string[]): BracketMatch[] => {
    return ids
      .map((id) => matchMap.get(id))
      .filter((match): match is BracketMatch => Boolean(match));
  };

  if (bracket.structure.type === 'elimination') {
    const columns: BracketColumn[] = bracket.structure.rounds.map((round) => ({
      key: `round-${round.roundNumber}`,
      label: round.label,
      matches: toMatches(round.matches),
    }));

    return {
      type: 'elimination',
      columns,
    };
  }

  if (bracket.structure.type === 'swiss') {
    const columns: BracketColumn[] = bracket.structure.rounds.map((round) => ({
      key: `round-${round.roundNumber}`,
      label: `Round ${round.roundNumber}`,
      matches: toMatches(round.matches),
    }));

    const buckets: BracketBucket[] = bracket.structure.buckets.map((bucket) => ({
      record: bucket.record,
      matches: toMatches(bucket.matches),
    }));

    return {
      type: 'swiss',
      columns,
      buckets,
    };
  }

  const columns: BracketColumn[] = bracket.structure.rounds.map((round) => ({
    key: `round-${round.roundNumber}`,
    label: `Round ${round.roundNumber}`,
    matches: toMatches(round.matches),
  }));

  return {
    type: 'standard',
    columns,
  };
}
