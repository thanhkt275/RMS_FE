import {
  validateMatch,
  validateMatches,
  createSafeMatchData,
  extractSafeTeamInformation,
  validateAndFixBracketStructure,
  handleLayoutEdgeCases,
  createFallbackMatch,
} from '../validation';

describe('Validation utilities', () => {
  describe('validateMatch', () => {
    it('should validate a correct match', () => {
      const validMatch = {
        id: 'match-1',
        matchNumber: 1,
        scheduledTime: '2024-01-01T10:00:00Z',
        status: 'PENDING',
        alliances: [
          {
            color: 'RED',
            teamAlliances: [{ teamId: 'team1', team: { id: 'team1', name: 'Team 1' } }],
          },
          {
            color: 'BLUE',
            teamAlliances: [{ teamId: 'team2', team: { id: 'team2', name: 'Team 2' } }],
          },
        ],
      };

      const result = validateMatch(validMatch);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidMatch = {
        matchNumber: 1,
        // missing id
      };

      const result = validateMatch(invalidMatch);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Match missing required field: id');
    });

    it('should handle null match', () => {
      const result = validateMatch(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Match is null or undefined');
    });

    it('should detect invalid status', () => {
      const matchWithInvalidStatus = {
        id: 'match-1',
        status: 'INVALID_STATUS',
      };

      const result = validateMatch(matchWithInvalidStatus);
      expect(result.warnings).toContain('Invalid match status: INVALID_STATUS');
    });
  });

  describe('validateMatches', () => {
    it('should validate an array of matches', () => {
      const matches = [
        { id: 'match-1', matchNumber: 1 },
        { id: 'match-2', matchNumber: 2 },
      ];

      const result = validateMatches(matches);
      expect(result.isValid).toBe(true);
    });

    it('should detect duplicate IDs', () => {
      const matches = [
        { id: 'match-1', matchNumber: 1 },
        { id: 'match-1', matchNumber: 2 }, // duplicate ID
      ];

      const result = validateMatches(matches);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Duplicate match IDs'))).toBe(true);
    });

    it('should handle non-array input', () => {
      const result = validateMatches('not an array' as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Matches must be an array');
    });
  });

  describe('createSafeMatchData', () => {
    it('should create safe data for valid match', () => {
      const validMatch = {
        id: 'match-1',
        matchNumber: 1,
        alliances: [
          {
            color: 'RED',
            teamAlliances: [{ teamId: 'team1', team: { id: 'team1', name: 'Team 1' } }],
          },
          {
            color: 'BLUE',
            teamAlliances: [{ teamId: 'team2', team: { id: 'team2', name: 'Team 2' } }],
          },
        ],
      };

      const result = createSafeMatchData(validMatch);
      expect(result.isValid).toBe(true);
      expect(result.match).toBe(validMatch);
      expect(result.fallbackData).toBeUndefined();
    });

    it('should create fallback data for invalid match', () => {
      const invalidMatch = {
        // missing required fields
      };

      const result = createSafeMatchData(invalidMatch);
      expect(result.isValid).toBe(false);
      expect(result.fallbackData).toBeDefined();
      expect(result.match.id).toBeDefined();
    });
  });

  describe('extractSafeTeamInformation', () => {
    it('should extract team information correctly', () => {
      const match = {
        alliances: [
          {
            color: 'RED',
            teamAlliances: [
              { teamId: 'team1', team: { id: 'team1', name: 'Team Alpha', teamNumber: '1234' } },
            ],
          },
          {
            color: 'BLUE',
            teamAlliances: [
              { teamId: 'team2', team: { id: 'team2', name: 'Team Beta', teamNumber: '5678' } },
            ],
          },
        ],
      };

      const result = extractSafeTeamInformation(match);
      expect(result.red).toEqual(['1234 Team Alpha']);
      expect(result.blue).toEqual(['5678 Team Beta']);
    });

    it('should handle missing team data', () => {
      const match = {
        alliances: [
          { color: 'RED', teamAlliances: [] },
          { color: 'BLUE', teamAlliances: [] },
        ],
      };

      const result = extractSafeTeamInformation(match);
      expect(result.red).toEqual(['TBD']);
      expect(result.blue).toEqual(['TBD']);
    });

    it('should handle malformed match data', () => {
      const result = extractSafeTeamInformation(null);
      expect(result.red).toEqual(['TBD']);
      expect(result.blue).toEqual(['TBD']);
    });
  });

  describe('validateAndFixBracketStructure', () => {
    it('should filter out invalid matches', () => {
      const matches = [
        { id: 'match-1', matchNumber: 1 },
        null, // invalid
        { id: 'match-2', matchNumber: 2 },
      ];

      const result = validateAndFixBracketStructure(matches as any);
      expect(result).toHaveLength(2);
      expect(result.every(match => match.id)).toBe(true);
    });

    it('should sort matches by round and match number', () => {
      const matches = [
        { id: 'match-2', matchNumber: 2, roundNumber: 1 },
        { id: 'match-1', matchNumber: 1, roundNumber: 1 },
        { id: 'match-3', matchNumber: 1, roundNumber: 2 },
      ];

      const result = validateAndFixBracketStructure(matches);
      expect(result[0].matchNumber).toBe(1);
      expect(result[0].roundNumber).toBe(1);
      expect(result[2].roundNumber).toBe(2);
    });
  });

  describe('handleLayoutEdgeCases', () => {
    it('should handle empty rounds', () => {
      const result = handleLayoutEdgeCases([], { width: 800, height: 600 });
      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain('No rounds available for display');
    });

    it('should handle single match tournament', () => {
      const rounds = [[{ id: 'match-1', matchNumber: 1 } as any]];
      const result = handleLayoutEdgeCases(rounds, { width: 800, height: 600 });
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Single match tournament detected');
    });

    it('should handle small container dimensions', () => {
      const rounds = [[{ id: 'match-1', matchNumber: 1 } as any]];
      const result = handleLayoutEdgeCases(rounds, { width: 100, height: 50 });
      expect(result.warnings).toContain('Container dimensions are very small - display may be compromised');
    });
  });

  describe('createFallbackMatch', () => {
    it('should create a valid fallback match', () => {
      const fallback = createFallbackMatch('test-id');
      expect(fallback.id).toBe('test-id');
      expect(fallback.matchNumber).toBe('TBD');
      expect(fallback.status).toBe('PENDING');
      expect(fallback.alliances).toHaveLength(2);
    });

    it('should generate unique ID when none provided', () => {
      const fallback1 = createFallbackMatch();
      const fallback2 = createFallbackMatch();
      expect(fallback1.id).not.toBe(fallback2.id);
    });
  });
});