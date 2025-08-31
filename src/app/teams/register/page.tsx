"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Users, 
  Plus, 
  Minus, 
  Save, 
  X,
  UserPlus,
  ArrowLeft,
  Shield,
  Trophy
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useTournaments } from "@/hooks/tournaments/use-tournaments";
import { AdminRoute } from "@/components/admin/admin-route";
import { useAuth } from "@/hooks/common/use-auth";
import { apiClient } from "@/lib/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/query-keys";

// Team member schema
const teamMemberSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  role: z.string().min(1, "Role is required"),
});

// Main form schema
const teamFormSchema = z.object({
  tournamentId: z.string().min(1, "Tournament selection is required"),
  teamNumber: z.coerce.number().int().min(1, "Team number must be positive"),
  name: z.string().min(2, "Team name must be at least 2 characters"),
  description: z.string().optional(),
  teamMembers: z.array(teamMemberSchema).min(1, "At least one team member is required"),
});

type TeamFormData = z.infer<typeof teamFormSchema>;

interface TeamMember {
  name: string;
  email: string;
  role: string;
}

// Component that uses useSearchParams
function TeamRegistrationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<any>(null);

  // Get tournament from URL if provided
  const tournamentFromUrl = searchParams.get('tournament');

  // Fetch tournaments data
  const { data: tournaments = [], isLoading: tournamentsLoading } = useTournaments();

  // Form setup
  const form = useForm<TeamFormData>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      tournamentId: tournamentFromUrl || "",
      teamNumber: 1,
      name: "",
      description: "",
      teamMembers: [
        { name: "", email: "", role: "Captain" }
      ],
    },
  });

  // Watch tournament selection
  const watchedTournamentId = form.watch("tournamentId");
  
  // Update selected tournament when form changes
  useState(() => {
    if (watchedTournamentId) {
      const tournament = tournaments.find(t => t.id === watchedTournamentId);
      setSelectedTournament(tournament);
    }
  });

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: async (data: TeamFormData) => {
      const response = await apiClient.post(`/tournaments/${data.tournamentId}/teams`, {
        teamNumber: data.teamNumber,
        name: data.name,
        description: data.description,
        teamMembers: data.teamMembers,
        userId: user?.id,
        tournamentId: data.tournamentId,
      });
      return response;
    },
    onSuccess: () => {
      toast.success("Team registered successfully!");
      queryClient.invalidateQueries({ queryKey: QueryKeys.teams.all() });
      router.push(`/tournaments/${form.getValues("tournamentId")}/teams`);
    },
    onError: (error: any) => {
      toast.error(`Failed to register team: ${error.message || "Unknown error"}`);
    },
  });

  // Handle form submission
  const onSubmit = async (data: TeamFormData) => {
    setIsSubmitting(true);
    try {
      await createTeamMutation.mutateAsync(data);
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Team members management
  const teamMembers = form.watch("teamMembers");

  const addTeamMember = () => {
    const currentMembers = form.getValues("teamMembers");
    if (selectedTournament?.maxTeamMembers && currentMembers.length >= selectedTournament.maxTeamMembers) {
      toast.error(`Maximum ${selectedTournament.maxTeamMembers} members allowed per team`);
      return;
    }
    
    form.setValue("teamMembers", [
      ...currentMembers,
      { name: "", email: "", role: "Member" }
    ]);
  };

  const removeTeamMember = (index: number) => {
    const currentMembers = form.getValues("teamMembers");
    if (currentMembers.length <= 1) {
      toast.error("At least one team member is required");
      return;
    }
    
    const newMembers = currentMembers.filter((_, i) => i !== index);
    form.setValue("teamMembers", newMembers);
  };

  if (tournamentsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tournaments...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminRoute fallbackMessage="Only administrators can register teams.">
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Register New Team</h1>
            <p className="text-gray-600 mt-1">
              Register a team for any tournament
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Tournament Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Tournament Selection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="tournamentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Tournament</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a tournament" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tournaments.map((tournament) => (
                            <SelectItem key={tournament.id} value={tournament.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{tournament.name}</span>
                                <span className="text-sm text-gray-500">
                                  {new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedTournament && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900">Tournament Details</h4>
                    <div className="mt-2 space-y-1 text-sm text-blue-800">
                      <p>• Max Teams: {selectedTournament.maxTeams || "No limit"}</p>
                      <p>• Max Team Members: {selectedTournament.maxTeamMembers || "No limit"}</p>
                      <p>• Current Teams: {selectedTournament._count?.teams || 0}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="teamNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team Number</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter team name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief description about the team"
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Team Members */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Team Members ({teamMembers.length}
                    {selectedTournament?.maxTeamMembers && `/${selectedTournament.maxTeamMembers}`})
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTeamMember}
                    disabled={selectedTournament?.maxTeamMembers ? teamMembers.length >= selectedTournament.maxTeamMembers : false}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Member
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {teamMembers.map((member, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">
                        Member {index + 1}
                        {index === 0 && (
                          <span className="ml-2 text-sm text-blue-600 font-normal">(Captain)</span>
                        )}
                      </h4>
                      {teamMembers.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTeamMember(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name={`teamMembers.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Member name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`teamMembers.${index}.email`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="member@example.com"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`teamMembers.${index}.role`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Member role"
                                {...field}
                                value={index === 0 ? "Captain" : field.value}
                                readOnly={index === 0}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Submit Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Team registration will be subject to tournament rules and validation.
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          Registering...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Register Team
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
        </div>
      </div>
    </AdminRoute>
  );
}

// Loading component for Suspense fallback
function TeamRegistrationLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading team registration...</p>
      </div>
    </div>
  );
}

// Main export component with Suspense boundary
export default function GeneralRegisterTeamPage() {
  return (
    <Suspense fallback={<TeamRegistrationLoading />}>
      <TeamRegistrationForm />
    </Suspense>
  );
}
