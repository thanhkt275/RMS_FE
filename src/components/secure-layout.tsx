"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/common/use-auth";
import { useQueryClient } from "@tanstack/react-query";

interface SecureLayoutProps {
  children: React.ReactNode;
}

export function SecureLayout({ children }: SecureLayoutProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    // Only redirect if:
    // 1. Authentication check is complete (not loading)
    // 2. No user is found
    // 3. Not already redirecting
    if (!isLoading && !user && !isRedirecting) {
      console.log("No authenticated user found, redirecting to login");
      setIsRedirecting(true);
      
      // Allow any pending API calls to complete
      setTimeout(() => {
        router.replace("/login");
      }, 100);
    }
  }, [user, isLoading, router, isRedirecting]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      </div>
    );
  }

  // If not authenticated and not loading, don't render anything (will redirect)
  if (!user && !isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 mx-auto animate-spin rounded-full border-b-2 border-t-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Render the secure layout with sidebar for authenticated users
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  );
}