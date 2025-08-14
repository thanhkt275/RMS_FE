import React from "react";
import {
  Users,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Building,
  ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/common/use-auth";
import { PermissionService } from "@/config/permissions";
import { UserRole } from "@/types/types";
import type { Team } from "@/types/team.types";

function hasMembers(
  team: Team
): team is Team & { teamMembers: NonNullable<Team["teamMembers"]> } {
  return Array.isArray(team.teamMembers);
}

interface TeamDetailsProps {
  team: Team;
}

export const TeamDetails: React.FC<TeamDetailsProps> = ({ team }) => {
  const router = useRouter();
  const { user } = useAuth();
  const userRole = user?.role as UserRole | null;

  if (!team) return null;

  // Check permissions for sensitive data
  const canViewSensitiveData = PermissionService.hasPermission(
    userRole,
    "TEAM_MANAGEMENT",
    "VIEW_SENSITIVE_DATA"
  );
  const canViewAll =
    PermissionService.hasPermission(userRole, "TEAM_MANAGEMENT", "VIEW_ALL") ||
    PermissionService.hasPermission(
      userRole,
      "TEAM_MANAGEMENT",
      "VIEW_ALL_READONLY"
    );

  // Check if user is part of this team
  const isTeamMember =
    team.userId === user?.id ||
    team.teamMembers?.some((member) => member.email === user?.email);

  const members = hasMembers(team) ? team.teamMembers : undefined;
  const memberCount = members?.length ?? 0;

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-300 hover:text-white mb-6 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:translate-x-[-2px] transition-transform" />
            Back to Teams
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {team.name}
              </h1>
              <div className="flex items-center gap-4">
                <p className="text-xl text-gray-300">Team #{team.teamNumber}</p>
                <div className="bg-blue-600 text-blue-100 px-3 py-1 rounded-full text-sm font-medium">
                  {memberCount} {memberCount === 1 ? "Member" : "Members"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Info */}
          <div className="xl:col-span-3 space-y-8">
            {/* Team Information Card */}
            <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-8">
              <h2 className="text-2xl font-semibold mb-6 flex items-center text-white">
                <Users className="h-6 w-6 mr-3 text-blue-400" />
                Team Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                    Team Name
                  </label>
                  <p className="text-gray-100 font-semibold text-lg">
                    {team.name}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                    Team Number
                  </label>
                  <p className="text-gray-100 font-semibold text-lg">
                    #{team.teamNumber}
                  </p>
                </div>
                {team.referralSource && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                      Referral Source
                    </label>
                    <p className="text-gray-100">{team.referralSource}</p>
                  </div>
                )}
                {(canViewAll || canViewSensitiveData) && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                      Team ID
                    </label>
                    <p className="text-gray-100 font-mono text-sm bg-gray-700 px-3 py-1 rounded">
                      {team.id}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Team Members */}
            {members && members.length > 0 && (
              <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-8">
                <h2 className="text-2xl font-semibold mb-6 flex items-center text-white">
                  <Users className="h-6 w-6 mr-3 text-green-400" />
                  Team Members ({memberCount})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="bg-gray-700 border border-gray-600 rounded-lg p-6 hover:bg-gray-650 transition-colors"
                    >
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold text-gray-100 text-lg mb-1">
                            {member.name}
                          </h3>
                          {member.gender && (
                            <p className="text-sm text-gray-300 capitalize bg-gray-600 px-2 py-1 rounded-full inline-block">
                              {member.gender.toLowerCase()}
                            </p>
                          )}
                        </div>

                        {/* Contact Information - Only show if user has permission or is team member */}
                        {(canViewSensitiveData || isTeamMember) && (
                          <div className="space-y-3">
                            {member.email && (
                              <div className="flex items-center text-sm text-gray-300">
                                <Mail className="h-4 w-4 mr-3 text-blue-400 flex-shrink-0" />
                                <span className="break-all">
                                  {member.email}
                                </span>
                              </div>
                            )}
                            {member.phoneNumber && (
                              <div className="flex items-center text-sm text-gray-300">
                                <Phone className="h-4 w-4 mr-3 text-green-400 flex-shrink-0" />
                                <span>{member.phoneNumber}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Location Information */}
                        {(member.province || member.ward) && (
                          <div className="flex items-center text-sm text-gray-300">
                            <MapPin className="h-4 w-4 mr-3 text-red-400 flex-shrink-0" />
                            <span>
                              {[member.ward, member.province]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          </div>
                        )}

                        {/* Organization Information */}
                        {member.organization && (
                          <div className="space-y-1">
                            <div className="flex items-start text-sm text-gray-300">
                              <Building className="h-4 w-4 mr-3 text-purple-400 flex-shrink-0 mt-0.5" />
                              <div>
                                <div className="font-medium">
                                  {member.organization}
                                </div>
                                {member.organizationAddress && (
                                  <div className="text-gray-400 text-xs mt-1">
                                    {member.organizationAddress}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            {/* Quick Stats */}
            <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-6">
              <h3 className="text-xl font-semibold mb-6 text-white">
                Quick Stats
              </h3>
              <div className="space-y-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400 mb-1">
                      {memberCount}
                    </div>
                    <div className="text-sm text-gray-300">Total Members</div>
                  </div>
                </div>
                {(canViewAll || canViewSensitiveData) && (
                  <>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                          Tournament ID
                        </label>
                        <p className="font-mono text-sm text-gray-100 bg-gray-700 px-3 py-2 rounded mt-1">
                          {team.tournamentId}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                          Team Leader ID
                        </label>
                        <p className="font-mono text-sm text-gray-100 bg-gray-700 px-3 py-2 rounded mt-1">
                          {team.userId}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Timeline */}
            {(canViewAll || canViewSensitiveData || isTeamMember) && (
              <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-6">
                <h3 className="text-xl font-semibold mb-6 flex items-center text-white">
                  <Calendar className="h-5 w-5 mr-3 text-purple-400" />
                  Timeline
                </h3>
                <div className="space-y-4">
                  {team.createdAt && (
                    <div className="border-l-4 border-green-400 pl-4">
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                        Created
                      </label>
                      <p className="text-sm text-gray-100 mt-1">
                        {formatDate(team.createdAt)}
                      </p>
                    </div>
                  )}
                  {team.updatedAt && (
                    <div className="border-l-4 border-blue-400 pl-4">
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                        Last Updated
                      </label>
                      <p className="text-sm text-gray-100 mt-1">
                        {formatDate(team.updatedAt)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Role-based Actions */}
            {(canViewAll || isTeamMember) && (
              <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-6">
                <h3 className="text-xl font-semibold mb-6 text-white">
                  Actions
                </h3>
                <div className="space-y-3">
                  {PermissionService.hasPermission(
                    userRole,
                    "TEAM_MANAGEMENT",
                    "EDIT_ANY"
                  ) ||
                  (PermissionService.hasPermission(
                    userRole,
                    "TEAM_MANAGEMENT",
                    "MANAGE_OWN"
                  ) &&
                    isTeamMember) ? (
                    <button
                      onClick={() => router.push(`/teams/${team.id}/edit`)}
                      className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <Users className="h-4 w-4" />
                      Edit Team
                    </button>
                  ) : null}

                  {canViewAll && (
                    <button
                      onClick={() =>
                        router.push(`/tournaments/${team.tournamentId}`)
                      }
                      className="w-full bg-gray-600 text-gray-100 px-4 py-3 rounded-lg hover:bg-gray-500 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <Calendar className="h-4 w-4" />
                      View Tournament
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
