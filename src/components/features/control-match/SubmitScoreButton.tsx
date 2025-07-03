import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface SubmitScoreButtonProps {
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  hasUnsavedChanges: boolean;
}

export function SubmitScoreButton({ 
  onSubmit, 
  isSubmitting, 
  hasUnsavedChanges 
}: SubmitScoreButtonProps) {
  return (
    <div className="submit-score-section bg-gray-50 p-4 rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || !hasUnsavedChanges}
            size="lg"
            variant={hasUnsavedChanges ? "default" : "secondary"}
            className="min-w-[200px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving to Database...
              </>
            ) : (
              'Submit Score to Database'
            )}
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          {hasUnsavedChanges ? (
            <div className="text-amber-600 flex items-center gap-1 text-sm">
              <AlertTriangle className="w-4 h-4" />
              Changes not saved to database
            </div>
          ) : (
            <div className="text-green-600 flex items-center gap-1 text-sm">
              <CheckCircle className="w-4 h-4" />
              Scores saved to database
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        Real-time updates are sent automatically. Click submit to save to database.
      </div>
    </div>
  );
}
