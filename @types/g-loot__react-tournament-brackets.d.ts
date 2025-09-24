// Type declarations for @g-loot/react-tournament-brackets
declare module '@g-loot/react-tournament-brackets' {
  import { MouseEvent, ReactNode, ComponentType } from 'react';

  export interface Participant {
    id: string;
    name?: string;
    isWinner?: boolean;
    status?: 'PLAYED' | 'NO_SHOW' | 'WALK_OVER' | 'NO_PARTY' | null;
    resultText?: string | null;
    allianceColor?: 'RED' | 'BLUE';
    teams?: any[];
    score?: number;
    autoScore?: number;
    driveScore?: number;
    teamCount?: number;
  }

  export interface Match {
    id: string;
    name?: string;
    nextMatchId?: string | null;
    nextLooserMatchId?: string | null;
    tournamentRoundText?: string;
    startTime: string;
    state: 'PLAYED' | 'NO_SHOW' | 'WALK_OVER' | 'NO_PARTY' | 'DONE' | 'SCORE_DONE';
    participants: Participant[];
    matchNumber?: string | number;
    scheduledTime?: string;
  }

  export interface MatchComponentProps {
    match: Match;
    onMatchClick?: (data: { match: Match; topWon: boolean; bottomWon: boolean; event: MouseEvent<HTMLAnchorElement> }) => void;
    onPartyClick?: (participant: Participant, event: MouseEvent<HTMLElement>) => void;
    onMouseEnter?: (participantId: string) => void;
    onMouseLeave?: () => void;
    topParty: Participant;
    bottomParty: Participant;
    topWon: boolean;
    bottomWon: boolean;
    topHovered?: boolean;
    bottomHovered?: boolean;
    topText?: string;
    bottomText?: string;
    connectorColor?: string;
    computedStyles?: any;
    teamNameFallback?: string;
    resultFallback?: (participant: Participant) => string;
  }

  export interface SVGWrapperProps {
    children: ReactNode;
    width?: number;
    height?: number;
    background?: string;
    SVGBackground?: string;
    [key: string]: any;
  }

  export interface BracketProps {
    matches: Match[] | { upper: Match[]; lower: Match[] };
    matchComponent?: ComponentType<MatchComponentProps>;
    theme?: any;
    options?: {
      style?: {
        roundHeader?: {
          backgroundColor?: string;
          fontColor?: string;
          height?: number;
          fontSize?: number;
          fontFamily?: string;
        };
        connectorColor?: string;
        connectorColorHighlight?: string;
        spaceBetweenColumns?: number;
        spaceBetweenRows?: number;
        boxHeight?: number;
      };
    };
    svgWrapper?: ComponentType<SVGWrapperProps>;
  }

  export const SingleEliminationBracket: ComponentType<BracketProps>;
  export const DoubleEliminationBracket: ComponentType<BracketProps>;
  export const Match: ComponentType<MatchComponentProps>;
  export const SVGViewer: ComponentType<SVGWrapperProps>;
  export const MATCH_STATES: {
    PLAYED: 'PLAYED';
    NO_SHOW: 'NO_SHOW';
    WALK_OVER: 'WALK_OVER';
  };
  
  export function createTheme(theme: {
    textColor: { main: string; highlighted: string; dark: string };
    matchBackground: { wonColor: string; lostColor: string };
    score: {
      background: { wonColor: string; lostColor: string };
      text: { highlightedWonColor: string; highlightedLostColor: string };
    };
    border: { color: string; highlightedColor: string };
    roundHeader: { backgroundColor: string; fontColor: string };
    connectorColor: string;
    connectorColorHighlight: string;
  }): any;
}