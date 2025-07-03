import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Megaphone } from "lucide-react";

interface AnnouncementPanelProps {
  announcementMessage: string;
  setAnnouncementMessage: (message: string) => void;
  displayMode: string;
  setDisplayMode: (mode: string) => void;
  showTimer: boolean;
  showScores: boolean;
  showTeams: boolean;
  setShowTimer: (show: boolean) => void;
  setShowScores: (show: boolean) => void;
  setShowTeams: (show: boolean) => void;
  onSendAnnouncement: () => void;
  onDisplayModeChange: () => void;
  isConnected: boolean;
  disabled?: boolean;
}

export function AnnouncementPanel({
  announcementMessage,
  setAnnouncementMessage,
  displayMode,
  setDisplayMode,
  showTimer,
  showScores,
  showTeams,
  setShowTimer,
  setShowScores,
  setShowTeams,
  onSendAnnouncement,
  onDisplayModeChange,
  isConnected,
  disabled = false,
}: AnnouncementPanelProps) {
  const isDisabled = disabled || !isConnected;

  return (
    <Card className="bg-white border border-gray-200 shadow-lg rounded-xl p-8 text-gray-700">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 text-center flex items-center justify-center gap-2">
        <Megaphone className="w-6 h-6 text-orange-600" />
        Display Control & Announcements
      </h2>

      <div className="space-y-8">
        {/* Display Mode Selection */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-800">
            Display Mode
          </label>
          <Select
            value={displayMode}
            onValueChange={setDisplayMode}
            disabled={isDisabled}
          >
            <SelectTrigger className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-lg focus:ring-2 focus:ring-blue-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="match">Match View</SelectItem>
              <SelectItem value="teams">Teams List</SelectItem>
              <SelectItem value="rankings">Rankings</SelectItem>
              <SelectItem value="schedule">Match Schedule</SelectItem>
              <SelectItem value="announcement">Announcement</SelectItem>
              <SelectItem value="blank">Blank Screen</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Display Options */}
        <div>
          <label className="block text-sm font-semibold mb-3 text-gray-800">
            Display Options
          </label>
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showTimer}
                onChange={(e) => setShowTimer(e.target.checked)}
                disabled={isDisabled}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm font-medium text-gray-700">Show Timer</span>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showScores}
                onChange={(e) => setShowScores(e.target.checked)}
                disabled={isDisabled}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm font-medium text-gray-700">Show Scores</span>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showTeams}
                onChange={(e) => setShowTeams(e.target.checked)}
                disabled={isDisabled}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm font-medium text-gray-700">Show Teams</span>
            </label>
          </div>
        </div>

        {/* Apply Display Settings Button */}
        <Button
          onClick={onDisplayModeChange}
          disabled={isDisabled}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-md"
          size="lg"
        >
          Apply Display Settings
        </Button>

        {/* Announcement Input */}
        <div>
          <label className="block text-sm font-semibold mb-3 text-gray-800">
            Send Announcement
          </label>
          <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <Textarea
              value={announcementMessage}
              onChange={(e) => setAnnouncementMessage(e.target.value)}
              placeholder="Enter announcement message..."
              disabled={isDisabled}
              rows={4}
              className="resize-none bg-white border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-300 text-lg"
            />
            
            <Button
              onClick={onSendAnnouncement}
              disabled={isDisabled || !announcementMessage.trim()}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-md"
              size="lg"
            >
              <Send className="w-5 h-5 mr-2" />
              Send Announcement
            </Button>
          </div>
        </div>

        {/* Connection Status */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-center gap-3 text-sm p-3 rounded-lg bg-gray-50 border border-gray-200">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className={`font-semibold ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
              {isConnected ? 'Connected to display' : 'Disconnected from display'}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
