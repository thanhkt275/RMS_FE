'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  UserPlus, 
  AlertCircle, 
  Crown,
  Settings,
  CheckCircle2,
  Info
} from 'lucide-react';
import { Field } from '@/lib/types/tournament.types';
import { AvailableReferee } from '@/lib/types/referee.types';
import { useBatchAssignReferees } from '@/hooks/api/use-field-referees';

interface BulkRefereeAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: Field[];
  availableReferees: AvailableReferee[];
  tournamentId: string;
}

interface FieldAssignment {
  fieldId: string;
  fieldName: string;
  selectedReferees: string[];
  headRefereeId: string | null;
}

interface AssignmentStrategy {
  id: string;
  name: string;
  description: string;
  execute: (fields: Field[], referees: AvailableReferee[]) => FieldAssignment[];
}

const assignmentStrategies: AssignmentStrategy[] = [
  {
    id: 'balanced',
    name: 'Balanced Distribution',
    description: 'Evenly distribute referees across all fields (3-4 per field)',
    execute: (fields, referees) => {
      const assignments: FieldAssignment[] = [];
      const refereesPerField = Math.floor(referees.length / fields.length);
      const extraReferees = referees.length % fields.length;
      
      let refereeIndex = 0;
      
      fields.forEach((field, fieldIndex) => {
        const fieldRefereeCount = refereesPerField + (fieldIndex < extraReferees ? 1 : 0);
        const fieldReferees = referees.slice(refereeIndex, refereeIndex + fieldRefereeCount);
        
        // Prefer HEAD_REFEREE role for head referee
        const headReferee = fieldReferees.find(r => r.role === 'HEAD_REFEREE') || fieldReferees[0];
        
        assignments.push({
          fieldId: field.id,
          fieldName: field.name,
          selectedReferees: fieldReferees.map(r => r.id),
          headRefereeId: headReferee?.id || null,
        });
        
        refereeIndex += fieldRefereeCount;
      });
      
      return assignments;
    }
  },
  {
    id: 'priority',
    name: 'Priority Fields First',
    description: 'Fully staff priority fields first, then distribute remaining referees',
    execute: (fields, referees) => {
      const assignments: FieldAssignment[] = [];
      const availableReferees = [...referees];
      
      // Sort fields by priority (could be based on field number or other criteria)
      const priorityFields = [...fields].sort((a, b) => (a.number || 0) - (b.number || 0));
      
      priorityFields.forEach(field => {
        const fieldRefereeCount = Math.min(4, availableReferees.length);
        if (fieldRefereeCount >= 3) {
          const fieldReferees = availableReferees.splice(0, fieldRefereeCount);
          const headReferee = fieldReferees.find(r => r.role === 'HEAD_REFEREE') || fieldReferees[0];
          
          assignments.push({
            fieldId: field.id,
            fieldName: field.name,
            selectedReferees: fieldReferees.map(r => r.id),
            headRefereeId: headReferee?.id || null,
          });
        } else {
          assignments.push({
            fieldId: field.id,
            fieldName: field.name,
            selectedReferees: [],
            headRefereeId: null,
          });
        }
      });
      
      return assignments;
    }
  }
];

export function BulkRefereeAssignDialog({
  open,
  onOpenChange,
  fields,
  availableReferees,
  tournamentId,
}: BulkRefereeAssignDialogProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<string>('balanced');
  const [assignments, setAssignments] = useState<FieldAssignment[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const batchAssignMutation = useBatchAssignReferees(tournamentId);

  // Filter out referees that are already assigned
  const assignedRefereeIds = new Set(
    fields.flatMap(field => 
      field.fieldReferees?.map(fr => fr.userId) || []
    )
  );
  const unassignedReferees = availableReferees.filter(
    referee => !assignedRefereeIds.has(referee.id)
  );

  const generateAssignments = () => {
    const strategy = assignmentStrategies.find(s => s.id === selectedStrategy);
    if (!strategy) return;

    const newAssignments = strategy.execute(fields, unassignedReferees);
    setAssignments(newAssignments);
    setIsPreviewMode(true);
  };

  const executeAssignments = async () => {
    const batchAssignments = assignments.flatMap(assignment =>
      assignment.selectedReferees.map(refereeId => ({
        fieldId: assignment.fieldId,
        userId: refereeId,
        isHeadRef: refereeId === assignment.headRefereeId,
      }))
    );

    try {
      await batchAssignMutation.mutateAsync(batchAssignments);
      onOpenChange(false);
      setIsPreviewMode(false);
      setAssignments([]);
    } catch (error) {
      console.error('Failed to execute bulk assignment:', error);
    }
  };

  const resetAssignments = () => {
    setAssignments([]);
    setIsPreviewMode(false);
  };

  const getTotalAssignments = () => {
    return assignments.reduce((total, assignment) => total + assignment.selectedReferees.length, 0);
  };

  const getUnassignedFields = () => {
    return assignments.filter(assignment => assignment.selectedReferees.length === 0).length;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Referee Assignment
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          {!isPreviewMode ? (
            <div className="space-y-6">
              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{fields.length}</p>
                      <p className="text-sm text-muted-foreground">Total Fields</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{unassignedReferees.length}</p>
                      <p className="text-sm text-muted-foreground">Available Referees</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">
                        {Math.floor(unassignedReferees.length / fields.length)}
                      </p>
                      <p className="text-sm text-muted-foreground">Avg per Field</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Assignment Strategy Selection */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Assignment Strategy</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assignmentStrategies.map(strategy => (
                    <Card
                      key={strategy.id}
                      className={`cursor-pointer transition-colors ${
                        selectedStrategy === strategy.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedStrategy(strategy.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            <div className={`w-4 h-4 rounded-full border-2 ${
                              selectedStrategy === strategy.id
                                ? 'border-primary bg-primary'
                                : 'border-muted-foreground'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium">{strategy.name}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {strategy.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Validation Warnings */}
              {unassignedReferees.length < fields.length * 3 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Warning: Not enough referees for minimum staffing. You have {unassignedReferees.length} 
                    available referees, but need at least {fields.length * 3} (3 per field).
                  </AlertDescription>
                </Alert>
              )}

              {unassignedReferees.filter(r => r.role === 'HEAD_REFEREE').length < fields.length && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Note: You have {unassignedReferees.filter(r => r.role === 'HEAD_REFEREE').length} 
                    head referees for {fields.length} fields. Some assistant referees will be promoted to head referee.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Assignment Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{getTotalAssignments()}</p>
                      <p className="text-sm text-muted-foreground">Total Assignments</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {assignments.filter(a => a.headRefereeId).length}
                      </p>
                      <p className="text-sm text-muted-foreground">Fields with Head Ref</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">{getUnassignedFields()}</p>
                      <p className="text-sm text-muted-foreground">Unassigned Fields</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {unassignedReferees.length - getTotalAssignments()}
                      </p>
                      <p className="text-sm text-muted-foreground">Unused Referees</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Assignment Preview */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Assignment Preview</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assignments.map(assignment => (
                    <Card key={assignment.fieldId}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{assignment.fieldName}</CardTitle>
                          <Badge variant={assignment.selectedReferees.length >= 3 ? 'default' : 'secondary'}>
                            {assignment.selectedReferees.length} referees
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {assignment.selectedReferees.length > 0 ? (
                          <>
                            {/* Head Referee */}
                            {assignment.headRefereeId && (
                              <div>
                                <Label className="text-sm font-medium">Head Referee</Label>
                                <div className="flex items-center gap-2 mt-1">
                                  <Crown className="h-4 w-4 text-yellow-500" />
                                  <span className="text-sm">
                                    {unassignedReferees.find(r => r.id === assignment.headRefereeId)?.username}
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            {/* Assistant Referees */}
                            <div>
                              <Label className="text-sm font-medium">
                                Assistants ({assignment.selectedReferees.length - 1})
                              </Label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {assignment.selectedReferees
                                  .filter(id => id !== assignment.headRefereeId)
                                  .map(refereeId => {
                                    const referee = unassignedReferees.find(r => r.id === refereeId);
                                    return (
                                      <Badge key={refereeId} variant="outline" className="text-xs">
                                        {referee?.username}
                                      </Badge>
                                    );
                                  })}
                              </div>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">No referees assigned</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {!isPreviewMode && unassignedReferees.length > 0 && (
              <span>Ready to assign {unassignedReferees.length} referees to {fields.length} fields</span>
            )}
            {isPreviewMode && (
              <span>Preview: {getTotalAssignments()} assignments ready</span>
            )}
          </div>
          <div className="space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {!isPreviewMode ? (
              <Button
                onClick={generateAssignments}
                disabled={unassignedReferees.length === 0}
              >
                <Settings className="h-4 w-4 mr-2" />
                Generate Preview
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={resetAssignments}>
                  Back to Strategy
                </Button>
                <Button
                  onClick={executeAssignments}
                  disabled={batchAssignMutation.isPending || getTotalAssignments() === 0}
                  className="min-w-[140px]"
                >
                  {batchAssignMutation.isPending ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Execute Assignment
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
