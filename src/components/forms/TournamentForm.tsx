"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/hooks/common/use-auth";
import {
  useCreateTournament,
  useUpdateTournament,
} from "@/hooks/tournaments/use-tournaments";

const formSchema = z
  .object({
    name: z
      .string()
      .min(2, { message: "Tournament name must be at least 2 characters" })
      .max(100, { message: "Tournament name cannot exceed 100 characters" }),
    description: z
      .string()
      .min(10, { message: "Description must be at least 10 characters" })
      .max(1000, { message: "Description cannot exceed 1000 characters" }),
    startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: "Start date must be a valid date",
    }),
    endDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: "End date must be a valid date",
    }),
    numberOfFields: z
      .number()
      .min(1, { message: "There must be at least 1 field" })
      .max(20, { message: "Too many fields (max 20)" }),
    maxTeams: z.number().nullable().optional(),
    maxTeamMembers: z.number().nullable().optional(),
  })
  .refine(
    (data) => {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      return startDate <= endDate;
    },
    {
      message: "End date must be after start date",
      path: ["endDate"],
    }
  );

type FormData = z.infer<typeof formSchema>;

interface TournamentFormProps {
  id?: string;
  defaultValues?: FormData;
  onSubmit?: () => void;
}

export default function TournamentForm({
  id,
  defaultValues,
  onSubmit,
}: TournamentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createTournament = useCreateTournament();
  const updateTournament = useUpdateTournament(id || "");
  const { user } = useAuth();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
      numberOfFields: 1,
      maxTeams: null,
      maxTeamMembers: null,
    },
  });

  useEffect(() => {
    if (defaultValues) {
      form.reset(defaultValues);
    }
  }, [defaultValues, form]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    if (!id) {
      createTournament.mutate({
        ...values,
        startDate: new Date(`${values.startDate}T00:00:00`).toISOString(),
        endDate: new Date(`${values.endDate}T23:59:59`).toISOString(),
        adminId: user?.id || "",
      });
    } else {
      const dirtyFields = form.formState.dirtyFields;
      const updatedFields = Object.entries(dirtyFields).reduce(
        (acc, [key, value]) => {
          const isArrayField = typeof value === "object" && value !== null;

          if (
            (isArrayField && Object.values(value).some(Boolean)) ||
            value === true
          ) {
            (acc as any)[key as keyof FormData] = values[key as keyof FormData];
          }

          return acc;
        },
        {} as Partial<FormData>
      );
      if (Object.keys(updatedFields).length !== 0)
        updateTournament.mutate(updatedFields);
    }
    setIsSubmitting(false);
    onSubmit?.();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-semibold text-gray-200">
                Name
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Tournament name"
                  {...field}
                  className="bg-gray-800 border-gray-700 text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-900"
                />
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
              <FormLabel className="font-semibold text-gray-200">
                Description
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tournament description"
                  {...field}
                  className="min-h-[100px] bg-gray-800 border-gray-700 text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-900"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold text-gray-200">
                  Start Date
                </FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    className="bg-gray-800 border-gray-700 text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-900"
                  />
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
                <FormLabel className="font-semibold text-gray-200">
                  End Date
                </FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    className="bg-gray-800 border-gray-700 text-gray-100 focus:border-purple-500 focus:ring-2 focus:ring-purple-900"
                  />
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
              <FormLabel className="font-semibold text-gray-200">
                Number of Fields
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  step={1}
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className="bg-gray-800 border-gray-700 text-gray-100 focus:border-green-500 focus:ring-2 focus:ring-green-900"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="maxTeams"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold text-gray-200">
                  Maximum number of teams
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    className="bg-gray-800 border-gray-700 text-gray-100 focus:border-green-500 focus:ring-2 focus:ring-green-900"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxTeamMembers"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold text-gray-200">
                  Maximum team members of teams
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    className="bg-gray-800 border-gray-700 text-gray-100 focus:border-green-500 focus:ring-2 focus:ring-green-900"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary-600 text-white font-semibold rounded-md px-6 py-2 shadow-sm hover:bg-primary-700 focus:ring-2 focus:ring-primary-400 focus:outline-none transition flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="animate-spin mr-2">⋆</span>
              {id ? "Updating..." : "Creating..."}
            </>
          ) : (
            <>{id ? "Update Tournament" : "Create Tournament"}</>
          )}
        </Button>
      </form>
    </Form>
  );
}
