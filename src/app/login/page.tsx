"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/common/use-auth";

// Login form schema validation - Updated to match backend validation  
const formSchema = z.object({
  username: z.string()
    .min(1, "Username is required")
    .max(30, "Username must be at most 30 characters long"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const router = useRouter();
  const { login, user, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [rateLimitWarning, setRateLimitWarning] = useState<string | null>(null);

  // Redirect if user is already logged in - use useEffect to avoid early return
  useEffect(() => {
    if (user && !authLoading) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  // Form definition using react-hook-form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoginError(null);
      setRateLimitWarning(null);
      setIsLoading(true);
      
      // Perform login
      await login(values.username, values.password);
      
      // Login successful - redirect to home page
      // The AuthProvider will automatically update the user state
      router.replace("/");
      
    } catch (error: any) {
      // Handle specific error types
      if (error.status === 429) {
        setRateLimitWarning("Too many login attempts. Please wait a moment before trying again.");
      } else {
        setLoginError(error.message || "Login failed. Please check your credentials.");
      }
      setIsLoading(false);
    }
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading...</h2>
          <p className="text-gray-500">Checking authentication status...</p>
        </div>
      </div>
    );
  }

  // Don't render login form if user is already authenticated
  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Redirecting...</h2>
          <p className="text-gray-500">You are already logged in. Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold">Sign In</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
          <CardContent className="space-y-4">
          {/* Admin initialization info alert */}          <Alert className="bg-blue-50 text-blue-800 border-blue-200">
            <AlertDescription className="text-sm">
              <p className="font-medium">First Time Setup:</p>
              <p>If no admin account exists, <Link href="/admin-setup" className="text-blue-600 underline">click here to initialize one</Link>.</p>
              <p className="text-xs mt-1 italic">Please use strong credentials for production environments.</p>
            </AlertDescription>
          </Alert>

          {/* Rate limit warning */}
          {rateLimitWarning && (
            <Alert className="bg-yellow-50 text-yellow-800 border-yellow-200">
              <AlertDescription>{rateLimitWarning}</AlertDescription>
            </Alert>
          )}

          {/* Error message */}
          {loginError && (
            <Alert variant="destructive">
              <AlertDescription>{loginError}</AlertDescription>
            </Alert>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your username" 
                        {...field} 
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Enter your password" 
                        {...field} 
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-blue-600 hover:underline">
              Sign up
            </Link>
          </div>          <div className="text-xs text-gray-400">
            <p>Secure authentication with JWT tokens and rate limiting protection</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}