import React from 'react';
import { Match } from '@/types/match.types';

// Main component props
export interface PlayoffBracketDisplayProps {
  matches: Match[];
  stageName?: string;
  className?: string;
}

// Layout and positioning interfaces
export interface BracketDimensions {
  containerWidth: number;
  containerHeight: number;
  roundWidth: number;
  roundGap: number;
  matchHeight: number;
  matchVerticalGap: number;
}

export interface MatchPosition {
  matchId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  roundIndex: number;
  matchIndex: number;
}

export interface BracketLayout {
  rounds: Match[][];
  positions: MatchPosition[];
  dimensions: BracketDimensions;
  connections: ConnectionData[];
}

// Connection line interfaces
export interface ConnectionData {
  fromMatches: [string, string]; // Two source match IDs
  toMatch: string;
  path: SVGPathData;
}

export interface SVGPathData {
  d: string;
  stroke: string;
  strokeWidth: number;
  fill: string;
}

// Component-specific props
export interface MatchCardProps {
  match: Match;
  isFinal: boolean;
  dimensions: {
    width: number;
    height: number;
  };
  sourceMatches?: {
    red?: Match;
    blue?: Match;
  };
}

export interface TeamDisplayProps {
  teams: string[];
  isWinner: boolean;
  isTBD: boolean;
  isFinal: boolean;
  alliance: 'RED' | 'BLUE';
}

export interface RoundLabelProps {
  roundIndex: number;
  totalRounds: number;
  isFinal: boolean;
  className?: string;
}

export interface ConnectionLinesProps {
  connections: ConnectionData[];
  className?: string;
}

export interface EmptyStateProps {
  message?: string;
  className?: string;
}

// Error handling interfaces
export interface BracketError {
  type: 'validation' | 'layout' | 'rendering' | 'data';
  message: string;
  details?: string;
  recoverable: boolean;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SafeMatchData {
  match: Match;
  displayTeams: {
    red: string[];
    blue: string[];
  };
  isValid: boolean;
  fallbackData?: Partial<Match>;
}

export interface BracketRoundProps {
  matches: Match[];
  roundIndex: number;
  totalRounds: number;
  positions: MatchPosition[];
  dimensions: BracketDimensions;
  className?: string;
}

// Responsive scaling interfaces
export interface ScalingParams {
  containerWidth: number;
  containerHeight: number;
  totalRounds: number;
  maxMatchesInRound: number;
}

export interface ScaledDimensions {
  matchWidth: number;
  matchHeight: number;
  roundGap: number;
  verticalGap: number;
  scaleFactor: number;
}

// Hook return types
export interface UseBracketLayoutReturn {
  layout: BracketLayout;
  baseDimensions: BracketDimensions;
  isLoading: boolean;
  error: string | null;
}

export interface UseResponsiveScaleReturn {
  scaledDimensions: ScaledDimensions;
  scaleFactor: number;
  isScaled: boolean;
}

// Utility function types
export interface PositionCalculator {
  calculateMatchPosition(
    roundIndex: number,
    matchIndex: number,
    rounds: Match[][],
    dimensions: BracketDimensions
  ): MatchPosition;
  
  calculateConnectionPath(
    sourceMatch1: MatchPosition,
    sourceMatch2: MatchPosition,
    targetMatch: MatchPosition,
    dimensions: BracketDimensions
  ): SVGPathData;
}

export interface EdgeCaseHandlers {
  handleEmptyMatches(): React.ReactElement;
  handleSingleMatch(match: Match): React.ReactElement;
  handleInvalidRoundStructure(matches: Match[]): Match[][];
  handleOverflowContent(dimensions: BracketDimensions): BracketDimensions;
}

// Enhanced match interface for bracket-specific data
export interface BracketMatchData extends Match {
  displayTeams: {
    red: string[];
    blue: string[];
  };
  isWinner: {
    red: boolean;
    blue: boolean;
  };
  isTBD: {
    red: boolean;
    blue: boolean;
  };
  roundLabel: string;
  isFinalMatch: boolean;
}