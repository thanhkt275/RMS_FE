import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StageReadiness } from "@/types/stage-advancement.types";
import { CheckCircle, XCircle, AlertTriangle, Users, Clock } from "lucide-react";

interface ReadinessIndicatorProps {
  readiness: StageReadiness;
  className?: string;
}

/**
 * Component to display stage readiness status
 * Implements Single Responsibility Principle - only displays readiness information
 */
export function ReadinessIndicator({ readiness, className = "" }: ReadinessIndicatorProps) {
  
  const getStatusIcon = () => {
    if (readiness.ready) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    return <XCircle className="h-5 w-5 text-red-600" />;
  };

  const getStatusColor = () => {
    if (readiness.ready) {
      return "bg-green-50 border-green-200 text-green-800";
    }
    return "bg-red-50 border-red-200 text-red-800";
  };

  const getStatusTitle = () => {
    if (readiness.ready) {
      return "Stage Ready for Advancement";
    }
    return "Stage Not Ready for Advancement";
  };

  return (
    <div className={className}>
      <Alert className={getStatusColor()}>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <AlertTitle className="font-semibold">{getStatusTitle()}</AlertTitle>
        </div>
        <AlertDescription className="mt-2">
          {readiness.reason && (
            <div className="mb-2">{readiness.reason}</div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            {typeof readiness.totalTeams === 'number' && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="text-sm">
                  <span className="font-medium">{readiness.totalTeams}</span> teams in stage
                </span>
              </div>
            )}
            
            {typeof readiness.incompleteMatches === 'number' && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">
                  <span className="font-medium">{readiness.incompleteMatches}</span> incomplete matches
                </span>
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

interface ReadinessCardProps {
  readiness: StageReadiness;
  stageName: string;
  className?: string;
}

/**
 * Card component for displaying readiness information
 */
export function ReadinessCard({ readiness, stageName, className = "" }: ReadinessCardProps) {
  return (
    <Card className={`${className} bg-white border border-gray-200 shadow-lg rounded-xl`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <AlertTriangle className="h-5 w-5 text-blue-600" />
          Advancement Readiness
        </CardTitle>
        <CardDescription className="text-gray-600">
          Current status for advancing teams from {stageName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ReadinessIndicator readiness={readiness} />
      </CardContent>
    </Card>
  );
}
