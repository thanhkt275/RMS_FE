'use client';

import { useState } from 'react';
import { X, Calendar, Trophy, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCreateStage } from '@/hooks/api/use-tournament-mutations';
import { CreateStageDto } from '@/lib/types/tournament.types';

interface StageQuickCreateProps {
  tournamentId: string;
  onClose: () => void;
}

interface StageFormData {
  name: string;
  description: string;
  stageType: 'QUALIFICATION' | 'PLAYOFF' | 'FINAL';
  startDate: string;
  endDate: string;
  maxTeams: string;
  isElimination: boolean;
  advancementRules: string;
}

const initialFormData: StageFormData = {
  name: '',
  description: '',
  stageType: 'QUALIFICATION',
  startDate: '',
  endDate: '',
  maxTeams: '',
  isElimination: false,
  advancementRules: '',
};

export function StageQuickCreate({ tournamentId, onClose }: StageQuickCreateProps) {
  const [formData, setFormData] = useState<StageFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<StageFormData>>({});

  const createStage = useCreateStage(tournamentId);

  const handleInputChange = (field: keyof StageFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<StageFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Stage name is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (formData.endDate && formData.startDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (formData.maxTeams && (isNaN(Number(formData.maxTeams)) || Number(formData.maxTeams) < 1)) {
      newErrors.maxTeams = 'Max teams must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const createData: CreateStageDto = {
      name: formData.name.trim(),
      stageType: formData.stageType,
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
    };

    try {
      await createStage.mutateAsync(createData);
      onClose();
    } catch (error) {
      console.error('Failed to create stage:', error);
    }
  };

  const getStageTypeDescription = (type: string) => {
    switch (type) {
      case 'QUALIFICATION':
        return 'Teams compete in round-robin or elimination rounds to qualify for playoffs';
      case 'PLAYOFF':
        return 'Elimination rounds with advancing teams from qualifications';
      case 'FINAL':
        return 'Championship matches between top-performing teams';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl">Create New Stage</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Add a new stage to organize your tournament competition
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Trophy className="h-4 w-4" />
                Basic Information
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Stage Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Qualification Round 1"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stageType">Stage Type</Label>
                  <Select 
                    value={formData.stageType} 
                    onValueChange={(value: 'QUALIFICATION' | 'PLAYOFF' | 'FINAL') => 
                      handleInputChange('stageType', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="QUALIFICATION">Qualification</SelectItem>
                      <SelectItem value="PLAYOFF">Playoff</SelectItem>
                      <SelectItem value="FINAL">Final</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    {getStageTypeDescription(formData.stageType)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe this stage and its rules..."
                  rows={3}
                />
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Calendar className="h-4 w-4" />
                Schedule
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className={errors.startDate ? 'border-red-500' : ''}
                  />
                  {errors.startDate && (
                    <p className="text-sm text-red-600">{errors.startDate}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date (Optional)</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    className={errors.endDate ? 'border-red-500' : ''}
                  />
                  {errors.endDate && (
                    <p className="text-sm text-red-600">{errors.endDate}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Competition Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Users className="h-4 w-4" />
                Competition Settings
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxTeams">Max Teams (Optional)</Label>
                  <Input
                    id="maxTeams"
                    type="number"
                    min="1"
                    value={formData.maxTeams}
                    onChange={(e) => handleInputChange('maxTeams', e.target.value)}
                    placeholder="Leave empty for unlimited"
                    className={errors.maxTeams ? 'border-red-500' : ''}
                  />
                  {errors.maxTeams && (
                    <p className="text-sm text-red-600">{errors.maxTeams}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isElimination" className="text-sm font-medium">
                      Elimination Format
                    </Label>
                    <Switch
                      id="isElimination"
                      checked={formData.isElimination}
                      onCheckedChange={(checked) => handleInputChange('isElimination', checked)}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Enable if teams are eliminated after losing
                  </p>
                </div>
              </div>

              {formData.isElimination && (
                <div className="space-y-2">
                  <Label htmlFor="advancementRules">Advancement Rules</Label>
                  <Textarea
                    id="advancementRules"
                    value={formData.advancementRules}
                    onChange={(e) => handleInputChange('advancementRules', e.target.value)}
                    placeholder="Describe how teams advance or are eliminated..."
                    rows={2}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={createStage.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createStage.isPending}
                className="min-w-[100px]"
              >
                {createStage.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating...
                  </div>
                ) : (
                  'Create Stage'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
