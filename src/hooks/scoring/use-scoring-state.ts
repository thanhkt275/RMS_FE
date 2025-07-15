import { useReducer, useCallback, useMemo, useRef } from 'react';
import { scoringReducer, initialScoringState, ScoringAction } from './reducers/scoring-reducer';
import { MatchScoreData, GameElement, Alliance, ScoreType } from './types/index';
import { IScoringStateService } from './interfaces/index';

export class ScoringStateService implements IScoringStateService {
  constructor(
    private getStateRef: { current: MatchScoreData },
    private dispatch: React.Dispatch<ScoringAction>
  ) {}

  getState(): MatchScoreData {
    return this.getStateRef.current;
  }

  updateScore(alliance: Alliance, scoreType: ScoreType, value: number): void {
    this.dispatch({
      type: 'SET_SCORE',
      payload: { alliance, scoreType, value },
    });
  }

  updateGameElements(alliance: Alliance, elements: GameElement[]): void {
    this.dispatch({
      type: 'SET_GAME_ELEMENTS',
      payload: { alliance, elements },
    });
  }

  updateTeamCount(alliance: Alliance, count: number): void {
    this.dispatch({
      type: 'SET_TEAM_COUNT',
      payload: { alliance, count },
    });
  }

  updateMultiplier(alliance: Alliance, multiplier: number): void {
    this.dispatch({
      type: 'SET_MULTIPLIER',
      payload: { alliance, multiplier },
    });
  }

  updateScoreDetails(details: any): void {
    this.dispatch({
      type: 'SET_SCORE_DETAILS',
      payload: details,
    });
  }

  updateUIState(key: string, value: boolean): void {
    this.dispatch({
      type: 'SET_UI_STATE',
      payload: { key, value },
    });
  }

  syncWithApiData(apiData: any): void {
    this.dispatch({
      type: 'SYNC_API_DATA',
      payload: apiData,
    });
  }

  reset(): void {
    this.dispatch({ type: 'RESET' });
  }
}

export function useScoringState() {
  const [state, dispatch] = useReducer(scoringReducer, initialScoringState);
  
  // Use a ref to hold the current state for stable service access
  const stateRef = useRef(state);
  stateRef.current = state;
  
  // Create stable service instance that only depends on dispatch
  const stateService = useMemo(() => {
    return new ScoringStateService(stateRef, dispatch);
  }, [dispatch]); // Only depend on dispatch, which is stable
  
  return {
    state,
    stateService,
    dispatch,
  };
}
