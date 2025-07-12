"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DisplayControl,
  MatchesList,
  ScoreControl
} from "./tabs";
import CombinedMatchTimerControl from "./match-timer-control";
import type { 
  Match, 
  DisplayMode, 
  ScoreData, 
  MatchStateData,
  AnnouncementData 
} from "@/lib/types";

// Define interface for props using proper types
interface MatchControlTabsProps {
  // Common props
  selectedMatchId: string;
  tournamentId?: string;
  fieldId?: string | null;
  setSelectedMatchId?: (id: string) => void;
  selectedMatch?: Match | null;
  isLoadingMatches?: boolean;
  matchesData?: Match[];  
  // WebSocket props - adjust to match child component expectations
  sendMatchStateChange?: (params: {
    matchId: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    currentPeriod: string | null;
  }) => void;
  sendScoreUpdate?: (params: ScoreData) => void;
  
  // Display Control props - use string for displayMode to match child component
  displayMode?: string;
  setDisplayMode?: (mode: string) => void;
  showTimer?: boolean;
  setShowTimer?: (show: boolean) => void;
  showScores?: boolean;
  setShowScores?: (show: boolean) => void;
  showTeams?: boolean;
  setShowTeams?: (show: boolean) => void;
  announcementMessage?: string;
  setAnnouncementMessage?: (message: string) => void;
  handleDisplayModeChange?: () => void;
  handleSendAnnouncement?: () => void;
  
  // Match Control props
  matchPeriod: string;
  setMatchPeriod: (period: string) => void;
  
  // Timer Control props
  timerDuration: number;
  setTimerDuration: (duration: number) => void;
  timerRemaining: number;
  timerIsRunning: boolean;
  formatTime: (ms: number) => string;
  handleStartTimer: () => void;
  handlePauseTimer: () => void;
  handleResetTimer: () => void;
  
  // Score Control props
  redAutoScore: number;
  setRedAutoScore: React.Dispatch<React.SetStateAction<number>>;
  redDriveScore: number;
  setRedDriveScore: React.Dispatch<React.SetStateAction<number>>;
  blueAutoScore: number;
  setBlueAutoScore: React.Dispatch<React.SetStateAction<number>>;
  blueDriveScore: number;
  setBlueDriveScore: React.Dispatch<React.SetStateAction<number>>;
  redTotalScore: number;
  blueTotalScore: number;
  redGameElements: GameElement[];
  blueGameElements: GameElement[];
  setRedGameElements: (elements: GameElement[]) => void;
  setBlueGameElements: (elements: GameElement[]) => void;
  redTeamCount: number;
  blueTeamCount: number;
  redMultiplier: number;
  blueMultiplier: number;
  setRedTeamCount: (count: number) => void;
  setBlueTeamCount: (count: number) => void;
  setRedMultiplier: (multiplier: number) => void;
  setBlueMultiplier: (multiplier: number) => void;
  updateRedTeamCount: (count: number) => void;
  updateBlueTeamCount: (count: number) => void;
  scoreDetails: Record<string, any>;
  setScoreDetails: (details: Record<string, any>) => void;
  getRedTeams: (match: Match) => string[];
  getBlueTeams: (match: Match) => string[];
  handleUpdateScores: () => void;
  handleSubmitScores: () => void;

  handleSelectMatch: (match: {id: string; matchNumber: string | number}) => void;
  addRedGameElement: () => void;
  addBlueGameElement: () => void;
  removeGameElement: (alliance: 'red' | 'blue', index: number) => void;
  
  // Utility props
  queryClient: any;
  formatDate: (dateString: string) => string;
  getStatusBadgeColor: (status: string) => string;
  matchScoresMap: Record<string, { redTotalScore: number; blueTotalScore: number }>;
}

// Game element type definition
interface GameElement {
  element: string;
  count: number;
  pointsEach: number;
  operation: string;
  totalPoints: number;
}

export default function MatchControlTabs({
  // Common props
  selectedMatchId,
  setSelectedMatchId,
  selectedMatch,
  isLoadingMatches,
  matchesData,
  
  // WebSocket props
  sendMatchStateChange,
  sendScoreUpdate,
  
  // Display Control props
  displayMode,
  setDisplayMode,
  showTimer,
  setShowTimer,
  showScores,
  setShowScores,
  showTeams,
  setShowTeams,
  announcementMessage,
  setAnnouncementMessage,
  handleDisplayModeChange,
  handleSendAnnouncement,
  
  // Match Control props
  matchPeriod,
  setMatchPeriod,
  
  // Timer Control props
  timerDuration,
  setTimerDuration,
  timerRemaining,
  timerIsRunning,
  formatTime,
  handleStartTimer,
  handlePauseTimer,
  handleResetTimer,
  
  // Score Control props
  redAutoScore,
  setRedAutoScore,
  redDriveScore,
  setRedDriveScore,
  blueAutoScore,
  setBlueAutoScore,
  blueDriveScore,
  setBlueDriveScore,
  redTotalScore,
  blueTotalScore,
  redGameElements,
  blueGameElements,
  setRedGameElements,
  setBlueGameElements,
  redTeamCount,
  blueTeamCount,
  redMultiplier,
  blueMultiplier,
  setRedTeamCount,
  setBlueTeamCount,
  setRedMultiplier,
  setBlueMultiplier,
  updateRedTeamCount,
  updateBlueTeamCount,
  scoreDetails,
  setScoreDetails,
  getRedTeams,
  getBlueTeams,
  handleUpdateScores,
  handleSubmitScores,

  handleSelectMatch,
  addRedGameElement,
  addBlueGameElement,
  removeGameElement,
  
  // Utility props
  queryClient,
  formatDate,
  getStatusBadgeColor,
  matchScoresMap
}: MatchControlTabsProps) {
  // State for current tab
  const [currentTab, setCurrentTab] = useState<string>("matches");
  
  // Create a game element type object for consistency (used by ScoreControl)
  const gameElementType = {
    element: "",
    count: 0,
    pointsEach: 0,
    operation: "multiply",
    totalPoints: 0,
  };

  return (
    <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
      <TabsList className="grid grid-cols-4 mb-4">
        <TabsTrigger value="matches">Matches</TabsTrigger>
        <TabsTrigger value="display">Display Control</TabsTrigger>
        <TabsTrigger value="match">Match & Timer Control</TabsTrigger>
        <TabsTrigger value="scores">Score Control</TabsTrigger>
      </TabsList>      {/* Matches List Tab */}
      <TabsContent value="matches">
        <MatchesList
          isLoadingMatches={isLoadingMatches ?? false}
          matchesData={matchesData ?? []}
          selectedMatch={selectedMatch}
          handleSelectMatch={handleSelectMatch}
          formatDate={formatDate}
          getStatusBadgeColor={getStatusBadgeColor}
          getRedTeams={getRedTeams}
          getBlueTeams={getBlueTeams}
          matchScoresMap={matchScoresMap}
          setCurrentTab={setCurrentTab}
        />
      </TabsContent>

      {/* Display Control Tab */}
      <TabsContent value="display">
        <DisplayControl
          selectedMatchId={selectedMatchId}          displayMode={displayMode ?? "match"}
          setDisplayMode={setDisplayMode ?? (() => {})}
          showTimer={showTimer ?? false}
          setShowTimer={setShowTimer ?? (() => {})}
          showScores={showScores ?? false}
          setShowScores={setShowScores ?? (() => {})}
          showTeams={showTeams ?? false}
          setShowTeams={setShowTeams ?? (() => {})}
          announcementMessage={announcementMessage ?? ""}
          setAnnouncementMessage={setAnnouncementMessage ?? (() => {})}
          handleDisplayModeChange={handleDisplayModeChange ?? (() => {})}
          handleSendAnnouncement={handleSendAnnouncement ?? (() => {})}
          selectedMatch={selectedMatch}
        />
      </TabsContent>

      {/* Match & Timer Control Tab */}
      <TabsContent value="match">
        <CombinedMatchTimerControl
          selectedMatchId={selectedMatchId}
          setSelectedMatchId={setSelectedMatchId ?? (() => {})}
          matchPeriod={matchPeriod}
          setMatchPeriod={setMatchPeriod}
          sendMatchStateChange={sendMatchStateChange ?? (() => {})}
          selectedMatch={selectedMatch}
          timerDuration={timerDuration}
          setTimerDuration={setTimerDuration}
          timerRemaining={timerRemaining}
          timerIsRunning={timerIsRunning}
          formatTime={formatTime}
          handleStartTimer={handleStartTimer}
          handlePauseTimer={handlePauseTimer}
          handleResetTimer={handleResetTimer}
        />
      </TabsContent>

      {/* Score Control Tab */}
      <TabsContent value="scores">
        <ScoreControl
          selectedMatch={selectedMatch}
          selectedMatchId={selectedMatchId}
          redAutoScore={redAutoScore}
          setRedAutoScore={setRedAutoScore}
          redDriveScore={redDriveScore}
          setRedDriveScore={setRedDriveScore}
          redTeamCount={redTeamCount}
          setRedTeamCount={setRedTeamCount}
          redMultiplier={redMultiplier}
          setRedMultiplier={setRedMultiplier}
          blueAutoScore={blueAutoScore}
          setBlueAutoScore={setBlueAutoScore}
          blueDriveScore={blueDriveScore}
          setBlueDriveScore={setBlueDriveScore}
          blueTeamCount={blueTeamCount}
          setBlueTeamCount={setBlueTeamCount}
          blueMultiplier={blueMultiplier}
          setBlueMultiplier={setBlueMultiplier}
          handleUpdateScores={handleUpdateScores}
          handleSubmitScores={handleSubmitScores}

          gameElementType={gameElementType}
          redGameElements={redGameElements}
          blueGameElements={blueGameElements}
          getRedTeams={getRedTeams}
          getBlueTeams={getBlueTeams}
          scoreDetails={scoreDetails}
          setScoreDetails={setScoreDetails}
          updateRedTeamCount={updateRedTeamCount}
          updateBlueTeamCount={updateBlueTeamCount}
          addRedGameElement={addRedGameElement}
          addBlueGameElement={addBlueGameElement}
          removeGameElement={removeGameElement}
        />
      </TabsContent>
    </Tabs>
  );
}