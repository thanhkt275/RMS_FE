"use client";

import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import TournamentForm from "@/components/forms/TournamentForm";
import type { Tournament } from "@/types/types";

interface TournamentDialogProps extends React.ComponentProps<typeof Dialog> {
  tournament?: Tournament;
}

export default function TournamentDialog({
  tournament,
  ...props
}: TournamentDialogProps) {
  return (
    <Dialog {...props}>
      <DialogContent className="sm:max-w-[500px] bg-gray-900 border border-gray-800 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <span className="inline-flex items-center gap-2">
              <span className="bg-primary-900 text-primary-300 px-2 py-1 rounded-full text-xs font-semibold">
                {tournament?.id ? "EDIT" : "NEW"}
              </span>
            </span>
            {tournament?.id ? "Edit Tournament" : "Create Tournament"}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {tournament?.id
              ? "Edit the details of this tournament."
              : "Add a new tournament to the system."}
          </DialogDescription>
        </DialogHeader>
        <TournamentForm
          id={tournament?.id}
          defaultValues={{
            name: tournament?.name ?? "",
            description: tournament?.description ?? "",
            startDate: format(
              new Date(tournament?.startDate ?? new Date()),
              "yyyy-MM-dd"
            ),
            endDate: format(
              new Date(
                tournament?.endDate ??
                  new Date(new Date().setDate(new Date().getDate() + 7))
              ),
              "yyyy-MM-dd"
            ),
            numberOfFields: tournament?.numberOfFields ?? 1,
            maxTeams: tournament?.maxTeams! ?? null,
            maxTeamMembers: tournament?.maxTeamMembers! ?? null,
          }}
          onSubmit={() => props.onOpenChange?.(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
