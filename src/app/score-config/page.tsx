"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import ScoreConfigTable from "@/components/features/score-config/ScoreConfigTable";
import ScoreConfigForm, { ScoreConfigFormValues } from "@/components/features/score-config/ScoreConfigForm";
import AssignConfigDialog from "@/components/features/score-config/AssignConfigDialog";

import { useScoreConfig } from "@/hooks/score-config/useScoreConfigs";

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
  } = useScoreConfig();

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
  const handleFormSubmit = (data: ScoreConfigFormValues) => {
  // Map frontend form data to backend DTO keys
  const payload = {
    name: data.name,
    description: data.description,
    scoreElements: data.elements,
    bonusConditions: (data.bonusPenalties || []).filter((x: any) => x.type === 'bonus'),
    penaltyConditions: (data.bonusPenalties || []).filter((x: any) => x.type === 'penalty'),
  };
  if (selectedConfigForEdit) {
    update.mutate({ id: (selectedConfigForEdit as any).id, data: payload }, {
      onSuccess: () => setIsFormOpen(false),
    });
  } else {
    create.mutate(payload, {
      onSuccess: () => setIsFormOpen(false),
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
        onDelete={handleDelete}
      />
      <ScoreConfigForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        configToEdit={selectedConfigForEdit}
        onSubmit={handleFormSubmit}
        isSubmitting={create.isPending || update.isPending}
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