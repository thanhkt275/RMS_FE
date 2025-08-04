import { 
  GameElement, 
  AllianceScores, 
  MatchScoreData, 
  RealtimeScoreUpdate, 
  PersistScoreData, 
  ApiScoreData,
  Alliance,
  ScoreType,
  GameElementDto
} from '../types/index';

// Score calculation service interface
export interface IScoreCalculationService {
  calculateTotalScore(autoScore: number, driveScore: number): number;
  calculateGameElementScore(gameElements: GameElement[]): number;
  validateScoreData(scoreData: Partial<MatchScoreData>): boolean;
}

// Data transformation service interface
export interface IDataTransformationService {
  objectToArrayGameElements(gameElements: Record<string, any> | any[] | null | undefined): GameElement[];
  arrayToObjectGameElements(gameElements: GameElement[]): Record<string, number>;
  toGameElementDtoArray(gameElements: Record<string, number> | GameElement[]): GameElementDto[];
  transformToApiFormat(scoreData: MatchScoreData, config: { matchId: string }): ApiScoreData;
  transformToPersistFormat(scoreData: MatchScoreData, config: { matchId: string; fieldId?: string; tournamentId: string }): PersistScoreData;
  transformToRealtimeFormat(scoreData: MatchScoreData, config: { matchId: string; fieldId?: string; tournamentId: string }): RealtimeScoreUpdate;
}

// API service interface
export interface IApiService {
  createMatchScores(data: ApiScoreData): Promise<any>;
  updateMatchScores(id: string, data: ApiScoreData): Promise<any>;
  getMatchScores(matchId: string): Promise<any>;
  refetchScores(): Promise<any>;
}



// User activity service interface
export interface IUserActivityService {
  markUserActive(): void;
  isUserActive(): boolean;
  resetActivity(): void;
  setActivityTimeout(timeout: number): void;
}

// Cache service interface
export interface ICacheService {
  updateScoreCache(matchId: string, data: Partial<RealtimeScoreUpdate>): void;
  clearCache(matchId: string): void;
  getCache(matchId: string): any;
}

// Scoring strategy interface
export interface IScoringStrategy {
  calculateScore(alliance: Alliance, scoreType: ScoreType, value: number, context: MatchScoreData): number;
  validateScore(alliance: Alliance, scoreType: ScoreType, value: number, context: MatchScoreData): boolean;
}

// Main scoring state service interface
export interface IScoringStateService {
  getState(): MatchScoreData;
  updateScore(alliance: Alliance, scoreType: ScoreType, value: number): void;
  updateGameElements(alliance: Alliance, elements: GameElement[]): void;
  updateTeamCount(alliance: Alliance, count: number): void;
  updateMultiplier(alliance: Alliance, multiplier: number): void;
  updateScoreDetails(details: any): void;
  updateUIState(key: string, value: boolean): void;
  syncWithApiData(apiData: any): void;
  reset(): void;
}
