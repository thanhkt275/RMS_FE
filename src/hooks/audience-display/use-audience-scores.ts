import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '@/websockets/simplified/useWebSocket';
import { apiClient } from '@/lib/api-client';
import { ScoreData } from '@/types/types';
import { BaseScoreData } from '@/types/websocket';

interface GameElement {
    element: string;
    count: number;
    pointsEach: number;
    totalPoints: number;
    operation: string;
}

interface AudienceScoreState {
    redAutoScore: number;
    redDriveScore: number;
    redTotalScore: number;
    blueAutoScore: number;
    blueDriveScore: number;
    blueTotalScore: number;
    redPenalty?: number;
    bluePenalty?: number;
    redGameElements?: GameElement[] | Record<string, number>;
    blueGameElements?: GameElement[] | Record<string, number>;
    redTeamCount?: number;
    blueTeamCount?: number;
    redMultiplier?: number;
    blueMultiplier?: number;
    scoreDetails?: Record<string, unknown>;
    timestamp?: number;
    isRealtime?: boolean;
}

interface ConnectionState {
    isConnected: boolean;
    lastUpdateTime: number;
    source: 'websocket' | 'database' | 'none';
    updateCount: number;
}

interface UseAudienceScoresOptions {
    tournamentId: string;
    fieldId?: string;
    enableValidation?: boolean;
    enableAnimations?: boolean;
}

const DEFAULT_SCORE_STATE: AudienceScoreState = {
    redAutoScore: 0,
    redDriveScore: 0,
    redTotalScore: 0,
    blueAutoScore: 0,
    blueDriveScore: 0,
    blueTotalScore: 0,
    redPenalty: 0,
    bluePenalty: 0,
    redGameElements: [],
    blueGameElements: [],
    redTeamCount: 2,
    blueTeamCount: 2,
    redMultiplier: 1.0,
    blueMultiplier: 1.0,
    scoreDetails: {},
    timestamp: 0,
    isRealtime: false,
};

/**
 * Hook for audience display score handling with unified WebSocket service
 * Provides real-time score updates with validation, animations, and error handling
 */
export function useAudienceScores(
    matchId: string,
    options: UseAudienceScoresOptions
) {
    const { tournamentId, fieldId, enableValidation = true, enableAnimations = true } = options;
    const { info, on, off, setRoomContext } = useWebSocket({
        autoConnect: true,
        tournamentId: tournamentId || 'all',
        fieldId,
    });
    // Keep room context in sync
    useEffect(() => {
        void setRoomContext({ tournamentId: tournamentId || 'all', fieldId });
    }, [tournamentId, fieldId, setRoomContext]);

    // Score state
    const [scores, setScores] = useState<AudienceScoreState>(DEFAULT_SCORE_STATE);
    const [previousScores, setPreviousScores] = useState<AudienceScoreState>(DEFAULT_SCORE_STATE);

    // Connection state
    const [connectionState, setConnectionState] = useState<ConnectionState>({
        isConnected: false,
        lastUpdateTime: 0,
        source: 'none',
        updateCount: 0,
    });

    // Animation state
    const [scoreAnimations, setScoreAnimations] = useState<{
        redScore: boolean;
        blueScore: boolean;
        redAuto: boolean;
        blueAuto: boolean;
        redDrive: boolean;
        blueDrive: boolean;
    }>({
        redScore: false,
        blueScore: false,
        redAuto: false,
        blueAuto: false,
        redDrive: false,
        blueDrive: false,
    });

    // Error state
    const [error, setError] = useState<string | null>(null);

    // Refs for preventing stale closures
    const currentMatchIdRef = useRef<string>(matchId);
    const lastUpdateTimeRef = useRef<number>(0);

    // Update current match ID ref
    useEffect(() => {
        currentMatchIdRef.current = matchId;
    }, [matchId]);

    // Validate score data
    const validateScoreData = useCallback((data: ScoreData | BaseScoreData): boolean => {
        if (!enableValidation) return true;

        try {
            // Check required fields
            if (!data.matchId || !data.tournamentId) {
                console.warn('[AudienceScores] Invalid score data: missing required fields', data);
                return false;
            }

            // Check numeric values
            const numericFields = [
                'redAutoScore', 'redDriveScore', 'redTotalScore',
                'blueAutoScore', 'blueDriveScore', 'blueTotalScore'
            ];

            for (const field of numericFields) {
                const value = (data as Record<string, any>)[field];
                if (value !== undefined && (typeof value !== 'number' || isNaN(value) || value < 0)) {
                    console.warn(`[AudienceScores] Invalid score data: ${field} is not a valid positive number`, value);
                    return false;
                }
            }

            // Check optional penalty fields
            const penaltyFields = ['redPenalty', 'bluePenalty'];
            for (const field of penaltyFields) {
                const value = (data as Record<string, any>)[field];
                if (value !== undefined && (typeof value !== 'number' || isNaN(value) || value < 0)) {
                    console.warn(`[AudienceScores] Invalid score data: ${field} is not a valid positive number`, value);
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error('[AudienceScores] Score validation error:', error);
            return false;
        }
    }, [enableValidation]);

    // Trigger score animations
    const triggerAnimations = useCallback((newScores: AudienceScoreState, oldScores: AudienceScoreState) => {
        if (!enableAnimations) return;

        const animations = {
            redScore: newScores.redTotalScore !== oldScores.redTotalScore,
            blueScore: newScores.blueTotalScore !== oldScores.blueTotalScore,
            redAuto: newScores.redAutoScore !== oldScores.redAutoScore,
            blueAuto: newScores.blueAutoScore !== oldScores.blueAutoScore,
            redDrive: newScores.redDriveScore !== oldScores.redDriveScore,
            blueDrive: newScores.blueDriveScore !== oldScores.blueDriveScore,
        };

        if (Object.values(animations).some(Boolean)) {
            setScoreAnimations(animations);

            // Clear animations after 2 seconds
            setTimeout(() => {
                setScoreAnimations({
                    redScore: false,
                    blueScore: false,
                    redAuto: false,
                    blueAuto: false,
                    redDrive: false,
                    blueDrive: false,
                });
            }, 2000);
        }
    }, [enableAnimations]);

    // Update scores with validation and animations
    const updateScores = useCallback((data: ScoreData | BaseScoreData, source: 'websocket' | 'database') => {
        // Validate data
        if (!validateScoreData(data)) {
            setError('Invalid score data received');
            return;
        }

        // Check if this is for the current match
        if (data.matchId !== currentMatchIdRef.current) {
            console.log(`[AudienceScores] Ignoring score update for different match: ${data.matchId} (current: ${currentMatchIdRef.current})`);
            return;
        }

        // Prevent duplicate updates
        const updateTime = Date.now();
        if (updateTime - lastUpdateTimeRef.current < 50) { // 50ms debounce
            console.log('[AudienceScores] Debouncing rapid score update');
            return;
        }
        lastUpdateTimeRef.current = updateTime;

        const newScores: AudienceScoreState = {
            redAutoScore: data.redAutoScore || 0,
            redDriveScore: data.redDriveScore || 0,
            redTotalScore: data.redTotalScore || 0,
            blueAutoScore: data.blueAutoScore || 0,
            blueDriveScore: data.blueDriveScore || 0,
            blueTotalScore: data.blueTotalScore || 0,
            redPenalty: (data as any).redPenalty || 0,
            bluePenalty: (data as any).bluePenalty || 0,
            redGameElements: data.redGameElements || [],
            blueGameElements: data.blueGameElements || [],
            redTeamCount: data.redTeamCount || 2,
            blueTeamCount: data.blueTeamCount || 2,
            redMultiplier: data.redMultiplier || 1.0,
            blueMultiplier: data.blueMultiplier || 1.0,
            scoreDetails: data.scoreDetails || {},
            timestamp: updateTime,
            isRealtime: source === 'websocket',
        };

        // Store previous scores for animations
        setPreviousScores(scores);

        // Trigger animations
        triggerAnimations(newScores, scores);

        // Update scores
        setScores(newScores);

        // Update connection state
        setConnectionState(prev => ({
            ...prev,
            lastUpdateTime: updateTime,
            source,
            updateCount: prev.updateCount + 1,
        }));

        // Clear any previous errors
        setError(null);

        console.log(`[AudienceScores] Score updated from ${source}:`, newScores);
    }, [scores, validateScoreData, triggerAnimations]);

    // Reset scores when match changes
    useEffect(() => {
        if (!matchId) {
            setScores(DEFAULT_SCORE_STATE);
            setPreviousScores(DEFAULT_SCORE_STATE);
            setConnectionState(prev => ({
                ...prev,
                source: 'none',
                lastUpdateTime: 0,
            }));
            setError(null);
            console.log('[AudienceScores] Scores reset for new match');
        }
    }, [matchId]);

    // Subscribe to WebSocket score updates
    useEffect(() => {
        if (!matchId) return;

        const handleScoreUpdate = (data: BaseScoreData) => {
            console.log('[AudienceScores] WebSocket score update received:', data);

            // Field filtering
            const shouldAccept =
                !fieldId || // No field filtering
                !data.fieldId || // Tournament-wide update
                data.fieldId === fieldId; // Field-specific update

            if (!shouldAccept) {
                console.log(`[AudienceScores] Ignoring score update for different field: ${data.fieldId} (expected: ${fieldId})`);
                return;
            }

            updateScores(data, 'websocket');
        };

        console.log(`[AudienceScores] Subscribing to score updates for match: ${matchId}`);
        const sub = on('score_update' as any, handleScoreUpdate as any);

        return () => {
            off('score_update' as any, handleScoreUpdate as any);
            sub?.unsubscribe?.();
        };
    }, [matchId, fieldId, on, off, updateScores]);

    // Monitor connection status
    useEffect(() => {
        const connected = info.state === 'connected';
        setConnectionState(prev => ({
            ...prev,
            isConnected: connected,
        }));
        if (connected) {
            setError(null);
            console.log('[AudienceScores] WebSocket connected');
        } else {
            setError('Connection lost - scores may not be up to date');
            console.warn('[AudienceScores] WebSocket disconnected');
        }
    }, [info.state]);

    // Database fallback for initial score loading
    const loadInitialScores = useCallback(async () => {
        if (!matchId) return;

        try {
            console.log(`[AudienceScores] Loading initial scores for match: ${matchId}`);
            const data = await apiClient.get<ScoreData>(`/match-scores/match/${matchId}`);

            if (data && connectionState.source === 'none') {
                updateScores(data, 'database');
                console.log('[AudienceScores] Initial scores loaded from database');
            }
        } catch (error) {
            console.warn('[AudienceScores] Failed to load initial scores:', error);
            // Don't set error state for initial load failures
        }
    }, [matchId, connectionState.source, updateScores]);

    // Load initial scores when match changes
    useEffect(() => {
        if (matchId && connectionState.source === 'none') {
            loadInitialScores();
        }
    }, [matchId, loadInitialScores, connectionState.source]);

    // Calculate score differences for animations
    const scoreDifferences = {
        redTotal: scores.redTotalScore - previousScores.redTotalScore,
        blueTotal: scores.blueTotalScore - previousScores.blueTotalScore,
        redAuto: scores.redAutoScore - previousScores.redAutoScore,
        blueAuto: scores.blueAutoScore - previousScores.blueAutoScore,
        redDrive: scores.redDriveScore - previousScores.redDriveScore,
        blueDrive: scores.blueDriveScore - previousScores.blueDriveScore,
    };

    return {
        // Score data
        scores,
        previousScores,
        scoreDifferences,

        // Animation state
        scoreAnimations,

        // Connection state
        isConnected: connectionState.isConnected,
        lastUpdateTime: connectionState.lastUpdateTime,
        source: connectionState.source,
        updateCount: connectionState.updateCount,

        // Error state
        error,

        // Utility functions
        refreshScores: loadInitialScores,
        resetScores: () => {
            setScores(DEFAULT_SCORE_STATE);
            setPreviousScores(DEFAULT_SCORE_STATE);
            setError(null);
        },

        // Debug information
        getDebugInfo: () => ({
            matchId: currentMatchIdRef.current,
            fieldId,
            tournamentId,
            connectionState,
            lastUpdate: new Date(connectionState.lastUpdateTime).toISOString(),
            enableValidation,
            enableAnimations,
        }),
    };
}