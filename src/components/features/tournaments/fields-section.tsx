'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
import type { Field } from '@/lib/types/tournament.types';
import type { AvailableReferee } from '@/lib/types/referee.types';
import { useFieldReferees } from '@/hooks/api/use-field-referees';
import { FieldCard } from './field-card';
import { FieldRefereeDialog } from './field-referee-dialog';
import { BulkRefereeAssignDialog } from './bulk-referee-assign-dialog';

interface FieldsSectionProps {
  tournamentId: string;
  fields: Field[];
}

export function FieldsSection({ tournamentId, fields }: FieldsSectionProps) {
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  
  const { availableReferees, isLoading: isRefereesLoading }: {
    availableReferees?: AvailableReferee[];
    isLoading: boolean;
  } = useFieldReferees(tournamentId);

  const handleFieldSelect = (field: Field) => {
    setSelectedField(field);
  };

  const handleCloseDialog = () => {
    setSelectedField(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Tournament Fields</h2>
          <p className="text-gray-600 mt-1">
            Manage fields and assign referees (3-4 referees per field, 1 head referee)
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setShowBulkAssign(true)}
            disabled={!availableReferees?.length || isRefereesLoading}
          >
            <Users className="h-4 w-4 mr-2" />
            Bulk Assign
          </Button>
          <Button onClick={() => {/* TODO: Add field creation */}}>
            <Plus className="h-4 w-4 mr-2" />
            Add Field
          </Button>
        </div>
      </div>
      
      {/* Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {fields.map(field => (
          <FieldCard 
            key={field.id} 
            field={field} 
            onAssignReferees={() => handleFieldSelect(field)}
            availableReferees={availableReferees}
          />
        ))}
      </div>
      
      {/* Empty State */}
      {fields.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No fields configured</h3>
          <p className="text-gray-500 mb-4">Get started by adding your first tournament field.</p>
          <Button onClick={() => {/* TODO: Add field creation */}}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Field
          </Button>
        </div>
      )}
      
      {/* Dialogs */}
      {selectedField && (
        <FieldRefereeDialog
          open={!!selectedField}
          onOpenChange={(open) => !open && handleCloseDialog()}
          fieldId={selectedField.id}
          fieldName={selectedField.name}
          tournamentId={tournamentId}
        />
      )}
      
      {showBulkAssign && (
        <BulkRefereeAssignDialog
          open={showBulkAssign}
          onOpenChange={setShowBulkAssign}
          fields={fields}
          availableReferees={availableReferees || []}
          tournamentId={tournamentId}
        />
      )}
    </div>
  );
}
