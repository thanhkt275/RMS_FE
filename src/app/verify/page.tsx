"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/common/use-auth";

function VerifyPage() {
  const { verifyEmail, user, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError(new Error("Missing verification token."));
      return;
    }

    const verify = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await verifyEmail(token);
        setSuccess(true);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
        setTimeout(() => router.push("/login"), 3000);
      }
    };

    if (!user && !authLoading) {
      verify();
    }
    if (user && !authLoading) {
      router.replace("/");
    }
  }, [user, authLoading]);

  return (
    <div className="flex flex-col items-center justify-center p-6">
      {isLoading && <p>Verifying your email...</p>}
      {error && <p className="text-red-500">Error: {error.message}</p>}
      {success && (
        <p className="text-green-600">
          Email verified! Redirecting to login...
        </p>
      )}
    </div>
  );
}

export default function VerifyPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyPage />
    </Suspense>
  );
}
