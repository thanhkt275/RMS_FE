"use client";

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DisplayControlProps {
  selectedMatchId: string;
  displayMode: string;
  setDisplayMode: (mode: string) => void;
  showTimer: boolean;
  setShowTimer: (show: boolean) => void;
  showScores: boolean;
  setShowScores: (show: boolean) => void;
  showTeams: boolean;
  setShowTeams: (show: boolean) => void;
  announcementMessage: string;
  setAnnouncementMessage: (message: string) => void;
  handleDisplayModeChange: () => void;
  handleSendAnnouncement: () => void;
  selectedMatch: any | null; // Type should be refined based on your Match model
}

export default function DisplayControl({
  selectedMatchId,
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
  selectedMatch
}: DisplayControlProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audience Display Settings</CardTitle>
        <CardDescription>
          Control what is shown on the audience display
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid w-full items-center gap-4">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="displayMode">Display Mode</Label>
            <Select value={displayMode} onValueChange={setDisplayMode}>
              <SelectTrigger id="displayMode">
                <SelectValue placeholder="Select display mode" />
              </SelectTrigger>              <SelectContent position="popper">
                <SelectItem value="match">Match Details</SelectItem>
                <SelectItem value="teams">Teams List</SelectItem>
                <SelectItem value="schedule">Schedule</SelectItem>
                <SelectItem value="rankings">Rankings</SelectItem>
                <SelectItem value="announcement">Announcement</SelectItem>
                <SelectItem value="blank">Blank Screen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {displayMode === 'match' && (
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="matchId">Match ID</Label>
              <Input
                id="matchId"
                value={selectedMatchId}
                onChange={(e) => {/* Controlled by parent */}}
                placeholder="Enter match ID"
                readOnly={selectedMatch !== null}
              />
              {selectedMatch && (
                <div className="text-sm text-gray-600">
                  Selected match: {selectedMatch.matchNumber}
                </div>
              )}
            </div>
          )}

          {displayMode === 'announcement' && (
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="announcement">Announcement</Label>
              <Input
                id="announcement"
                value={announcementMessage}
                onChange={(e) => setAnnouncementMessage(e.target.value)}
                placeholder="Enter announcement message"
              />
              <Button variant="secondary" onClick={handleSendAnnouncement}>
                Send Announcement
              </Button>
            </div>
          )}

          {displayMode === 'match' && (
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  id="showTimer"
                  type="checkbox"
                  checked={showTimer}
                  onChange={() => setShowTimer(!showTimer)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label
                  htmlFor="showTimer"
                  className="text-sm font-medium"
                >
                  Show Timer
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  id="showScores"
                  type="checkbox"
                  checked={showScores}
                  onChange={() => setShowScores(!showScores)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label
                  htmlFor="showScores"
                  className="text-sm font-medium"
                >
                  Show Scores
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  id="showTeams"
                  type="checkbox"
                  checked={showTeams}
                  onChange={() => setShowTeams(!showTeams)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label
                  htmlFor="showTeams"
                  className="text-sm font-medium"
                >
                  Show Teams
                </Label>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleDisplayModeChange}>Update Display</Button>
      </CardFooter>
    </Card>
  );
}