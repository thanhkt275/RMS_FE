"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiClient } from "@/lib/api-client";
import Link from "next/link";

export default function AdminSetupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [setupResult, setSetupResult] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  const initializeAdmin = async () => {
    try {
      setIsLoading(true);
      setSetupError(null);
      setSetupResult(null);
      
      const response = await apiClient.get("/auth/init-admin");
      setSetupResult(response.message || "Admin user initialized successfully!");
    } catch (error: any) {
      setSetupError(error.message || "Failed to initialize admin user");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold">Admin Setup</CardTitle>
          <CardDescription>Initialize the default admin account</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert className="bg-yellow-50 text-yellow-800 border-yellow-200">
            <AlertDescription className="text-sm">
              <p className="font-medium">Security Notice:</p>
              <p>This will create a default admin account if none exists.</p>
              <p>Please change the default credentials immediately after first login.</p>
            </AlertDescription>
          </Alert>

          {setupResult && (
            <Alert className="bg-green-50 text-green-800 border-green-200">
              <AlertDescription>{setupResult}</AlertDescription>
            </Alert>
          )}

          {setupError && (
            <Alert variant="destructive">
              <AlertDescription>{setupError}</AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={initializeAdmin} 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? "Initializing..." : "Initialize Admin Account"}
          </Button>

          <div className="text-center">
            <Link href="/login" className="text-blue-600 hover:underline text-sm">
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
