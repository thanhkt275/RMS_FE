import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Megaphone, Image, Video, Youtube, Type, Eye, AlertCircle, Clock } from "lucide-react";
import { AnnouncementData, AnnouncementType, validateImageUrl, validateVideoUrl, validateYouTubeUrl } from "@/hooks/control-match/use-announcement";

interface AnnouncementPanelProps {
  announcement: AnnouncementData;
  updateAnnouncement: (updates: Partial<AnnouncementData>) => void;
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
  validateAnnouncement: () => { isValid: boolean; error?: string };
  isConnected: boolean;
  disabled?: boolean;
}

export function AnnouncementPanel({
  announcement,
  updateAnnouncement,
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
  validateAnnouncement,
  isConnected,
  disabled = false,
}: AnnouncementPanelProps) {
  const isDisabled = disabled || !isConnected;
  const [validationError, setValidationError] = useState<string | null>(null);

  // Get the appropriate icon for each announcement type
  const getTypeIcon = (type: AnnouncementType) => {
    switch (type) {
      case 'text': return <Type className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'youtube': return <Youtube className="w-4 h-4" />;
      default: return <Type className="w-4 h-4" />;
    }
  };

  // Validate content in real-time
  const handleContentChange = (content: string) => {
    updateAnnouncement({ content });
    setValidationError(null);
    
    if (content.trim()) {
      let isValid = true;
      let error = '';
      
      switch (announcement.type) {
        case 'image':
          isValid = validateImageUrl(content);
          if (!isValid) error = 'Please provide a valid image URL. Supported: direct image links, imgur, cloudinary, social media images, etc.';
          break;
        case 'video':
          isValid = validateVideoUrl(content);
          if (!isValid) error = 'Please provide a valid video URL. Supported: direct video links, vimeo, social media videos, etc.';
          break;
        case 'youtube':
          isValid = validateYouTubeUrl(content);
          if (!isValid) error = 'Please provide a valid YouTube URL (youtube.com/watch or youtu.be)';
          break;
      }
      
      if (!isValid) {
        setValidationError(error);
      }
    }
  };

  // Handle send announcement with validation
  const handleSendAnnouncement = () => {
    const validation = validateAnnouncement();
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid announcement');
      return;
    }
    setValidationError(null);
    onSendAnnouncement();
  };

  // Get placeholder text based on announcement type
  const getPlaceholder = () => {
    switch (announcement.type) {
      case 'text': return 'Enter your announcement message...';
      case 'image': return 'Enter image URL (supports imgur, cloudinary, social media, direct links, etc.)';
      case 'video': return 'Enter video URL (supports vimeo, social media, direct links, etc.)';
      case 'youtube': return 'Enter YouTube URL (e.g., https://youtube.com/watch?v=... or https://youtu.be/...)';
      default: return 'Enter content...';
    }
  };

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

        {/* Announcement Configuration - Only show when Announcement mode is selected */}
        {displayMode === "announcement" && (
          <div>
            <label className="block text-sm font-semibold mb-3 text-gray-800">
              Configure Announcement
            </label>
            <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
            
            {/* Announcement Type Selection */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Content Type
              </label>
              <Select
                value={announcement.type}
                onValueChange={(value: AnnouncementType) => {
                  updateAnnouncement({ type: value, content: '' });
                  setValidationError(null);
                }}
                disabled={isDisabled}
              >
                <SelectTrigger className="bg-white border border-orange-300 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">
                    <div className="flex items-center gap-2">
                      <Type className="w-4 h-4" />
                      Text Message
                    </div>
                  </SelectItem>
                  <SelectItem value="image">
                    <div className="flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      Image
                    </div>
                  </SelectItem>
                  <SelectItem value="video">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      Video
                    </div>
                  </SelectItem>
                  <SelectItem value="youtube">
                    <div className="flex items-center gap-2">
                      <Youtube className="w-4 h-4" />
                      YouTube
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title Input (Optional) */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Title (Optional)
              </label>
              <Input
                value={announcement.title || ''}
                onChange={(e) => updateAnnouncement({ title: e.target.value })}
                placeholder="Enter announcement title..."
                disabled={isDisabled}
                className="bg-white border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-300"
              />
            </div>

            {/* Content Input */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                {announcement.type === 'text' ? 'Message' : 'URL'}
              </label>
              {announcement.type === 'text' ? (
                <Textarea
                  value={announcement.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder={getPlaceholder()}
                  disabled={isDisabled}
                  rows={4}
                  className="resize-none bg-white border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-300 text-lg"
                />
              ) : (
                <Input
                  value={announcement.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder={getPlaceholder()}
                  disabled={isDisabled}
                  className="bg-white border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-300 text-lg"
                />
              )}
            </div>

            {/* Duration Setting */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Display Duration (seconds)
              </label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <Input
                  type="number"
                  min="1"
                  max="300"
                  value={announcement.duration?.toString() || "10"}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      updateAnnouncement({ duration: 10 });
                    } else {
                      const parsedValue = parseInt(value);
                      if (!isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= 300) {
                        updateAnnouncement({ duration: parsedValue });
                      } else if (!isNaN(parsedValue)) {
                        // Clamp value to valid range
                        const clampedValue = Math.max(1, Math.min(300, parsedValue));
                        updateAnnouncement({ duration: clampedValue });
                      }
                    }
                  }}
                  disabled={isDisabled}
                  className="bg-white border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-300 w-24"
                />
                <span className="text-sm text-gray-600">seconds</span>
              </div>
            </div>

            {/* Validation Error */}
            {validationError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{validationError}</span>
              </div>
            )}
            
            {/* Preview Button (for media content) */}
            {announcement.type !== 'text' && announcement.content.trim() && !validationError && (
              <Button
                onClick={() => {
                  if (announcement.type === 'image' || announcement.type === 'video') {
                    window.open(announcement.content, '_blank');
                  } else if (announcement.type === 'youtube') {
                    window.open(announcement.content, '_blank');
                  }
                }}
                variant="outline"
                size="sm"
                className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
                disabled={isDisabled}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview {announcement.type === 'youtube' ? 'YouTube Video' : announcement.type}
              </Button>
            )}
            
            {/* Send Button */}
            <Button
              onClick={handleSendAnnouncement}
              disabled={isDisabled || !announcement.content.trim() || !!validationError}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-md"
              size="lg"
            >
              <Send className="w-5 h-5 mr-2" />
              Send {announcement.type === 'text' ? 'Announcement' : `${announcement.type.charAt(0).toUpperCase() + announcement.type.slice(1)} Announcement`}
            </Button>
            </div>
          </div>
        )}

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
