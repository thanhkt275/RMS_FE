/**
 * Tournament Notifications Hook
 *
 * Provides functionality to send email notifications for tournament and stage events
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  emailNotificationService,
  TournamentNotificationData,
  StageNotificationData,
  EmailNotificationResult
} from '@/services/email-notification.service';
import { Tournament } from '@/types/tournament.types';
import { Stage } from '@/types/types';
import { Team } from '@/types/team.types';

// Hook for sending tournament schedule notifications
export function useSendTournamentNotification() {
  return useMutation({
    mutationFn: async (data: TournamentNotificationData): Promise<EmailNotificationResult[]> => {
      if (!emailNotificationService.isReady()) {
        throw new Error('Email service is not configured. Please check your email settings.');
      }

      return await emailNotificationService.sendTournamentScheduleNotification(data);
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      if (failureCount === 0) {
        toast.success(`Tournament notification sent successfully to ${successCount} recipients`);
      } else {
        toast.warning(`Tournament notification sent to ${successCount} recipients, ${failureCount} failed`);
      }
    },
    onError: (error) => {
      console.error('Failed to send tournament notification:', error);
      toast.error(`Failed to send tournament notification: ${error.message}`);
    },
  });
}

// Hook for sending stage schedule notifications
export function useSendStageNotification() {
  return useMutation({
    mutationFn: async (data: StageNotificationData): Promise<EmailNotificationResult[]> => {
      if (!emailNotificationService.isReady()) {
        throw new Error('Email service is not configured. Please check your email settings.');
      }

      return await emailNotificationService.sendStageScheduleNotification(data);
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      if (failureCount === 0) {
        toast.success(`Stage notification sent successfully to ${successCount} recipients`);
      } else {
        toast.warning(`Stage notification sent to ${successCount} recipients, ${failureCount} failed`);
      }
    },
    onError: (error) => {
      console.error('Failed to send stage notification:', error);
      toast.error(`Failed to send stage notification: ${error.message}`);
    },
  });
}

// Hook for sending tournament update notifications
export function useSendTournamentUpdateNotification() {
  return useMutation({
    mutationFn: async (data: TournamentNotificationData): Promise<EmailNotificationResult[]> => {
      if (!emailNotificationService.isReady()) {
        throw new Error('Email service is not configured. Please check your email settings.');
      }

      return await emailNotificationService.sendTournamentUpdateNotification(data);
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      if (failureCount === 0) {
        toast.success(`Tournament update notification sent successfully to ${successCount} recipients`);
      } else {
        toast.warning(`Tournament update notification sent to ${successCount} recipients, ${failureCount} failed`);
      }
    },
    onError: (error) => {
      console.error('Failed to send tournament update notification:', error);
      toast.error(`Failed to send tournament update notification: ${error.message}`);
    },
  });
}

// Hook for sending stage update notifications
export function useSendStageUpdateNotification() {
  return useMutation({
    mutationFn: async (data: StageNotificationData): Promise<EmailNotificationResult[]> => {
      if (!emailNotificationService.isReady()) {
        throw new Error('Email service is not configured. Please check your email settings.');
      }

      return await emailNotificationService.sendStageUpdateNotification(data);
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      if (failureCount === 0) {
        toast.success(`Stage update notification sent successfully to ${successCount} recipients`);
      } else {
        toast.warning(`Stage update notification sent to ${successCount} recipients, ${failureCount} failed`);
      }
    },
    onError: (error) => {
      console.error('Failed to send stage update notification:', error);
      toast.error(`Failed to send stage update notification: ${error.message}`);
    },
  });
}

// Hook to check if email service is configured
export function useEmailServiceStatus() {
  return useQuery({
    queryKey: ['email-service-status'],
    queryFn: async () => {
      const isReady = emailNotificationService.isReady();
      const testResult = isReady ? await emailNotificationService.testConfiguration() : false;

      return {
        isConfigured: isReady,
        isWorking: testResult,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// Utility function to prepare tournament notification data
export function prepareTournamentNotificationData(
  tournament: Tournament,
  teams: Team[],
  changes?: string[]
): TournamentNotificationData {
  return {
    tournament,
    teams,
    changes,
  };
}

// Utility function to prepare stage notification data
export function prepareStageNotificationData(
  stage: Stage,
  tournament: Tournament,
  teams: Team[],
  changes?: string[]
): StageNotificationData {
  return {
    stage,
    tournament,
    teams,
    changes,
  };
}

// Hook for automatic notifications when tournament is created
export function useAutoTournamentNotifications() {
  const sendTournamentNotification = useSendTournamentNotification();

  const sendNotificationOnCreate = async (tournament: Tournament, teams: Team[]) => {
    if (teams.length === 0) {
      console.log('[TournamentNotifications] No teams to notify for tournament:', tournament.name);
      return;
    }

    const notificationData = prepareTournamentNotificationData(tournament, teams);
    await sendTournamentNotification.mutateAsync(notificationData);
  };

  const sendNotificationOnUpdate = async (
    tournament: Tournament,
    teams: Team[],
    changes: string[]
  ) => {
    if (teams.length === 0) {
      console.log('[TournamentNotifications] No teams to notify for tournament update:', tournament.name);
      return;
    }

    const notificationData = prepareTournamentNotificationData(tournament, teams, changes);
    await sendTournamentNotification.mutateAsync(notificationData);
  };

  return {
    sendNotificationOnCreate,
    sendNotificationOnUpdate,
    isLoading: sendTournamentNotification.isPending,
  };
}

// Hook for automatic notifications when stage is created
export function useAutoStageNotifications() {
  const sendStageNotification = useSendStageNotification();

  const sendNotificationOnCreate = async (
    stage: Stage,
    tournament: Tournament,
    teams: Team[]
  ) => {
    if (teams.length === 0) {
      console.log('[StageNotifications] No teams to notify for stage:', stage.name);
      return;
    }

    const notificationData = prepareStageNotificationData(stage, tournament, teams);
    await sendStageNotification.mutateAsync(notificationData);
  };

  const sendNotificationOnUpdate = async (
    stage: Stage,
    tournament: Tournament,
    teams: Team[],
    changes: string[]
  ) => {
    if (teams.length === 0) {
      console.log('[StageNotifications] No teams to notify for stage update:', stage.name);
      return;
    }

    const notificationData = prepareStageNotificationData(stage, tournament, teams, changes);
    await sendStageNotification.mutateAsync(notificationData);
  };

  return {
    sendNotificationOnCreate,
    sendNotificationOnUpdate,
    isLoading: sendStageNotification.isPending,
  };
}

// Hook to get teams for a tournament (for notification purposes)
export function useTournamentTeamsForNotification(tournamentId: string) {
  return useQuery({
    queryKey: ['tournament-teams-notification', tournamentId],
    queryFn: async (): Promise<Team[]> => {
      // This would typically fetch from your API
      // For now, return empty array as placeholder
      console.log('[TournamentNotifications] Fetching teams for tournament:', tournamentId);
      return [];
    },
    enabled: !!tournamentId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
