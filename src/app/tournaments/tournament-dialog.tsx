"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { 
  Dialog, 
  DialogClose, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { useCreateTournament, useUpdateTournament } from "@/hooks/tournaments/use-tournaments";
import { Tournament } from "@/types/types";
import { toast } from "sonner";
import { useAuth } from "@/hooks/common/use-auth"; // Assuming you have a useAuth hook to get the current user

// Define the form schema for validation
const tournamentFormSchema = z.object({
  name: z.string()
    .min(2, { message: "Tournament name must be at least 2 characters" })
    .max(100, { message: "Tournament name cannot exceed 100 characters" }),
  description: z.string()
    .min(10, { message: "Description must be at least 10 characters" })
    .max(1000, { message: "Description cannot exceed 1000 characters" }),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Start date must be a valid date"
  }),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "End date must be a valid date"
  }),
  numberOfFields: z.coerce.number().int().min(1, { message: "There must be at least 1 field" }).max(20, { message: "Too many fields (max 20)" })
}).refine((data) => {
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  return startDate <= endDate;
}, {
  message: "End date must be after start date",
  path: ["endDate"],
});

// Define props for the dialog component
interface TournamentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  tournament?: Tournament;
}

export default function TournamentDialog({ 
  isOpen, 
  onClose, 
  mode, 
  tournament 
}: TournamentDialogProps) {
  const { user } = useAuth(); // Assuming you have a useAuth hook to get the current user
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createMutation = useCreateTournament();
  const updateMutation = useUpdateTournament(tournament?.id || '');

  // Initialize the form
  const form = useForm<z.infer<typeof tournamentFormSchema>>({
    resolver: zodResolver(tournamentFormSchema),
    defaultValues: {
      name: tournament?.name || '',
      description: tournament?.description || '',
      startDate: tournament?.startDate 
        ? format(new Date(tournament.startDate), 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd'),
      endDate: tournament?.endDate 
        ? format(new Date(tournament.endDate), 'yyyy-MM-dd')
        : format(new Date(new Date().setDate(new Date().getDate() + 7)), 'yyyy-MM-dd'),
      numberOfFields: tournament && (tournament as any).numberOfFields ? (tournament as any).numberOfFields : 1,
    },
  });

  // Reset form when the dialog opens or tournament changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: tournament?.name || '',
        description: tournament?.description || '',
        startDate: tournament?.startDate 
          ? format(new Date(tournament.startDate), 'yyyy-MM-dd')
          : format(new Date(), 'yyyy-MM-dd'),
        endDate: tournament?.endDate 
          ? format(new Date(tournament.endDate), 'yyyy-MM-dd')
          : format(new Date(new Date().setDate(new Date().getDate() + 7)), 'yyyy-MM-dd'),
        numberOfFields: tournament && (tournament as any).numberOfFields ? (tournament as any).numberOfFields : 1,
      });
    }
  }, [isOpen, tournament, form]);

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof tournamentFormSchema>) => {
    setIsSubmitting(true);
    
    try {
      // Format dates properly as ISO strings with time component
      const formattedValues = {
        ...values,
        startDate: new Date(`${values.startDate}T00:00:00`).toISOString(),
        endDate: new Date(`${values.endDate}T23:59:59`).toISOString(),
        adminId: user?.id ?? "",
      };

      if (mode === 'create') {
        await createMutation.mutateAsync(formattedValues);
      } else {
        await updateMutation.mutateAsync(formattedValues);
      }
      
      // Reset form before closing
      if (mode === 'create') {
        form.reset({
          name: '',
          description: '',
          startDate: format(new Date(), 'yyyy-MM-dd'),
          endDate: format(new Date(new Date().setDate(new Date().getDate() + 7)), 'yyyy-MM-dd'),
          numberOfFields: 1,
        });
      }
      
      onClose(); // Close dialog on success
    } catch (error) {
      console.error(`Error saving tournament:`, error);
      toast.error(`Failed to ${mode} tournament. Please check your inputs and try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="sm:max-w-[500px] bg-white border border-gray-200 shadow-xl rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {mode === 'create' ? (
              <span className="inline-flex items-center gap-2">
                <span className="bg-blue-50 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold border border-blue-200">NEW</span>
                Create Tournament
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <span className="bg-purple-50 text-purple-800 px-2 py-1 rounded-full text-xs font-semibold border border-purple-200">EDIT</span>
                Edit Tournament
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {mode === 'create' 
              ? 'Add a new tournament to the system.' 
              : 'Edit the details of this tournament.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold text-gray-900">Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Tournament name" {...field} className="bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold text-gray-900">Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Tournament description" 
                      {...field}
                      className="min-h-[100px] bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-900">Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-900">End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="numberOfFields"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold text-gray-900">Number of Fields</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={20} step={1} {...field} className="bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />            <DialogFooter className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg shadow-sm">Cancel</Button>
              </DialogClose>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-blue-500 text-white font-semibold rounded-lg px-6 py-2 shadow-md hover:bg-blue-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-200 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin mr-2">⋆</span>
                    {mode === 'create' ? 'Creating...' : 'Updating...'}
                  </>
                ) : (
                  <>
                    {mode === 'create' ? 'Create Tournament' : 'Update Tournament'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

