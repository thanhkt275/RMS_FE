'use client';

import React from 'react';
import { useAudienceScores } from '@/hooks/audience-display/use-audience-scores';
import { cn } from '@/lib/utils';

interface ScoreDisplayProps {
    matchId: string;
    tournamentId: string;
    fieldId?: string;
    className?: string;
    showAnimations?: boolean;
    showDetails?: boolean;
}

interface ScoreCardProps {
    alliance: 'red' | 'blue';
    autoScore: number;
    driveScore: number;
    totalScore: number;
    penalty?: number;
    isAnimating: boolean;
    scoreDifference: number;
    className?: string;
}

const ScoreCard: React.FC<ScoreCardProps> = ({
    alliance,
    autoScore,
    driveScore,
    totalScore,
    penalty = 0,
    isAnimating,
    scoreDifference,
    className
}) => {
    const allianceColor = alliance === 'red' ? 'bg-red-600' : 'bg-blue-600';
    const textColor = 'text-white';

    return (
        <div className={cn(
            'relative rounded-lg p-3 sm:p-4 lg:p-6 shadow-lg transition-all duration-300',
            allianceColor,
            isAnimating && 'scale-105 shadow-xl',
            className
        )}>
            {/* Animation overlay */}
            {isAnimating && scoreDifference !== 0 && (
                <div className="absolute inset-0 rounded-lg bg-white/20 animate-pulse" />
            )}

            {/* Score difference indicator */}
            {isAnimating && scoreDifference > 0 && (
                <div className="absolute -top-1 sm:-top-2 -right-1 sm:-right-2 bg-green-500 text-white text-xs sm:text-sm font-bold px-1 sm:px-2 py-1 rounded-full animate-bounce">
                    +{scoreDifference}
                </div>
            )}

            <div className={cn('text-center', textColor)}>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold uppercase mb-2 sm:mb-3 lg:mb-4">
                    {alliance} Alliance
                </h3>

                {/* Total Score */}
                <div className={cn(
                    'text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-2 sm:mb-3 lg:mb-4 transition-all duration-300',
                    isAnimating && 'text-yellow-300 drop-shadow-lg'
                )}>
                    {totalScore}
                </div>

                {/* Score Breakdown */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4 text-xs sm:text-sm">
                    <div className="bg-black/20 rounded p-1 sm:p-2">
                        <div className="font-semibold">Auto</div>
                        <div className={cn(
                            'text-base sm:text-lg lg:text-xl font-bold',
                            isAnimating && 'text-yellow-300'
                        )}>
                            {autoScore}
                        </div>
                    </div>
                    <div className="bg-black/20 rounded p-1 sm:p-2">
                        <div className="font-semibold">Drive</div>
                        <div className={cn(
                            'text-base sm:text-lg lg:text-xl font-bold',
                            isAnimating && 'text-yellow-300'
                        )}>
                            {driveScore}
                        </div>
                    </div>
                </div>

                {/* Penalty Display */}
                {penalty > 0 && (
                    <div className="mt-1 sm:mt-2 bg-yellow-500 text-black rounded p-1 sm:p-2">
                        <div className="font-semibold text-xs sm:text-sm">Penalty</div>
                        <div className="text-sm sm:text-base lg:text-lg font-bold">-{penalty}</div>
                    </div>
                )}
            </div>
        </div>
    );
};

const ConnectionIndicator: React.FC<{
    isConnected: boolean;
    source: 'websocket' | 'database' | 'none';
    error: string | null;
}> = ({ isConnected, source, error }) => {
    if (error) {
        return (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1 rounded-full text-sm">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                <span>{error}</span>
            </div>
        );
    }

    if (!isConnected) {
        return (
            <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full text-sm">
                <div className="w-2 h-2 bg-yellow-600 rounded-full animate-pulse" />
                <span>Connecting...</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm">
            <div className="w-2 h-2 bg-green-600 rounded-full" />
            <span>Live ({source})</span>
        </div>
    );
};

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
    matchId,
    tournamentId,
    fieldId,
    className,
    showAnimations = true,
    showDetails = false
}) => {
    const {
        scores,
        scoreAnimations,
        scoreDifferences,
        isConnected,
        source,
        error,
        lastUpdateTime,
        updateCount
    } = useAudienceScores(matchId, {
        tournamentId,
        fieldId,
        enableValidation: true,
        enableAnimations: showAnimations
    });

    if (!matchId) {
        return (
            <div className={cn(
                'flex items-center justify-center h-32 sm:h-48 lg:h-64 bg-gray-100 rounded-lg',
                className
            )}>
                <div className="text-center text-gray-500">
                    <div className="text-lg sm:text-xl lg:text-2xl font-bold mb-1 sm:mb-2">No Match Selected</div>
                    <div className="text-sm sm:text-base">Select a match to view scores</div>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('space-y-3 sm:space-y-4 lg:space-y-6', className)}>
            {/* Connection Status */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                <h2 className="text-xl sm:text-2xl font-bold">Match Scores</h2>
                <ConnectionIndicator
                    isConnected={isConnected}
                    source={source}
                    error={error}
                />
            </div>

            {/* Score Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                <ScoreCard
                    alliance="red"
                    autoScore={scores.redAutoScore}
                    driveScore={scores.redDriveScore}
                    totalScore={scores.redTotalScore}
                    penalty={scores.redPenalty}
                    isAnimating={showAnimations && scoreAnimations.redScore}
                    scoreDifference={scoreDifferences.redTotal}
                />
                <ScoreCard
                    alliance="blue"
                    autoScore={scores.blueAutoScore}
                    driveScore={scores.blueDriveScore}
                    totalScore={scores.blueTotalScore}
                    penalty={scores.bluePenalty}
                    isAnimating={showAnimations && scoreAnimations.blueScore}
                    scoreDifference={scoreDifferences.blueTotal}
                />
            </div>

            {/* Match Winner Display */}
            {scores.redTotalScore !== scores.blueTotalScore && (
                <div className="text-center">
                    <div className={cn(
                        'inline-block px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-lg text-white font-bold text-base sm:text-lg lg:text-xl',
                        scores.redTotalScore > scores.blueTotalScore
                            ? 'bg-red-600'
                            : 'bg-blue-600'
                    )}>
                        {scores.redTotalScore > scores.blueTotalScore ? 'Red' : 'Blue'} Alliance Leads
                    </div>
                </div>
            )}

            {/* Debug Information */}
            {showDetails && (
                <div className="bg-gray-100 rounded-lg p-2 sm:p-3 lg:p-4 text-xs sm:text-sm">
                    <h3 className="font-bold mb-1 sm:mb-2">Score Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                        <div>
                            <div><strong>Match ID:</strong> {matchId}</div>
                            <div><strong>Tournament:</strong> {tournamentId}</div>
                            <div><strong>Field:</strong> {fieldId || 'All'}</div>
                        </div>
                        <div>
                            <div><strong>Last Update:</strong> {lastUpdateTime ? new Date(lastUpdateTime).toLocaleTimeString() : 'Never'}</div>
                            <div><strong>Updates:</strong> {updateCount}</div>
                            <div><strong>Real-time:</strong> {scores.isRealtime ? 'Yes' : 'No'}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScoreDisplay;