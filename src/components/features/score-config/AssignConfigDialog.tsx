import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "./MultiSelect";
import { useTournaments } from "@/hooks/tournaments/use-tournaments";

interface AssignConfigDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  config: { id: string; name: string; assignedTournamentIds?: string[] } | null;
  onSubmit: (tournamentIds: string[]) => void;
  isSubmitting: boolean;
}

const AssignConfigDialog: React.FC<AssignConfigDialogProps> = ({
  isOpen,
  onOpenChange,
  config,
  onSubmit,
  isSubmitting,
}) => {
  const { data: tournaments = [], isLoading } = useTournaments();
  const { register, handleSubmit, setValue, watch, reset } = useForm<{
    tournamentIds: string[];
  }>({
    defaultValues: { tournamentIds: config?.assignedTournamentIds || [] },
  });

  // Reset form when dialog opens or config changes
  useEffect(() => {
    reset({ tournamentIds: config?.assignedTournamentIds || [] });
  }, [config, isOpen, reset]);

  const selectedIds = watch("tournamentIds");

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign to Tournaments</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((data) => onSubmit(data.tournamentIds))}
          className="flex flex-col gap-4"
        >
          <div>
            <Label>Score Config</Label>
            <div className="font-medium mt-1 mb-2">{config?.name || "-"}</div>
          </div>
          <div>
            <Label htmlFor="tournamentIds">Tournaments</Label>
            <MultiSelect
              id="tournamentIds"
              options={tournaments.map((t: any) => ({
                label: t.name,
                value: t.id,
              }))}
              value={selectedIds}
              onChange={(vals: string[]) => setValue("tournamentIds", vals)}
              disabled={isLoading || isSubmitting}
              placeholder={isLoading ? "Loading..." : "Select tournaments"}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoading}>
              Assign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AssignConfigDialog;
