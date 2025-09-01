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
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
      <div className="w-full max-w-md text-center">
        {isLoading && (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600">Verifying your email...</p>
          </div>
        )}
        
        {error && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-red-800 mb-2">Verification Failed</h2>
              <p className="text-red-600 mb-4">
                {error.message.includes('expired') || error.message.includes('invalid') 
                  ? "This verification link has expired or is invalid. Verification links expire after 10 minutes for security."
                  : error.message
                }
              </p>
              <a 
                href="/login" 
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Go to Login & Request New Link
              </a>
            </div>
          </div>
        )}
        
        {success && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-green-800 mb-2">Email Verified!</h2>
              <p className="text-green-600 mb-4">
                Your email has been successfully verified. You can now log in to your account.
              </p>
              <p className="text-sm text-gray-600">
                Redirecting to login page in 3 seconds...
              </p>
            </div>
          </div>
        )}
      </div>
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
