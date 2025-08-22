"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { Team } from "@/types/team.types";

interface DeleteTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function DeleteTeamDialog({
  open,
  onOpenChange,
  team,
  onConfirm,
  isDeleting = false,
}: DeleteTeamDialogProps) {
  if (!team) return null;

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Delete Team
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            This action cannot be undone. This will permanently delete the team
            and remove all associated data.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-red-950/20 border border-red-800 rounded-lg p-4">
            <h4 className="font-medium text-red-300 mb-2">
              You are about to delete:
            </h4>
            <div className="space-y-1 text-sm text-gray-300">
              <p>
                <span className="font-medium">Team:</span> {team.name}
              </p>
              <p>
                <span className="font-medium">Team Number:</span> {team.teamNumber || "N/A"}
              </p>
              <p>
                <span className="font-medium">Members:</span>{" "}
                {team.teamMemberCount ?? team._count?.teamMembers ?? team.teamMembers?.length ?? 0}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? "Deleting..." : "Delete Team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
