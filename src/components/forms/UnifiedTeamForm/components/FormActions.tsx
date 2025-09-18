import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import { FormActionsProps } from '../types';

/**
 * Form Actions Component
 * Renders submit and cancel buttons with appropriate state handling
 */
export function FormActions({ 
  profile,
  mode,
  isDirty, 
  isSubmitting, 
  isLoading = false,
  onCancel,
  disableSubmit = false,
  disableReason
}: FormActionsProps) {
  const submitText = mode === 'edit' ? 'Update Team' : 'Register Team';
  const submittingText = mode === 'edit' ? 'Updating...' : 'Registering...';

  // Determine disabled state and help text
  const isDisabled = isSubmitting || isLoading || disableSubmit;
  let helpText = '';
  
  if (disableSubmit && disableReason) {
    helpText = disableReason;
  } else if (mode === 'edit') {
    helpText = isDirty ? 'You have unsaved changes.' : 'No changes made.';
  } else {
    helpText = 'Team registration will be subject to tournament rules and validation.';
  }

  return (
    <Card>
      <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className={`text-xs sm:text-sm ${disableSubmit ? 'text-red-600 font-medium' : 'text-gray-600'} order-2 sm:order-1`}>
            {helpText}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 order-1 sm:order-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 min-h-[44px] touch-target w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isDisabled}
              className="flex items-center justify-center gap-2 min-h-[44px] touch-target w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">{submittingText}</span>
                  <span className="sm:hidden">{mode === 'edit' ? 'Updating...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">{submitText}</span>
                  <span className="sm:hidden">{mode === 'edit' ? 'Update' : 'Register'}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
