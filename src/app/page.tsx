"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/common/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserRole } from "@/types/user.types";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
    if (user && user.role != UserRole.ADMIN) {
      router.push("/tournaments");
    }
  }, [user, isLoading, router]);

  // Don't render content until we've checked authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading...</h2>
          <p className="text-gray-500">
            Please wait while we prepare your dashboard S4vn
          </p>
        </div>
      </div>
    );
  }

  // Don't render content if not authenticated (will redirect)
  if (!user || user.role !== UserRole.ADMIN) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">Welcome, {user.username}!</h1>
      <p className="text-gray-500 mb-8">
        Robotics Competition Management Dashboard S4VN
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Tournaments Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle>Tournaments</CardTitle>
            <CardDescription>Manage all tournaments</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">
              View and manage all tournament events
            </p>
            <Link href="/tournaments" className="w-full">
              <Button className="w-full">Go to Tournaments</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Stages Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle>Stages</CardTitle>
            <CardDescription>Tournament stages</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">
              Manage qualification and elimination rounds
            </p>
            <Link href="/stages" className="w-full">
              <Button className="w-full">Go to Stages</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Matches Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle>Matches</CardTitle>
            <CardDescription>All competition matches</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">View and manage match schedules</p>
            <Link href="/matches" className="w-full">
              <Button className="w-full">Go to Matches</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Match Control Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle>Match Control</CardTitle>
            <CardDescription>Live match management</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">Control ongoing matches and scoring</p>
            <Link href="/control-match" className="w-full">
              <Button className="w-full">Go to Match Control</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
