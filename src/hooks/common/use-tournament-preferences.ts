/**
 * Tournament Preferences Hook
 * 
 * Manages user's tournament selection preferences using localStorage.
 * Provides auto-save functionality to remember the last selected tournament
 * across browser sessions.
 * 
 * Features:
 * - User-specific preferences (based on user ID)
 * - Automatic fallback to first available tournament
 * - SSR-safe implementation with client-side hydration
 * - Validation against available tournaments
 * 
 * @author Robotics Tournament Management System
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Tournament } from "@/types/types";

// Storage key for tournament preferences
const TOURNAMENT_PREFERENCES_KEY = "tournament-preferences";

// Default preferences structure
interface TournamentPreferences {
  lastSelectedTournamentId: string | null;
  updatedAt: number;
  userId?: string;
}

interface UseTournamentPreferencesParams {
  userId?: string;
  tournaments: Tournament[];
  enabled?: boolean;
  showRestoreNotification?: boolean;
}

interface UseTournamentPreferencesReturn {
  selectedTournamentId: string;
  setSelectedTournamentId: (tournamentId: string) => void;
  isLoading: boolean;
  hasStoredPreference: boolean;
  clearPreferences: () => void;
  lastSavedAt: number | null;
}

/**
 * Hook to manage tournament selection with auto-save preferences
 */
export function useTournamentPreferences({
  userId,
  tournaments,
  enabled = true,
  showRestoreNotification = true,
}: UseTournamentPreferencesParams): UseTournamentPreferencesReturn {
  const [selectedTournamentId, setSelectedTournamentIdState] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasStoredPreference, setHasStoredPreference] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [isClientSide, setIsClientSide] = useState(false);

  // Mark as client-side after hydration to avoid SSR issues
  useEffect(() => {
    setIsClientSide(true);
  }, []);

  /**
   * Get stored preferences from localStorage
   */
  const getStoredPreferences = useCallback((): TournamentPreferences | null => {
    if (typeof window === "undefined" || !enabled || !isClientSide) return null;

    try {
      const stored = localStorage.getItem(TOURNAMENT_PREFERENCES_KEY);
      if (!stored) return null;

      const preferences: TournamentPreferences = JSON.parse(stored);
      
      // Validate stored preferences
      if (!preferences || typeof preferences !== "object") return null;
      
      // If user-specific preferences and user ID doesn't match, ignore
      if (preferences.userId && userId && preferences.userId !== userId) {
        return null;
      }

      return preferences;
    } catch (error) {
      console.warn("[TournamentPreferences] Failed to parse stored preferences:", error);
      return null;
    }
  }, [enabled, isClientSide, userId]);

  /**
   * Save preferences to localStorage
   */
  const savePreferences = useCallback((tournamentId: string) => {
    if (typeof window === "undefined" || !enabled || !isClientSide) return;

    try {
      const now = Date.now();
      const preferences: TournamentPreferences = {
        lastSelectedTournamentId: tournamentId,
        updatedAt: now,
        userId: userId || undefined,
      };

      localStorage.setItem(TOURNAMENT_PREFERENCES_KEY, JSON.stringify(preferences));
      setLastSavedAt(now);
      console.log("[TournamentPreferences] Saved preferences:", {
        tournamentId,
        userId: userId || "anonymous",
      });
    } catch (error) {
      console.warn("[TournamentPreferences] Failed to save preferences:", error);
    }
  }, [enabled, isClientSide, userId]);

  /**
   * Clear stored preferences
   */
  const clearPreferences = useCallback(() => {
    if (typeof window === "undefined" || !isClientSide) return;

    try {
      localStorage.removeItem(TOURNAMENT_PREFERENCES_KEY);
      setHasStoredPreference(false);
      setLastSavedAt(null);
      console.log("[TournamentPreferences] Cleared preferences");
    } catch (error) {
      console.warn("[TournamentPreferences] Failed to clear preferences:", error);
    }
  }, [isClientSide]);

  /**
   * Validate if a tournament ID exists in the available tournaments
   */
  const isValidTournamentId = useCallback((tournamentId: string): boolean => {
    return tournaments.some(tournament => tournament.id === tournamentId);
  }, [tournaments]);

  /**
   * Get the best tournament ID to use (stored preference or fallback)
   */
  const getBestTournamentId = useCallback((): { tournamentId: string; wasRestored: boolean } => {
    if (!tournaments.length) return { tournamentId: "", wasRestored: false };

    // Try to get stored preference first
    const storedPreferences = getStoredPreferences();
    const storedTournamentId = storedPreferences?.lastSelectedTournamentId;

    // If we have a valid stored preference, use it
    if (storedTournamentId && isValidTournamentId(storedTournamentId)) {
      setHasStoredPreference(true);
      return { tournamentId: storedTournamentId, wasRestored: true };
    }

    // Otherwise, fall back to the first available tournament
    setHasStoredPreference(false);
    return { tournamentId: tournaments[0]?.id || "", wasRestored: false };
  }, [tournaments, getStoredPreferences, isValidTournamentId]);

  /**
   * Initialize tournament selection on tournaments change
   */
  useEffect(() => {
    if (!enabled || !isClientSide || !tournaments.length) {
      setIsLoading(false);
      return;
    }

    const { tournamentId: bestTournamentId, wasRestored } = getBestTournamentId();
    
    if (bestTournamentId && bestTournamentId !== selectedTournamentId) {
      setSelectedTournamentIdState(bestTournamentId);
      
      // Show notification if tournament was restored from preferences
      if (wasRestored && showRestoreNotification) {
        const tournamentName = tournaments.find(t => t.id === bestTournamentId)?.name || "Unknown Tournament";
        toast.info("Tournament Selection Restored", {
          description: `Restored your last selected tournament: ${tournamentName}`,
          duration: 3000,
          id: `tournament-restored-${bestTournamentId}`,
        });
      }
    }
    
    setIsLoading(false);
  }, [
    enabled,
    isClientSide,
    tournaments,
    getBestTournamentId,
    selectedTournamentId,
    showRestoreNotification,
  ]);

  /**
   * Update selected tournament ID with auto-save
   */
  const setSelectedTournamentId = useCallback((tournamentId: string) => {
    if (!enabled) return;

    // Validate the tournament ID
    if (tournamentId && !isValidTournamentId(tournamentId)) {
      console.warn("[TournamentPreferences] Invalid tournament ID:", tournamentId);
      return;
    }

    setSelectedTournamentIdState(tournamentId);
    
    // Save to localStorage if we have a valid tournament ID
    if (tournamentId) {
      savePreferences(tournamentId);
      setHasStoredPreference(true);
    }
  }, [enabled, isValidTournamentId, savePreferences]);

  /**
   * Auto-save when selectedTournamentId changes externally
   */
  useEffect(() => {
    if (
      enabled &&
      isClientSide &&
      selectedTournamentId &&
      isValidTournamentId(selectedTournamentId)
    ) {
      savePreferences(selectedTournamentId);
    }
  }, [enabled, isClientSide, selectedTournamentId, isValidTournamentId, savePreferences]);

  return {
    selectedTournamentId,
    setSelectedTournamentId,
    isLoading,
    hasStoredPreference,
    clearPreferences,
    lastSavedAt,
  };
}

/**
 * Hook for managing public tournament preferences (when user is not authenticated)
 */
export function usePublicTournamentPreferences(
  tournaments: Tournament[],
  showRestoreNotification: boolean = true
): UseTournamentPreferencesReturn {
  return useTournamentPreferences({
    tournaments,
    enabled: true,
    showRestoreNotification,
  });
}

/**
 * Hook for managing authenticated user tournament preferences
 */
export function useUserTournamentPreferences(
  userId: string,
  tournaments: Tournament[],
  showRestoreNotification: boolean = true
): UseTournamentPreferencesReturn {
  return useTournamentPreferences({
    userId,
    tournaments,
    enabled: !!userId,
    showRestoreNotification,
  });
}