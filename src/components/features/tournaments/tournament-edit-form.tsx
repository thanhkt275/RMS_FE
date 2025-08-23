'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarIcon, Save, X, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Tournament } from '@/types/tournament.types';
import { useUpdateTournament } from '@/hooks/tournaments/use-tournament-mutations';

const tournamentSchema = z.object({
  name: z.string()
    .min(2, 'Tournament name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .refine((name) => name.trim().length >= 2, {
      message: "Tournament name cannot be only whitespace"
    }),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .refine((desc) => !desc || desc.trim().length > 0, {
      message: "Description cannot be only whitespace"
    }),
  location: z.string()
    .max(200, 'Location must be less than 200 characters')
    .optional()
    .refine((loc) => !loc || loc.trim().length > 0, {
      message: "Location cannot be only whitespace"
    }),
  startDate: z.string().refine((date) => {
    const parsed = new Date(date);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
    return !isNaN(parsed.getTime()) && parsed >= now;
  }, 'Start date must be valid and cannot be in the past'),
  endDate: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, 'End date must be valid'),
  numberOfFields: z.number()
    .int('Number of fields must be a whole number')
    .min(1, 'Must have at least 1 field')
    .max(50, 'Cannot exceed 50 fields'),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: 'End date must be after or equal to start date',
  path: ['endDate'],
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 365; // Maximum 1 year duration
}, {
  message: 'Tournament duration cannot exceed 365 days',
  path: ['endDate'],
});

type TournamentFormData = z.infer<typeof tournamentSchema>;

interface TournamentEditFormProps {
  tournament: Tournament;
  onCancel: () => void;
  onSuccess?: () => void;
}

export function TournamentEditForm({
  tournament,
  onCancel,
  onSuccess,
}: TournamentEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateTournament = useUpdateTournament(tournament.id);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<TournamentFormData>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: {
      name: tournament.name,
      description: tournament.description || '',
      location: tournament.location || '',
      startDate: format(new Date(tournament.startDate), 'yyyy-MM-dd'),
      endDate: format(new Date(tournament.endDate), 'yyyy-MM-dd'),
      numberOfFields: tournament.numberOfFields,
    },
  });

  const onSubmit = async (data: TournamentFormData) => {
    setIsSubmitting(true);
    try {
      await updateTournament.mutateAsync(data);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to update tournament:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Edit Tournament</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tournament Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Tournament Name *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Enter tournament name"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Enter tournament description (optional)"
              rows={3}
              disabled={isSubmitting}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              {...register('location')}
              placeholder="Enter tournament location (optional)"
              disabled={isSubmitting}
            />
            {errors.location && (
              <p className="text-sm text-destructive">{errors.location.message}</p>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <div className="relative">
                <Input
                  id="startDate"
                  type="date"
                  {...register('startDate')}
                  disabled={isSubmitting}
                />
                <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
              {errors.startDate && (
                <p className="text-sm text-destructive">{errors.startDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <div className="relative">
                <Input
                  id="endDate"
                  type="date"
                  {...register('endDate')}
                  disabled={isSubmitting}
                />
                <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
              {errors.endDate && (
                <p className="text-sm text-destructive">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          {/* Number of Fields */}
          <div className="space-y-2">
            <Label htmlFor="numberOfFields">Number of Fields *</Label>
            <Input
              id="numberOfFields"
              type="number"
              min="1"
              max="50"
              {...register('numberOfFields', { valueAsNumber: true })}
              placeholder="Enter number of fields"
              disabled={isSubmitting}
            />
            {errors.numberOfFields && (
              <p className="text-sm text-destructive">{errors.numberOfFields.message}</p>
            )}
          </div>

          {/* Error Alert */}
          {updateTournament.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to update tournament. Please check your inputs and try again.
              </AlertDescription>
            </Alert>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !isDirty}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
