"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, isAfter, isBefore } from "date-fns";
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
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateStage, useUpdateStage } from "@/hooks/stages/use-stages";
import { Tournament, Stage } from "@/types/types";
import { toast } from "sonner";

// Define props for the dialog component
interface StageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  tournament: Tournament;
  stage?: Stage;
}

export default function StageDialog({ 
  isOpen, 
  onClose, 
  mode, 
  tournament,
  stage 
}: StageDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forceRender, setForceRender] = useState(0);
  
  const createMutation = useCreateStage();
  const updateMutation = useUpdateStage(stage?.id || "", tournament.id);

  // Define tournament date boundaries for validation
  const tournamentStartDate = new Date(tournament.startDate);
  const tournamentEndDate = new Date(tournament.endDate);
  
  // Convert to date strings for form default values
  const tournamentStartDateString = format(tournamentStartDate, 'yyyy-MM-dd\'T\'HH:mm');
  const tournamentEndDateString = format(tournamentEndDate, 'yyyy-MM-dd\'T\'HH:mm');
  
  // Dynamic schema validation to ensure stage dates are within tournament dates
  const stageFormSchema = z.object({
    name: z.string()
      .min(2, { message: "Stage name must be at least 2 characters" })
      .max(100, { message: "Stage name cannot exceed 100 characters" }),
    type: z.enum(["SWISS", "PLAYOFF", "FINAL"], {
      required_error: "You must select a stage type",
    }),
    startDate: z.string().refine((date) => {
      try {
        const parsedDate = new Date(date);
        return !isNaN(parsedDate.getTime()) && 
               !isBefore(parsedDate, tournamentStartDate) && 
               !isAfter(parsedDate, tournamentEndDate);
      } catch {
        return false;
      }
    }, { 
      message: `Start date must be within tournament dates (${format(tournamentStartDate, 'PPP')} - ${format(tournamentEndDate, 'PPP')})` 
    }),
    endDate: z.string().refine((date) => {
      try {
        const parsedDate = new Date(date);
        return !isNaN(parsedDate.getTime()) && 
               !isBefore(parsedDate, tournamentStartDate) && 
               !isAfter(parsedDate, tournamentEndDate);
      } catch {
        return false;
      }
    }, { 
      message: `End date must be within tournament dates (${format(tournamentStartDate, 'PPP')} - ${format(tournamentEndDate, 'PPP')})` 
    }),
  }).refine((data) => {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    return !isAfter(startDate, endDate);
  }, {
    message: "End date must be after or equal to start date",
    path: ["endDate"],
  });

  // Get form default values based on mode and stage data
  const getFormDefaults = () => ({
    name: stage?.name || '',
    type: stage?.type || "SWISS",
    startDate: stage?.startDate
      ? format(new Date(stage.startDate), 'yyyy-MM-dd\'T\'HH:mm')
      : tournamentStartDateString,
    endDate: stage?.endDate
      ? format(new Date(stage.endDate), 'yyyy-MM-dd\'T\'HH:mm')
      : tournamentEndDateString,
  });

  // Initialize the form
  const form = useForm<z.infer<typeof stageFormSchema>>({
    resolver: zodResolver(stageFormSchema),
    defaultValues: getFormDefaults(),
  });

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof stageFormSchema>) => {
    setIsSubmitting(true);
    
    try {
      // Format dates properly as ISO strings
      const formattedValues = {
        ...values,
        startDate: new Date(values.startDate).toISOString(),
        endDate: new Date(values.endDate).toISOString(),
      };

      if (mode === 'create') {
        await createMutation.mutateAsync({
          ...formattedValues,
          tournamentId: tournament.id
        });
      } else if (stage) {
        await updateMutation.mutateAsync(formattedValues);
      }
      
      // Reset to default values before closing
      form.reset({
        name: '',
        type: 'SWISS',
        startDate: tournamentStartDateString,
        endDate: tournamentEndDateString,
      });
      
      setForceRender(prev => prev + 1);
      onClose(); // Close dialog on success
    } catch (error) {
      console.error(`Error saving stage:`, error);
      toast.error(`Failed to ${mode} stage. Please check your inputs and try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog 
      key={`stage-dialog-${forceRender}`} 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) {
          // Reset form when dialog closes
          setTimeout(() => {
            form.reset(getFormDefaults());
          }, 100);
          onClose();
        }
      }}
    >      <DialogContent className="sm:max-w-[500px] bg-white border border-gray-200 shadow-xl rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {mode === 'create' ? (
              <span className="inline-flex items-center gap-2">
                <span className="bg-blue-50 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold border border-blue-200">NEW</span>
                Create Stage
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <span className="bg-purple-50 text-purple-800 px-2 py-1 rounded-full text-xs font-semibold border border-purple-200">EDIT</span>
                Edit Stage
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {mode === 'create' 
              ? `Add a new stage to "${tournament.name}"` 
              : `Edit stage for "${tournament.name}"`}
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
                    <Input placeholder="Stage name (e.g., Qualification Rounds)" {...field} className="bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold text-gray-900">Type</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg">
                        <SelectValue placeholder="Select stage type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                      <SelectItem value="SWISS" className="text-gray-900 hover:bg-gray-50">SWISS</SelectItem>
                      <SelectItem value="PLAYOFF" className="text-gray-900 hover:bg-gray-50">PLAYOFF</SelectItem>
                      <SelectItem value="FINAL" className="text-gray-900 hover:bg-gray-50">FINAL</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-900">Start Date & Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} className="bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg" />
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
                    <FormLabel className="font-semibold text-gray-900">End Date & Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} className="bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">
              <strong>Note:</strong> Stage dates must be within tournament dates: {format(tournamentStartDate, 'PPP p')} - {format(tournamentEndDate, 'PPP p')}
            </div>            <DialogFooter className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
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
                    {mode === 'create' ? 'Create Stage' : 'Update Stage'}
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