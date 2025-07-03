import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger, 
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel 
} from "@/components/ui/dropdown-menu";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RefreshCw, Calculator, Trophy, AlertCircle } from "lucide-react";
import { useTeamStatsRecalculation, useUpdateRankings } from "@/hooks/api/use-team-stats-recalculation";

interface TeamStatsRecalculateButtonProps {
  tournamentId: string | undefined;
  stageId: string | undefined;
  disabled?: boolean;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function TeamStatsRecalculateButton({
  tournamentId,
  stageId,
  disabled = false,
  variant = "outline",
  size = "default",
  className = ""
}: TeamStatsRecalculateButtonProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const recalculateStatsMutation = useTeamStatsRecalculation();
  const updateRankingsMutation = useUpdateRankings();

  const isRecalculating = recalculateStatsMutation.isPending;
  const isUpdatingRankings = updateRankingsMutation.isPending;
  const isLoading = isRecalculating || isUpdatingRankings;

  const canRecalculate = tournamentId && !disabled && !isLoading;

  const handleFullRecalculation = () => {
    if (!tournamentId) return;
    
    recalculateStatsMutation.mutate({
      tournamentId,
      stageId: (stageId === "__ALL_TEAMS__" || stageId === "all") ? undefined : stageId
    });
    setIsDropdownOpen(false);
  };

  const handleRankingsUpdate = () => {
    if (!tournamentId) return;
    
    updateRankingsMutation.mutate({
      tournamentId,
      stageId: (stageId === "__ALL_TEAMS__" || stageId === "all") ? undefined : stageId
    });
    setIsDropdownOpen(false);
  };

  const getScope = () => {
    if (!stageId || stageId === "__ALL_TEAMS__" || stageId === "all") return "tournament";
    return "stage";
  };

  return (
    <TooltipProvider>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={variant} 
                size={size}
                disabled={!canRecalculate}
                className={`flex items-center gap-2 ${className}`}
                aria-label={`Recalculate team statistics for ${getScope()}`}
              >
                <RefreshCw 
                  size={16} 
                  className={isLoading ? "animate-spin" : ""} 
                />
                {isLoading ? "Processing..." : "Recalculate"}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Recalculate team statistics and rankings</p>
            {!canRecalculate && (
              <p className="text-yellow-400 text-xs mt-1">
                <AlertCircle size={12} className="inline mr-1" />
                Select a tournament first
              </p>
            )}
          </TooltipContent>
        </Tooltip>
        
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs text-gray-500">
            Recalculate for {getScope()}
            {!tournamentId && (
              <span className="block text-yellow-500 mt-1">
                ⚠️ Tournament required
              </span>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={handleFullRecalculation}
            disabled={isLoading}
            className="flex items-center gap-3 cursor-pointer p-3"
          >
            <Calculator size={16} className="text-blue-500" />
            <div className="flex flex-col">
              <span className="font-medium">Full Recalculation</span>
              <span className="text-xs text-gray-500">
                Recalculate all stats from match results
              </span>
              <span className="text-xs text-orange-500 mt-1">
                🔄 This will clear and rebuild all statistics
              </span>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={handleRankingsUpdate}
            disabled={isLoading}
            className="flex items-center gap-3 cursor-pointer p-3"
          >
            <Trophy size={16} className="text-yellow-500" />
            <div className="flex flex-col">
              <span className="font-medium">Update Rankings Only</span>
              <span className="text-xs text-gray-500">
                Update rank field using existing statistics
              </span>
              <span className="text-xs text-green-500 mt-1">
                ⚡ Faster option that preserves existing data
              </span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
