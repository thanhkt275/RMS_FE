"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/common/use-auth";
import RegisterForm from "@/components/forms/RegisterForm";

export default function RegisterPage() {
  const [registrationError, setRegistrationError] = useState<string | null>(
    null
  );

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-xl shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold">
            Create an Account
          </CardTitle>
          <CardDescription>Enter your information to register</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Error message */}
          {registrationError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{registrationError}</AlertDescription>
            </Alert>
          )}

          <RegisterForm />
        </CardContent>

        <CardFooter className="text-center">
          <div className="text-sm text-gray-500 w-full">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
