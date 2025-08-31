import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/common/use-auth';
import { UserRole } from '@/types/types';

interface AdminRouteProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

export function AdminRoute({ 
  children, 
  fallbackTitle = "Access Denied",
  fallbackMessage = "Only administrators can access this page."
}: AdminRouteProps) {
  const { user } = useAuth();
  const router = useRouter();

  if (user?.role !== UserRole.ADMIN) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <Shield className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">{fallbackTitle}</h2>
              <p className="text-gray-600">{fallbackMessage}</p>
              <Button onClick={() => router.back()} variant="outline">
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
