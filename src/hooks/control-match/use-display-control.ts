import { useState } from "react";

interface UseDisplayControlProps {
  initialDisplayMode?: string;
  initialShowTimer?: boolean;
  initialShowScores?: boolean;
  initialShowTeams?: boolean;
}

interface DisplayControlReturn {
  // Display mode
  displayMode: string;
  setDisplayMode: (mode: string) => void;
  
  // Display toggles
  showTimer: boolean;
  showScores: boolean;
  showTeams: boolean;
  setShowTimer: (show: boolean) => void;
  setShowScores: (show: boolean) => void;
  setShowTeams: (show: boolean) => void;
  
  // Announcement
  announcementMessage: string;
  setAnnouncementMessage: (message: string) => void;
  
  // Field selection
  selectedFieldId: string | null;
  setSelectedFieldId: (fieldId: string | null) => void;
  
  // Tournament selection
  selectedTournamentId: string;
  setSelectedTournamentId: (tournamentId: string) => void;
}

export function useDisplayControl({
  initialDisplayMode = "match",
  initialShowTimer = true,
  initialShowScores = true,
  initialShowTeams = true,
}: UseDisplayControlProps = {}): DisplayControlReturn {
  // Display state
  const [displayMode, setDisplayMode] = useState<string>(initialDisplayMode);
  const [showTimer, setShowTimer] = useState<boolean>(initialShowTimer);
  const [showScores, setShowScores] = useState<boolean>(initialShowScores);
  const [showTeams, setShowTeams] = useState<boolean>(initialShowTeams);
  const [announcementMessage, setAnnouncementMessage] = useState<string>("");
  // Selection state
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("all");

  return {
    // Display mode
    displayMode,
    setDisplayMode,
    
    // Display toggles
    showTimer,
    showScores,
    showTeams,
    setShowTimer,
    setShowScores,
    setShowTeams,
    
    // Announcement
    announcementMessage,
    setAnnouncementMessage,
    
    // Field selection
    selectedFieldId,
    setSelectedFieldId,
    
    // Tournament selection
    selectedTournamentId,
    setSelectedTournamentId,
  };
}
