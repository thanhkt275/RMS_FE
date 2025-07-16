"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";


import ScoreElementEditor from "./ScoreElementEditor";
import BonusConditionEditor from "./BonusConditionEditor";
import PenaltyConditionEditor from "./PenaltyConditionEditor";

// Define your Zod schema for validation
const scoreConfigSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  tournamentId: z.string().optional(),
  scoreElements: z.array(z.any()), // Replace with ScoreElement schema if needed
  bonusConditions: z.array(z.any()), // Replace with BonusCondition schema if needed
  penaltyConditions: z.array(z.any()), // Replace with PenaltyCondition schema if needed
});

export type ScoreConfigFormValues = z.infer<typeof scoreConfigSchema>;

interface ScoreConfigFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  configToEdit?: ScoreConfigFormValues | null;
  onSubmit: (data: ScoreConfigFormValues) => void;
  isSubmitting: boolean;
}

export const ScoreConfigForm: React.FC<ScoreConfigFormProps> = ({
  isOpen = false,
  onOpenChange,
  configToEdit,
  onSubmit,
  isSubmitting,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ScoreConfigFormValues>({
    resolver: zodResolver(scoreConfigSchema),
    defaultValues: {
      name: "",
      description: "",
      tournamentId: "",
      scoreElements: [],
      bonusConditions: [],
      penaltyConditions: [],
    },
  });

  // Reset form when opening or editing
  useEffect(() => {
    if (configToEdit) {
      reset(configToEdit);
    } else {
      reset({
        name: "",
        description: "",
        tournamentId: "",
        scoreElements: [],
        bonusConditions: [],
        penaltyConditions: [],
      });
    }
  }, [configToEdit, isOpen, reset]);

  // Watchers for nested editors
  const scoreElements = watch("scoreElements");
  const bonusConditions = watch("bonusConditions");
  const penaltyConditions = watch("penaltyConditions");

  // Error summary (if needed in the future)
  // const [formError, setFormError] = React.useState<string | null>(null);

  if (!isOpen) return null;
  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{configToEdit ? "Edit Score Config" : "Create Score Config"}</span>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            ×
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Error Alert (if needed) */}
          {/* {formError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )} */}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...register("name")}
              disabled={isSubmitting}
              placeholder="Enter configuration name"
            />
            {errors.name && (
              <p className="text-destructive text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              disabled={isSubmitting}
              placeholder="Optional description"
            />
            {errors.description && (
              <p className="text-destructive text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* Tournament ID */}
          <div className="space-y-2">
            <Label htmlFor="tournamentId">Tournament ID</Label>
            <Input
              id="tournamentId"
              {...register("tournamentId")}
              disabled={isSubmitting}
              placeholder="Tournament ID (optional)"
            />
            {errors.tournamentId && (
              <p className="text-destructive text-sm mt-1">{errors.tournamentId.message}</p>
            )}
          </div>

          {/* Score Elements */}
          <div className="space-y-2">
            <Label>Score Elements</Label>
            <ScoreElementEditor
              value={scoreElements}
              onChange={(val: any) => setValue("scoreElements", val)}
              disabled={isSubmitting}
            />
            {/* Add validation error display if needed */}
          </div>
          {/* Bonus Conditions */}
          <div className="space-y-2">
            <Label>Bonus Conditions</Label>
            <BonusConditionEditor
              value={bonusConditions}
              onChange={(val: any) => setValue("bonusConditions", val)}
              disabled={isSubmitting}
            />
          </div>
          {/* Penalty Conditions */}
          <div className="space-y-2">
            <Label>Penalty Conditions</Label>
            <PenaltyConditionEditor
              value={penaltyConditions}
              onChange={(val: any) => setValue("penaltyConditions", val)}
              disabled={isSubmitting}
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
              {isSubmitting ? "Saving..." : configToEdit ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ScoreConfigForm;
