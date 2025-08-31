import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Info } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { FormSectionProps } from '../types';

interface DetailedFormSectionProps extends FormSectionProps {
  form: UseFormReturn<any>;
}

const referralOptions = [
  { value: "press", label: "Press" },
  { value: "school", label: "School" },
  { value: "email", label: "Email from STEAM for Vietnam" },
  { value: "facebook", label: "Facebook" },
  { value: "friend", label: "Friend or Family" },
  { value: "other", label: "Other" },
];

/**
 * Detailed Form Section Component
 * Renders additional fields specific to detailed registration profile
 */
export function DetailedFormSection({ 
  form, 
  profile, 
  isLoading = false 
}: DetailedFormSectionProps) {
  // Only render for detailed profile
  if (profile !== 'detailed') {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Additional Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Referral Source */}
        <FormField
          control={form.control}
          name="referralSource"
          render={({ field }) => (
            <FormItem>
              <FormLabel>How did you hear about us?</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value ?? ""}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {referralOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Terms Acceptance */}
        <FormField
          control={form.control}
          name="termsAccepted"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isLoading}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="cursor-pointer">
                  I accept the terms and conditions of participation
                </FormLabel>
                <p className="text-sm text-muted-foreground">
                  Please read and agree to the tournament rules and participation guidelines.
                </p>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
