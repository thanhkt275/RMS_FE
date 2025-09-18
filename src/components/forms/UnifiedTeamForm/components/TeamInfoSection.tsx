import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Users } from 'lucide-react';
import { FormSectionProps } from '../types';
import { UseFormReturn } from 'react-hook-form';

interface TeamInfoSectionProps extends FormSectionProps {
  form: UseFormReturn<any>;
}

/**
 * Team Information Section Component
 * Renders team-level information fields based on the form profile
 */
export function TeamInfoSection({ form, profile, isLoading = false }: TeamInfoSectionProps) {
  const showTeamNumber = profile === 'admin';
  const showDescription = profile === 'admin' || profile === 'detailed';

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Users className="h-4 w-4 sm:h-5 sm:w-5" />
          Team Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
        <div className={`grid grid-cols-1 gap-4 ${showTeamNumber ? 'sm:grid-cols-2' : ''}`}>
          {/* Team Number - Admin only */}
          {showTeamNumber && (
            <FormField
              control={form.control}
              name="teamNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">Team Number</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1" 
                      placeholder="Enter team number"
                      disabled={isLoading}
                      className="min-h-[44px] touch-target"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Team Name - Always shown */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm sm:text-base">Team Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter team name" 
                    disabled={isLoading}
                    className="min-h-[44px] touch-target"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Description - Admin and Detailed modes */}
        {showDescription && (
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm sm:text-base">
                  Description 
                  {profile === 'detailed' ? ' (Optional)' : ''}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Brief description about the team"
                    className="min-h-[80px] sm:min-h-[100px] touch-target"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </CardContent>
    </Card>
  );
}
