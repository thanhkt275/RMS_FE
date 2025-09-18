"use client";

import { useAuth } from "@/hooks/common/use-auth";
import TeamCard from "@/components/cards/TeamCard";
import AuthSkeleton from "@/components/skeleton/AuthSkeleton";
import { UserRole } from "@/types/user.types";
import TournamentDashboard from "./TournamentDashboard";

export default function TournamentPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <AuthSkeleton />;
  }

  // Admin users get the dashboard
  if (user?.role === UserRole.ADMIN) {
    return <TournamentDashboard />;
  }

  // COMMON and TEAM_LEADER users get the team registration form
  if (user?.role === UserRole.COMMON || user?.role === UserRole.TEAM_LEADER) {
    return <TeamCard />;
  }

  // Other roles or unauthenticated users get access denied
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="text-center p-6 sm:p-8 max-w-md mx-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
        <p className="text-sm sm:text-base text-gray-600 mb-4">
          You need to be logged in as a registered user to access team registration.
        </p>
        <p className="text-xs sm:text-sm text-gray-500">
          Contact an administrator if you believe this is an error.
        </p>
      </div>
    </div>
  );
}
