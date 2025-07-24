"use client";

import React, { useEffect } from "react";
import clsx from "clsx";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileText, Target, Zap, AlertTriangle } from "lucide-react";


import ScoreSectionEditor from "./ScoreSectionEditor";
import FormulaEditor from "./FormulaEditor";
import BonusConditionEditor from "./BonusConditionEditor";
import PenaltyConditionEditor from "./PenaltyConditionEditor";

// Define your Zod schema for validation
const scoreConfigSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  tournamentId: z.string().optional(),
  totalScoreFormula: z.string().optional(),
  scoreSections: z.array(z.any()).optional(), // New sections array
  // Legacy fields for backward compatibility
  scoreElements: z.array(z.any()).optional(),
  bonusConditions: z.array(z.any()).optional(),
  penaltyConditions: z.array(z.any()).optional(),
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
      totalScoreFormula: "",
      scoreSections: [],
      // Legacy fields
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
        totalScoreFormula: "",
        scoreSections: [],
        // Legacy fields
        scoreElements: [],
        bonusConditions: [],
        penaltyConditions: [],
      });
    }
  }, [configToEdit, isOpen, reset]);

  // Watchers for nested editors
  const totalScoreFormula = watch("totalScoreFormula");
  const scoreSections = watch("scoreSections");
  // Legacy watchers
  const scoreElements = watch("scoreElements");
  const bonusConditions = watch("bonusConditions");
  const penaltyConditions = watch("penaltyConditions");

  // Error summary (if needed in the future)
  // const [formError, setFormError] = React.useState<string | null>(null);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-sm">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden mx-4 shadow-2xl border-slate-200/20 bg-gradient-to-br from-white to-slate-50">
        <CardHeader className="sticky top-0 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200/50 z-10 backdrop-blur-sm">
          <CardTitle className="flex items-center justify-between">
            <span className="text-slate-800 font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {configToEdit ? "Edit Score Config" : "Create Score Config"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-full h-8 w-8 p-0 transition-colors"
            >
              ×
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-y-auto p-6 bg-gradient-to-b from-slate-50/50 to-white">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Error Alert (if needed) */}
          {/* {formError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )} */}

          {/* Section 1: Basic Information */}
          <div className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100/50 shadow-sm">
            <div className="flex items-center gap-3 pb-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Basic Information</h3>
                <p className="text-sm text-slate-600">Configure the basic details of your scoring system</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Configuration Name *</Label>
                <Input
                  id="name"
                  {...register("name")}
                  disabled={isSubmitting}
                  placeholder="e.g., Football Tournament Scoring"
                />
                {errors.name && (
                  <p className="text-destructive text-sm mt-1">{errors.name.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tournamentId">Tournament ID</Label>
                <Input
                  id="tournamentId"
                  {...register("tournamentId")}
                  disabled={isSubmitting}
                  placeholder="Optional - assign later"
                />
                {errors.tournamentId && (
                  <p className="text-destructive text-sm mt-1">{errors.tournamentId.message}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                disabled={isSubmitting}
                placeholder="Describe how this scoring configuration works..."
                rows={3}
              />
              {errors.description && (
                <p className="text-destructive text-sm mt-1">{errors.description.message}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Section 2: Score Sections */}
          <div className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-emerald-50/50 to-teal-50/30 border border-emerald-100/50 shadow-sm">
            <div className="flex items-center gap-3 pb-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Score Sections</h3>
                <p className="text-sm text-slate-600">Create sections like "Auto" and "Teleop" with their own elements</p>
              </div>
            </div>
            
            <ScoreSectionEditor
              value={scoreSections || []}
              onChange={(val: any) => setValue("scoreSections", val)}
              disabled={isSubmitting}
            />
          </div>

          <Separator />

          {/* Section 3: Formula Editor */}
          <div className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-purple-50/50 to-violet-50/30 border border-purple-100/50 shadow-sm">
            <FormulaEditor
              formula={totalScoreFormula || ""}
              onChange={(val: string) => setValue("totalScoreFormula", val)}
              sections={scoreSections || []}
              disabled={isSubmitting}
            />
          </div>

          <Separator />

          {/* Section 4: Global Bonus Conditions */}
          <div className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-green-50/50 to-emerald-50/30 border border-green-100/50 shadow-sm">
            <div className="flex items-center gap-3 pb-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 shadow-md">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Global Bonus Conditions</h3>
                <p className="text-sm text-slate-600">Bonuses that apply to the entire configuration</p>
              </div>
            </div>
            
            <BonusConditionEditor
              value={bonusConditions || []}
              onChange={(val: any) => setValue("bonusConditions", val)}
              disabled={isSubmitting}
            />
          </div>

          <Separator />

          {/* Section 5: Global Penalty Conditions */}
          <div className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-red-50/50 to-rose-50/30 border border-red-100/50 shadow-sm">
            <div className="flex items-center gap-3 pb-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 shadow-md">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Global Penalty Conditions</h3>
                <p className="text-sm text-slate-600">Penalties that apply to the entire configuration</p>
              </div>
            </div>
            
            <PenaltyConditionEditor
              value={penaltyConditions || []}
              onChange={(val: any) => setValue("penaltyConditions", val)}
              disabled={isSubmitting}
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 mt-8 border-t border-slate-200/50 bg-gradient-to-r from-slate-50/50 to-white rounded-b-lg -mx-6 -mb-6 px-6 pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="min-w-[100px] border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-colors"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting} 
              className={clsx(
                "min-w-[120px] font-semibold transition-all duration-200 shadow-md",
                configToEdit 
                  ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 hover:shadow-lg" 
                  : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg"
              )}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </div>
              ) : (
                configToEdit ? "Update Config" : "Create Config"
              )}
            </Button>
          </div>
        </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScoreConfigForm;
