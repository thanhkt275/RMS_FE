"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import ScoreConfigTable from "@/components/features/score-config/ScoreConfigTable";
import ScoreConfigForm, { ScoreConfigFormValues } from "@/components/features/score-config/ScoreConfigForm";
import AssignConfigDialog from "@/components/features/score-config/AssignConfigDialog";

import { useScoreConfig } from "@/hooks/score-config/useScoreConfigs";
import { useTournaments } from "@/hooks/tournaments/use-tournaments";
import { toast } from "sonner";

const ScoreConfigPage = () => {
  // State management
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedConfigForEdit, setSelectedConfigForEdit] = useState<ScoreConfigFormValues | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedConfigForAssignment, setSelectedConfigForAssignment] = useState<any | null>(null);

  // Data fetching and mutations
  const {
    data: configs = [],
    isLoading,
    create,
    update,
    remove,
    assign,
    unassign,
  } = useScoreConfig();
  
  // Fetch tournaments for quick assignment
  const { data: tournaments = [] } = useTournaments();

  // Handlers
  const handleNew = () => {
    setSelectedConfigForEdit(null);
    setIsFormOpen(true);
  };
  const handleEdit = (config: any) => {
    setSelectedConfigForEdit(config);
    setIsFormOpen(true);
  };
  const handleDelete = (id: string) => {
    remove.mutate(id);
  };
  const handleAssign = (config: any) => {
    setSelectedConfigForAssignment(config);
    setIsAssignDialogOpen(true);
  };
  
  const handleUnassign = (config: any) => {
    unassign.mutate(config.id, {
      onSuccess: () => {
        toast.success('Configuration Unassigned', {
          description: `"${config.name}" has been unassigned from its tournament.`,
        });
      },
      onError: () => {
        toast.error('Unassignment Failed', {
          description: 'Failed to unassign the configuration. Please try again.',
        });
      },
    });
  };
  
  const handleQuickAssign = (configId: string) => {
    // For quick assign, we'll just open the assignment dialog with this config
    const config = configs.find(c => c.id === configId);
    if (config) {
      setSelectedConfigForAssignment(config);
      setIsAssignDialogOpen(true);
    }
  };
  
  const handleQuickUnassign = (configId: string) => {
    const config = configs.find(c => c.id === configId);
    if (config) {
      handleUnassign(config);
    }
  };
  const handleFormSubmit = (data: ScoreConfigFormValues) => {
  // Map frontend form data to backend DTO keys
  const payload = {
    name: data.name,
    description: data.description,
    totalScoreFormula: data.totalScoreFormula,
    scoreSections: data.scoreSections,
    // Legacy fields for backward compatibility
    scoreElements: data.scoreElements,
    bonusConditions: data.bonusConditions,
    penaltyConditions: data.penaltyConditions,
  };
  
  console.log('[DEBUG] Form submission - Raw data:', data);
  console.log('[DEBUG] Form submission - Payload:', payload);
  console.log('[DEBUG] Form submission - Selected config for edit:', selectedConfigForEdit);
  
  if (selectedConfigForEdit) {
    const configId = (selectedConfigForEdit as any).id;
    console.log('[DEBUG] Updating config with ID:', configId);
    update.mutate({ id: configId, data: payload }, {
      onSuccess: (result) => {
        console.log('[DEBUG] Update success result:', result);
        toast.success('Configuration Updated', {
          description: `"${data.name}" has been updated successfully.`,
        });
        setIsFormOpen(false);
      },
      onError: (error) => {
        console.error('[DEBUG] Update error:', error);
        toast.error('Update Failed', {
          description: 'Failed to update the configuration. Please try again.',
        });
      },
    });
  } else {
    console.log('[DEBUG] Creating new config');
    create.mutate(payload, {
      onSuccess: (result) => {
        console.log('[DEBUG] Create success result:', result);
        toast.success('Configuration Created', {
          description: `"${data.name}" has been created successfully.`,
        });
        setIsFormOpen(false);
      },
      onError: (error) => {
        console.error('[DEBUG] Create error:', error);
        toast.error('Creation Failed', {
          description: 'Failed to create the configuration. Please try again.',
        });
      },
    });
  }
  };
  const handleAssignSubmit = (tournamentIds: string[]) => {
    if (selectedConfigForAssignment) {
      assign.mutate({ configId: selectedConfigForAssignment.id, tournamentIds }, {
        onSuccess: () => setIsAssignDialogOpen(false),
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Score Configurations</h1>
        <Button onClick={handleNew}>New Score Config</Button>
      </div>
      <ScoreConfigTable
        configs={configs}
        isLoading={isLoading}
        onEdit={handleEdit}
        onAssign={handleAssign}
        onUnassign={handleUnassign}
        onDelete={handleDelete}
      />
      <ScoreConfigForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        configToEdit={selectedConfigForEdit}
        onSubmit={handleFormSubmit}
        isSubmitting={create.isPending || update.isPending}
        onAssign={handleQuickAssign}
        onUnassign={handleQuickUnassign}
        isAssigning={assign.isPending || unassign.isPending}
        tournaments={tournaments.map(t => ({ id: t.id, name: t.name }))}
      />
      <AssignConfigDialog
        isOpen={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        config={selectedConfigForAssignment}
        onSubmit={handleAssignSubmit}
        isSubmitting={assign.isPending}
      />
    </div>
  );
};

export default ScoreConfigPage;