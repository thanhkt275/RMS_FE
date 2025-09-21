"use client";

import { useMemo } from "react";
import { useStageBracket } from "@/hooks/stages/use-stage-bracket";
import { normalizeBracketData, type NormalizedBracket } from "@/utils/bracket-normalizer";

interface UseNormalizedStageBracketOptions {
  enabled?: boolean;
}

export function useNormalizedStageBracket(stageId?: string | null, options: UseNormalizedStageBracketOptions = {}) {
  const query = useStageBracket(stageId, { enabled: options.enabled });

  const normalized = useMemo<NormalizedBracket | null>(() => normalizeBracketData(query.data), [query.data]);

  const isEmpty = useMemo(() => {
    if (!normalized) return false;
    const baseEmpty = normalized.columns.every((column) => column.matches.length === 0);

    if (normalized.type === 'swiss') {
      const bucketsEmpty = normalized.buckets.every((bucket) => bucket.matches.length === 0);
      return baseEmpty && bucketsEmpty;
    }

    return baseEmpty;
  }, [normalized]);

  return {
    ...query,
    normalizedBracket: normalized,
    isEmpty,
    hasData: Boolean(normalized) && !isEmpty,
    errorMessage: query.error instanceof Error ? query.error.message : undefined,
  };
}
