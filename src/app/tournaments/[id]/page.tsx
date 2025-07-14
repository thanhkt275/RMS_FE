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

  if (!user || user.role !== UserRole.ADMIN) {
    return <TeamCard />;
  }

  return <TournamentDashboard />;
}
