"use client";

import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { StageService } from "@/services/stage.service";
import { QueryKeys } from "@/lib/query-keys";
import { unifiedWebSocketService } from "@/lib/unified-websocket";
import type { BracketUpdateEvent, StageBracketResponse } from "@/types/match.types";

interface UseStageBracketOptions {
  enabled?: boolean;
  refetchOnReconnect?: boolean;
}

export function useStageBracket(stageId?: string | null, options: UseStageBracketOptions = {}) {
  const { enabled = true, refetchOnReconnect = true } = options;
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => (
    stageId ? QueryKeys.stages.bracket(stageId) : QueryKeys.stages.bracket("unknown")
  ), [stageId]);

  const query = useQuery<StageBracketResponse>({
    queryKey,
    queryFn: async () => {
      if (!stageId) throw new Error("Stage ID is required to load bracket data");
      return StageService.getStageBracket(stageId);
    },
    enabled: enabled && Boolean(stageId),
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Subscribe to WebSocket updates for the stage bracket
  useEffect(() => {
    if (!stageId || !enabled) {
      return;
    }

    const unsubscribe = unifiedWebSocketService.on<BracketUpdateEvent>('bracket_update', (event) => {
      if (event.stageId !== stageId) return;

      queryClient.setQueryData(QueryKeys.stages.bracket(stageId), event.bracket);
    });

    return () => {
      unsubscribe?.();
    };
  }, [enabled, queryClient, stageId]);

  // Ensure we are listening to the relevant tournament room for real-time updates
  useEffect(() => {
    const tournamentId = query.data?.tournamentId;
    if (!stageId || !tournamentId || !enabled) {
      return;
    }

    unifiedWebSocketService.joinTournament(tournamentId);

    return () => {
      // Do not leave the tournament room automatically to avoid interfering with other listeners
    };
  }, [enabled, query.data?.tournamentId, stageId]);

  // Optional: refetch when the socket reconnects to avoid drift
  useEffect(() => {
    if (!refetchOnReconnect || !stageId || !enabled) {
      return;
    }

    const unsubscribe = unifiedWebSocketService.onConnectionStatus((status) => {
      if (status.connected) {
        queryClient.invalidateQueries({ queryKey });
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [enabled, queryClient, queryKey, refetchOnReconnect, stageId]);

  return query;
}
