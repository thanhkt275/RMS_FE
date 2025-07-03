"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteMatch } from "@/hooks/api/use-matches";

interface DeleteMatchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  match: {
    id: string;
    matchNumber: number;
    roundNumber?: number;
    status: string;
  } | null;
}

export default function DeleteMatchDialog({
  isOpen,
  onClose,
  match,
}: DeleteMatchDialogProps) {
  const deleteMatchMutation = useDeleteMatch();

  const handleConfirmDelete = async () => {
    if (!match) return;
    
    try {
      await deleteMatchMutation.mutateAsync(match.id);
      onClose();
    } catch (error) {
      // Error is already handled by the mutation hook
      console.error("Failed to delete match:", error);
    }
  };

  if (!match) return null;

  const isDeleteDisabled = deleteMatchMutation.isPending;
  const canDelete = match.status === "PENDING"; // Only allow deletion of pending matches

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-white border border-gray-200 rounded-xl shadow-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-gray-900">Delete Match</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-600">
            Are you sure you want to delete <strong>Match #{match.matchNumber}</strong>
            {match.roundNumber && ` (Round ${match.roundNumber})`}?
            {!canDelete && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                <strong>Warning:</strong> Only pending matches can be deleted. This match has status: {match.status}
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={onClose}
            disabled={isDeleteDisabled}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmDelete}
            disabled={isDeleteDisabled || !canDelete}
            className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleteDisabled ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                Deleting...
              </>
            ) : (
              "Delete Match"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
