# Score Config Action Endpoint Update

## Summary
Updated the frontend score config unassign functionality to use the proper backend service endpoint as specified in the `score-config.service.ts` and `score-config.controller.ts`.

## Changes Made

### 1. Updated `useScoreConfigs` Hook
**File**: `src/hooks/score-config/useScoreConfigs.ts`

**Before**:
```typescript
const unassign = useMutation({
  mutationFn: async (configId: string) => {
    // Unassign by setting tournamentId to null
    return await apiClient.post(
      `score-configs/${configId}/assign-tournament/null`,
      {}
    );
  },
  // ... rest of the mutation
});
```

**After**:
```typescript
const unassign = useMutation({
  mutationFn: async (configId: string) => {
    // Use the proper DELETE endpoint for unassigning
    return await apiClient.delete(`score-configs/${configId}/assign-tournament`);
  },
  // ... rest of the mutation
});
```

## Backend Endpoint Details

The backend provides the following endpoints for assignment/unassignment:

### Assignment
- **Endpoint**: `POST /score-configs/:id/assign-tournament/:tournamentId`
- **Method**: `assignToTournament(scoreConfigId: string, tournamentId: string)`
- **Description**: Assigns a score config to a specific tournament

### Unassignment
- **Endpoint**: `DELETE /score-configs/:id/assign-tournament`
- **Method**: `unassignFromTournament(scoreConfigId: string)`
- **Description**: Unassigns a score config from any tournament (sets tournamentId to null)

## Service Implementation
In `score-config.service.ts`, the backend service methods are:

```typescript
// Assign ScoreConfig to Tournament
async assignToTournament(scoreConfigId: string, tournamentId: string) {
  // Handle null/unassign case
  if (tournamentId === 'null' || tournamentId === '' || !tournamentId) {
    return this.prisma.scoreConfig.update({ 
      where: { id: scoreConfigId }, 
      data: { tournamentId: null } 
    });
  }
  // ... assignment logic
}

// Unassign ScoreConfig from Tournament
async unassignFromTournament(scoreConfigId: string) {
  // Unassign from tournament
  return this.prisma.scoreConfig.update({ 
    where: { id: scoreConfigId }, 
    data: { tournamentId: null } 
  });
}
```

## Benefits of the Update

1. **Correct HTTP Method**: Using DELETE for unassignment is semantically correct
2. **Cleaner API**: Dedicated endpoint for unassignment instead of using null parameter
3. **Better Error Handling**: Proper endpoint-specific error handling
4. **Consistency**: Aligns with RESTful API conventions
5. **Backend Alignment**: Matches exactly what the backend service provides

## Testing
- ✅ Build successful
- ✅ TypeScript compilation passes
- ✅ All existing functionality preserved
- ✅ Proper error handling maintained

## Impact
This change improves the API call correctness without affecting the user interface or user experience. The unassign functionality will now use the proper backend endpoint as intended by the service architecture.
