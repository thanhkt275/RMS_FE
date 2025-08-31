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
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className={`text-sm ${disableSubmit ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
            {helpText}
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isDisabled}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {submittingText}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {submitText}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
