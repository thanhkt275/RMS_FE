"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTeamById, useTeamsMutations } from "@/hooks/teams/use-teams";
import { useAuth } from "@/hooks/common/use-auth";
import { PermissionService } from "@/config/permissions";
import { UserRole } from "@/types/types";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorMessage } from "@/components/ui/error-message";
import { ArrowLeft, Users, Plus, Trash2, Save, X } from "lucide-react";
import { use } from "react";
import type { TeamMember } from "@/types/team.types";

interface EditTeamPageProps {
  params: Promise<{ id: string }>;
}

export default function EditTeamPage({ params }: EditTeamPageProps) {
  const router = useRouter();
  const { id: teamId } = use(params);
  const { user } = useAuth();
  const userRole = user?.role as UserRole | null;

  const { data: team, isLoading, error } = useTeamById(teamId);
  const { updateTeam } = useTeamsMutations();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    referralSource: "",
    teamMembers: [] as Omit<
      TeamMember,
      "id" | "teamId" | "createdAt" | "updatedAt"
    >[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check permissions
  const canEditAny = PermissionService.hasPermission(
    userRole,
    "TEAM_MANAGEMENT",
    "EDIT_ANY"
  );
  const canManageOwn = PermissionService.hasPermission(
    userRole,
    "TEAM_MANAGEMENT",
    "MANAGE_OWN"
  );

  const isTeamMember =
    team?.userId === user?.id ||
    team?.teamMembers?.some((member) => member.email === user?.email);

  // Initialize form data when team loads
  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name || "",
        referralSource: team.referralSource || "",
        teamMembers:
          team.teamMembers?.map((member) => ({
            name: member.name,
            gender: member.gender,
            phoneNumber: member.phoneNumber,
            email: member.email,
            province: member.province,
            ward: member.ward,
            organization: member.organization,
            organizationAddress: member.organizationAddress,
          })) || [],
      });
    }
  }, [team]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;

    setIsSubmitting(true);
    try {
      await updateTeam.mutateAsync({
        ...formData,
        tournamentId: team.tournamentId,
      });
      router.push(`/teams/${teamId}`);
    } catch (error) {
      console.error("Failed to update team:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle member changes
  const addMember = () => {
    setFormData((prev) => ({
      ...prev,
      teamMembers: [
        ...prev.teamMembers,
        {
          name: "",
          gender: null,
          phoneNumber: "",
          email: "",
          province: "",
          ward: "",
          organization: "",
          organizationAddress: "",
        },
      ],
    }));
  };

  const removeMember = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.filter((_, i) => i !== index),
    }));
  };

  const updateMember = (index: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.map((member, i) =>
        i === index ? { ...member, [field]: value } : member
      ),
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <ErrorMessage title="Failed to load team" message={error.message} />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <ErrorMessage
          title="Team not found"
          message="The requested team could not be found."
        />
      </div>
    );
  }

  // Check if user has permission to edit this team
  if (!canEditAny && !(canManageOwn && isTeamMember)) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <ErrorMessage
          title="Access Denied"
          message="You don't have permission to edit this team."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto py-6 px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-300 hover:text-white mb-6 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:translate-x-[-2px] transition-transform" />
            Back to Team Details
          </button>
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Edit Team</h1>
            <p className="text-xl text-gray-300">
              {team.name} (#{team.teamNumber})
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Team Information */}
          <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center text-white">
              <Users className="h-6 w-6 mr-3 text-blue-400" />
              Team Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Team Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter team name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Referral Source
                </label>
                <input
                  type="text"
                  value={formData.referralSource}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      referralSource: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="How did you hear about us?"
                />
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold flex items-center text-white">
                <Users className="h-6 w-6 mr-3 text-green-400" />
                Team Members ({formData.teamMembers.length})
              </h2>
              <button
                type="button"
                onClick={addMember}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Member
              </button>
            </div>

            <div className="space-y-6">
              {formData.teamMembers.map((member, index) => (
                <div
                  key={index}
                  className="bg-gray-700 rounded-lg p-6 border border-gray-600"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-white">
                      Member {index + 1}
                    </h3>
                    <button
                      type="button"
                      onClick={() => removeMember(index)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) =>
                          updateMember(index, "name", e.target.value)
                        }
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Full name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Gender
                      </label>
                      <select
                        value={member.gender || ""}
                        onChange={(e) =>
                          updateMember(index, "gender", e.target.value)
                        }
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select gender</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={member.email || ""}
                        onChange={(e) =>
                          updateMember(index, "email", e.target.value)
                        }
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="email@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={member.phoneNumber || ""}
                        onChange={(e) =>
                          updateMember(index, "phoneNumber", e.target.value)
                        }
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Province
                      </label>
                      <input
                        type="text"
                        value={member.province}
                        onChange={(e) =>
                          updateMember(index, "province", e.target.value)
                        }
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Province/State"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Ward/District
                      </label>
                      <input
                        type="text"
                        value={member.ward}
                        onChange={(e) =>
                          updateMember(index, "ward", e.target.value)
                        }
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ward/District"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Organization
                      </label>
                      <input
                        type="text"
                        value={member.organization || ""}
                        onChange={(e) =>
                          updateMember(index, "organization", e.target.value)
                        }
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="School/Company/Organization"
                      />
                    </div>

                    <div className="lg:col-span-3">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Organization Address
                      </label>
                      <input
                        type="text"
                        value={member.organizationAddress || ""}
                        onChange={(e) =>
                          updateMember(
                            index,
                            "organizationAddress",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Organization address"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {formData.teamMembers.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No team members added yet.</p>
                  <p className="text-sm">Click "Add Member" to get started.</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <button
              type="button"
              onClick={() => router.push(`/teams/${teamId}`)}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
