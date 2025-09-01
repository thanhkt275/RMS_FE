"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, RefreshCw, CheckCircle, X } from "lucide-react";
import { useAuth } from "@/hooks/common/use-auth";

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export function EmailVerificationModal({ isOpen, onClose, message }: EmailVerificationModalProps) {
  const { resendVerificationEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setResendError("Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setResendError("Please enter a valid email address");
      return;
    }

    try {
      setIsResending(true);
      setResendError(null);
      setResendSuccess(null);
      
      await resendVerificationEmail(email);
      setResendSuccess("Verification email sent successfully! Please check your inbox and spam folder. The link will expire in 10 minutes.");
      
    } catch (error: any) {
      console.error("Resend verification error:", error);
      setResendError(error.message || "Failed to send verification email. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setResendSuccess(null);
    setResendError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-lg">Email Verification Required</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            {message || "Your email address needs to be verified before you can login."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {resendSuccess ? (
            <Alert className="bg-green-50 text-green-800 border-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{resendSuccess}</AlertDescription>
            </Alert>
          ) : (
            <>
              {resendError && (
                <Alert variant="destructive">
                  <AlertDescription>{resendError}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleResendVerification} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resend-email">Email Address</Label>
                  <Input
                    id="resend-email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isResending}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    We'll send a new verification link to this email address.
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={isResending}>
                  {isResending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Sending Verification Email...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Verification Email
                    </>
                  )}
                </Button>
              </form>
            </>
          )}
        </CardContent>

        <CardFooter className="text-center text-sm text-gray-500">
          <p>
            Check your spam folder if you don't see the email. 
            <br />
            Verification links expire after 10 minutes. You can request a new one every 10 minutes.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
