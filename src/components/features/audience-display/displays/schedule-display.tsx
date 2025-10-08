import React, { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { PlayoffBracketDisplay } from "@/components/features/bracket/PlayoffBracketDisplay";
import SwissMatchesTable from "./swiss-matches-table";

// Hook to detect viewport size for responsive scaling
const useViewportSize = () => {
  const [viewportSize, setViewportSize] = useState({ width: 1920, height: 1080 });

  useEffect(() => {
    const updateSize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    // Set initial size
    updateSize();

    // Add event listener
    window.addEventListener('resize', updateSize);

    // Cleanup
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return viewportSize;
};

// Branding configuration constants for consistent styling
interface BrandingConfig {
  logoSrc: string;
  logoAlt: string;
  eventTitle: string;
  liveIndicatorColor: string;
}

const BRANDING_CONFIG: BrandingConfig = {
  logoSrc: "/btc_trans.png",
  logoAlt: "Logo STEAM For Vietnam, Đại học Bách khoa Hà Nội, UNICEF, Đại sứ quán Hoa Kỳ",
  eventTitle: "STEMESE Festival - 19/10 - Đại học Bách Khoa Hà Nội",
  liveIndicatorColor: "#00FF2F"
};

// Header white bar component
const BrandingBar: React.FC<{ position: 'top' | 'bottom' }> = () => {
  return (
    <div className="bg-white h-[10%] w-full flex items-center px-8 relative z-20">
      {/* Logo Section */}
      <div className="flex items-center gap-4 h-full py-2 w-[400px]">
        <div className="relative h-full aspect-square w-full">
          <Image
            src={BRANDING_CONFIG.logoSrc}
            alt={BRANDING_CONFIG.logoAlt}
            fill
            sizes="400px"
            className="object-contain"
          />
        </div>
      </div>

      {/* Event Info */}
      <div className="flex-1 text-center">
        <p className="text-black font-bold" style={{ fontSize: 'clamp(1.5rem, 2.5vw, 1.875rem)' }}>
          {BRANDING_CONFIG.eventTitle}
        </p>
      </div>

      {/* Live Indicator */}
      <div className="flex items-center justify-end gap-2 w-[320px]">
        <div 
          className="rounded-full animate-pulse" 
          style={{ 
            backgroundColor: BRANDING_CONFIG.liveIndicatorColor,
            width: 'clamp(14px, 1.5vw, 18px)',
            height: 'clamp(14px, 1.5vw, 18px)'
          }}
        />
        <span 
          className="font-bold"
          style={{ 
            color: BRANDING_CONFIG.liveIndicatorColor,
            fontSize: 'clamp(1.5rem, 2.5vw, 2rem)'
          }}
        >
          LIVE
        </span>
      </div>
    </div>
  );
};

// Define Schedule interface
export interface Match {
  id: string;
  matchNumber: string | number;
  scheduledTime: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  winningAlliance?: "RED" | "BLUE" | "TIE" | null;
  redScore?: number;
  blueScore?: number;
  alliances?: Array<{
    color: "RED" | "BLUE";
    teamAlliances: Array<{
      teamId: string;
      team?: {
        id: string;
        name: string;
        teamNumber?: string;
      };
    }>;
  }>;
  roundNumber?: number | null;
  bracket?: string;
  stage?: {
    id: string;
    name: string;
    tournamentId: string;
    type: "SWISS" | "PLAYOFF" | "FINAL";
  };
}

type AudienceStageType = "SWISS" | "PLAYOFF" | "FINAL" | "UNKNOWN";

interface StageSummary {
  stageId: string;
  stageName: string;
  stageType: AudienceStageType;
  matches: Match[];
}

interface ScheduleDisplayProps {
  matches: Match[];
  isLoading: boolean;
  selectedStageId?: string | null;
}

export const ScheduleDisplay: React.FC<ScheduleDisplayProps> = ({
  matches,
  isLoading,
  selectedStageId,
}) => {
  const [activeStageId, setActiveStageId] = useState<string | null>(selectedStageId || null);
  const viewportSize = useViewportSize();

  // Calculate available space after header/footer allocation
  const availableSpace = useMemo(() => {
    // 10% for footer + ~60px for tournament header = remaining space (removed top header)
    const headerFooterHeight = 10; // 10% of viewport height (only bottom bar now)
    const tournamentHeaderHeight = 60; // approximate px
    const availableHeight = `calc(${100 - headerFooterHeight}vh - ${tournamentHeaderHeight}px)`;
    
    // Calculate responsive scale based on viewport size
    const aspectRatio = viewportSize.width / viewportSize.height;
    const isWideScreen = aspectRatio >= 16/9;
    const scale = isWideScreen ? 'clamp(0.8, 1.2vw, 1.4)' : 'clamp(0.7, 1vw, 1.2)';
    
    return {
      height: availableHeight,
      maxHeight: availableHeight,
      scale,
      isWideScreen
    };
  }, [viewportSize]);

  // Sync internal state with prop changes
  useEffect(() => {
    if (selectedStageId !== undefined) {
      setActiveStageId(selectedStageId);
    }
  }, [selectedStageId]);
  const stageSummaries: StageSummary[] = useMemo(() => {
    if (!matches.length) return [];

    const grouped = new Map<string, StageSummary>();

    matches.forEach((match) => {
      const stageId = match.stage?.id || "unknown";
      const existing = grouped.get(stageId);

      if (existing) {
        existing.matches.push(match);
        return;
      }

      grouped.set(stageId, {
        stageId,
        stageName: match.stage?.name || "Unknown Stage",
        stageType: match.stage?.type || "UNKNOWN",
        matches: [match],
      });
    });

    return Array.from(grouped.values());
  }, [matches]);

  const selectedStageSummary = useMemo(() => {
    if (!selectedStageId) return null;
    return stageSummaries.find((stage) => stage.stageId === selectedStageId) || null;
  }, [selectedStageId, stageSummaries]);

  const activeStage = activeStageId
    ? stageSummaries.find((stage) => stage.stageId === activeStageId) || null
    : selectedStageId
      ? selectedStageSummary
      : stageSummaries.length === 1
        ? stageSummaries[0]
        : null;

  const stageMatches = useMemo(() => {
    if (activeStageId) {
      const stage = stageSummaries.find((s) => s.stageId === activeStageId);
      return stage ? stage.matches : [];
    }

    if (selectedStageId) {
      if (selectedStageSummary) {
        return selectedStageSummary.matches;
      }
      return matches.filter((match) => match.stage?.id === selectedStageId);
    }

    if (activeStage) {
      return activeStage.matches;
    }

    // Don't show all matches when no stage is selected - require stage selection
    return [];
  }, [activeStageId, selectedStageId, selectedStageSummary, activeStage, matches, stageSummaries]);

  const showNoMatchesForSelectedStage = (activeStageId || selectedStageId) &&
    (!activeStage || stageMatches.length === 0);

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-100">
      {/* Tournament Header - Auto height with responsive text */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-900 via-indigo-800 to-purple-900 text-white py-3">
        <div className="flex items-center justify-between px-6">
          <h2 className="font-bold" style={{ fontSize: 'clamp(1.25rem, 2vw, 1.5rem)' }}>Tournament Schedule</h2>

          {stageSummaries.length > 1 && (
            <div className="flex gap-2">
              {stageSummaries.map((stage) => (
                <button
                  key={stage.stageId}
                  onClick={() => setActiveStageId(stage.stageId)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    stage.stageId === activeStage?.stageId
                      ? "bg-white text-blue-900"
                      : "bg-blue-800 text-white hover:bg-blue-700"
                  }`}
                  style={{ fontSize: 'clamp(0.8rem, 1.1vw, 1rem)' }}
                >
                  {stage.stageName}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      

      {/* Main Content - Remaining space with responsive scaling */}
      <div 
        className="flex-1 overflow-hidden" 
        style={{ 
          height: availableSpace.height,
          maxHeight: availableSpace.maxHeight,
          '--content-scale': availableSpace.scale,
          '--text-scale': 'clamp(0.75rem, 1.2vw, 1rem)'
        } as React.CSSProperties}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full bg-white">
            <div className="text-gray-500" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.25rem)' }}>Loading matches...</div>
          </div>
        ) : showNoMatchesForSelectedStage ? (
          <div className="flex items-center justify-center h-full bg-white">
            <div className="text-gray-500" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.25rem)' }}>No matches in this stage.</div>
          </div>
        ) : !activeStage ? (
          <div className="flex items-center justify-center h-full bg-white">
            <div className="text-gray-500" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.25rem)' }}>
              {stageSummaries.length > 1 
                ? "Please select a stage to view the schedule" 
                : "No stages available"
              }
            </div>
          </div>
        ) : stageMatches.length > 0 ? (
          activeStage.stageType === "PLAYOFF" ||
          activeStage.stageType === "FINAL" ? (
            <PlayoffBracketDisplay
              matches={stageMatches}
              stageName={activeStage.stageName}
            />
          ) : activeStage.stageType === "SWISS" ? (
            <SwissMatchesTable
              matches={stageMatches}
              stageName={activeStage.stageName}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-white">
              <div className="text-gray-500" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.25rem)' }}>
                Display not available for this stage type
              </div>
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-full bg-white">
            <div className="text-gray-500" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.25rem)' }}>No matches available</div>
          </div>
        )}
      </div>

      {/* Bottom White Bar - Footer */}
      <BrandingBar position="bottom" />
    </div>
  );
};

export default ScheduleDisplay;
