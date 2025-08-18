import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AudienceDisplaySettings } from "@/types/types";
import { QueryKeys } from "@/lib/query-keys";
import { useWebSocket } from "@/websockets/simplified/useWebSocket";
import { UserRole } from "@/types/types";

// Default settings
const DEFAULT_SETTINGS: AudienceDisplaySettings = {
  displayMode: "match",
  showTimer: true,
  showScores: true,
  showTeams: true,
  timerStartedAt: null,
  updatedAt: Date.now(),
  tournamentId: "",
  fieldId: ""
};

/**
 * Hook to get the current audience display settings
 */
export function useAudienceDisplaySettings() {
  return useQuery({
    queryKey: QueryKeys.audienceDisplay.settings(),
    queryFn: (): AudienceDisplaySettings => {
      // Get settings from localStorage or use defaults
      const storedSettings = localStorage.getItem("audience-display-settings");
      if (storedSettings) {
        return JSON.parse(storedSettings);
      }
      return DEFAULT_SETTINGS;
    },
    // Refresh settings every 2 seconds to detect changes from other tabs/windows
    refetchInterval: 2000,
  });
}

/**
 * Hook to update audience display settings
 */
export function useUpdateAudienceDisplay() {
  const queryClient = useQueryClient();
  const { emit } = useWebSocket({ autoConnect: true, role: UserRole.COMMON, tournamentId: 'all' });

  return useMutation({
    mutationFn: (settings: Partial<AudienceDisplaySettings>) => {
      // Get current settings from localStorage
      const storedSettings = localStorage.getItem("audience-display-settings");
      const currentSettings = storedSettings 
        ? JSON.parse(storedSettings) 
        : DEFAULT_SETTINGS;

      // Update settings with new values
      const updatedSettings = {
        ...currentSettings,
        ...settings,
        updatedAt: Date.now(),
      };

      // Save to localStorage
      localStorage.setItem(
        "audience-display-settings",
        JSON.stringify(updatedSettings)
      );

      return updatedSettings;
    },
    onSuccess: (data) => {
      // Update the query cache
      queryClient.setQueryData(QueryKeys.audienceDisplay.settings(), data);
      // Broadcast display mode/settings change over WebSocket
      emit('display_mode_change' as any, data as any);
    },
  });
}