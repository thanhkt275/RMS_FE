'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  UserMinus, 
  AlertCircle, 
  CheckCircle,
  Loader2 
} from 'lucide-react';
import { FieldReferee } from '@/lib/types/tournament.types';
import { AvailableReferee } from '@/lib/types/referee.types';
import { 
  useFieldReferees, 
  useAssignFieldReferees, 
  useRemoveFieldReferee 
} from '@/hooks/api/use-field-referees';

interface FieldRefereeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldId: string;
  fieldName: string;
  tournamentId: string;
}

interface RefereeSelectionState {
  [userId: string]: {
    selected: boolean;
    isHeadRef: boolean;
  };
}

export function FieldRefereeDialog({
  open,
  onOpenChange,
  fieldId,
  fieldName,
  tournamentId,
}: FieldRefereeDialogProps) {
  const [refereeSelection, setRefereeSelection] = useState<RefereeSelectionState>({});
  const [isAssigning, setIsAssigning] = useState(false);

  const {
    fieldReferees,
    availableReferees,
    isLoading,
    error,
  } = useFieldReferees(tournamentId);

  const assignRefereesMutation = useAssignFieldReferees(fieldId, tournamentId);
  const removeRefereeMutation = useRemoveFieldReferee(fieldId, tournamentId);

  // Get current field referees
  const currentFieldReferees = fieldReferees.filter((ref: FieldReferee) => ref.fieldId === fieldId);

  // Get available referees (not assigned to this field)
  const currentRefereeIds = new Set(currentFieldReferees.map((ref: FieldReferee) => ref.userId));
  const unassignedReferees = availableReferees.filter((ref: AvailableReferee) => !currentRefereeIds.has(ref.id));

  const handleRefereeToggle = (userId: string) => {
    setRefereeSelection(prev => ({
      ...prev,
      [userId]: {
        selected: !prev[userId]?.selected,
        isHeadRef: prev[userId]?.isHeadRef || false,
      }
    }));
  };

  const handleHeadRefToggle = (userId: string) => {
    setRefereeSelection(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        isHeadRef: !prev[userId]?.isHeadRef,
      }
    }));
  };

  const handleAssignReferees = async () => {
    const selectedReferees = Object.entries(refereeSelection)
      .filter(([_, state]) => state.selected)
      .map(([userId, state]) => ({
        userId,
        isHeadRef: state.isHeadRef,
      }));

    if (selectedReferees.length === 0) return;

    setIsAssigning(true);
    try {
      await assignRefereesMutation.mutateAsync(selectedReferees);
      
      // Reset selection state
      setRefereeSelection({});
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveReferee = async (referee: FieldReferee) => {
    await removeRefereeMutation.mutateAsync(referee.userId);
  };

  const selectedCount = Object.values(refereeSelection).filter(state => state.selected).length;
  const headRefCount = currentFieldReferees.filter((ref: FieldReferee) => ref.isHeadRef).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Referees - {fieldName}
          </DialogTitle>
          <DialogDescription>
            Assign or remove referees for this field
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load referee data. Please try again.
            </AlertDescription>
          </Alert>
        )}

        <ScrollArea className="max-h-[60vh] space-y-6">
          {/* Current Referees */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Current Referees</h3>
              <Badge variant="outline">
                {currentFieldReferees.length} assigned
              </Badge>
            </div>

            {currentFieldReferees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No referees assigned to this field</p>
              </div>
            ) : (
              <div className="space-y-2">
                {currentFieldReferees.map((referee: FieldReferee) => (
                  <div
                    key={referee.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      {referee.isHeadRef ? (
                        <UserCheck className="h-4 w-4 text-green-600" />
                      ) : (
                        <Users className="h-4 w-4 text-blue-600" />
                      )}
                      <div>
                        <p className="font-medium">{referee.user.username}</p>
                        <p className="text-sm text-muted-foreground">
                          {referee.user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={referee.isHeadRef ? 'default' : 'secondary'}>
                        {referee.isHeadRef ? 'Head Referee' : 'Assistant'}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveReferee(referee)}
                        disabled={removeRefereeMutation.isPending}
                      >
                        {removeRefereeMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserMinus className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Available Referees */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Available Referees</h3>
              <Badge variant="outline">
                {unassignedReferees.length} available
              </Badge>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading referees...</p>
              </div>
            ) : unassignedReferees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No available referees</p>
                <p className="text-sm">All referees are already assigned</p>
              </div>
            ) : (
              <div className="space-y-2">
                {unassignedReferees.map((referee: AvailableReferee) => (
                  <div
                    key={referee.id}
                    className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                      refereeSelection[referee.id]?.selected
                        ? 'bg-primary/5 border-primary'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id={`referee-${referee.id}`}
                        checked={refereeSelection[referee.id]?.selected || false}
                        onChange={() => handleRefereeToggle(referee.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <div>
                        <p className="font-medium">{referee.username}</p>
                        <p className="text-sm text-muted-foreground">
                          {referee.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{referee.role}</Badge>
                      {refereeSelection[referee.id]?.selected && (
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`head-ref-${referee.id}`}
                            checked={refereeSelection[referee.id]?.isHeadRef || false}
                            onCheckedChange={() => handleHeadRefToggle(referee.id)}
                          />
                          <Label htmlFor={`head-ref-${referee.id}`} className="text-sm">
                            Head Ref
                          </Label>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedCount > 0 && (
              <span>{selectedCount} referee{selectedCount !== 1 ? 's' : ''} selected</span>
            )}
          </div>
          <div className="space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {selectedCount > 0 && (
              <Button
                onClick={handleAssignReferees}
                disabled={isAssigning || assignRefereesMutation.isPending}
                className="min-w-[120px]"
              >
                {isAssigning || assignRefereesMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign ({selectedCount})
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
