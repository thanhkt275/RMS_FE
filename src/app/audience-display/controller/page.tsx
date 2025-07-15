"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useScheduledMatches, useActiveMatch } from "@/hooks/control-match/use-match-control";
import { useAudienceDisplaySettings, useUpdateAudienceDisplay } from "@/hooks/audience-display/use-audience-display";
import { toast } from "sonner";
import type { DisplayMode } from "@/types/types";

export default function AudienceDisplayController() {
  const [displayMode, setDisplayMode] = useState<string>("intro");
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const { data: scheduledMatches, isLoading: isLoadingScheduled } = useScheduledMatches();
  const { data: activeMatch, isLoading: isLoadingActive } = useActiveMatch(selectedMatchId);
  const { data: audienceSettings } = useAudienceDisplaySettings();
  const updateAudienceDisplay = useUpdateAudienceDisplay();
  const router = useRouter();

  const handlePreview = () => {
    // In a real app, this would save the state to be retrieved by the audience display
    window.open("/audience-display", "_blank");
    toast.success("Preview opened in new tab");
  };

  const handleApply = () => {
    updateAudienceDisplay.mutate({
      displayMode: displayMode as DisplayMode,
      matchId: selectedMatchId,
      showTimer: true,
      showScores: true,
      showTeams: true
    }, {
      onSuccess: () => {
        toast.success(`Display mode set to: ${displayMode}`);
      },
      onError: () => {
        toast.error("Failed to update display settings");
      }
    });
  };

  const handleMatchSelect = (matchId: string) => {
    setSelectedMatchId(matchId);
    
    // If selected match and display mode is 'match', update immediately
    if (displayMode === 'match') {
      updateAudienceDisplay.mutate({
        displayMode: 'match',
        matchId: matchId
      });
    }
  };

  const handleDisplayModeChange = (mode: string) => {
    setDisplayMode(mode);
    
    // Update when changing to match mode with a selected match
    if (mode === 'match' && selectedMatchId) {
      updateAudienceDisplay.mutate({
        displayMode: 'match',
        matchId: selectedMatchId
      });
    } else if (mode !== 'match') {
      // For non-match modes, clear the match ID in settings
      updateAudienceDisplay.mutate({
        displayMode: mode as DisplayMode,
        matchId: null
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-10 px-4 w-full">
      <h1 className="text-4xl font-extrabold text-center mb-10 text-gray-900 drop-shadow-lg tracking-tight">
        Audience Display Control
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10 max-w-6xl mx-auto">
        {/* Display Settings Card */}
        <Card className="bg-white border-2 border-blue-200 shadow-xl rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-blue-900">Display Settings</CardTitle>
            <CardDescription className="text-gray-700">
              Control what appears on the audience display screens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-8 space-y-4">
              <RadioGroup
                value={displayMode}
                onValueChange={handleDisplayModeChange}
                className="space-y-4"
              >
                <div className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${displayMode==='intro' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 bg-white hover:border-blue-300'}` }>
                  <RadioGroupItem value="intro" id="intro" />
                  <Label htmlFor="intro" className="cursor-pointer w-full">
                    <div className="font-semibold text-lg text-blue-900">Tournament Introduction</div>
                    <div className="text-sm text-gray-500">Display tournament welcome screen</div>
                  </Label>
                </div>
                <div className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${displayMode==='queue' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 bg-white hover:border-blue-300'}` }>
                  <RadioGroupItem value="queue" id="queue" />
                  <Label htmlFor="queue" className="cursor-pointer w-full">
                    <div className="font-semibold text-lg text-blue-900">Upcoming Matches</div>
                    <div className="text-sm text-gray-500">Show queue of next matches</div>
                  </Label>
                </div>
                <div className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${displayMode==='match' ? 'border-green-500 bg-green-50 shadow-md' : 'border-gray-200 bg-white hover:border-green-300'}` }>
                  <RadioGroupItem value="match" id="match" disabled={!selectedMatchId} />
                  <Label htmlFor="match" className={`cursor-pointer w-full ${!selectedMatchId ? 'opacity-50' : ''}`}>
                    <div className="font-semibold text-lg text-green-900">Active Match</div>
                    <div className="text-sm text-gray-500">
                      {selectedMatchId 
                        ? `Show match #${activeMatch?.matchNumber || '...'}`
                        : "Select a match first"
                      }
                    </div>
                  </Label>
                </div>
                <div className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${displayMode==='results' ? 'border-purple-500 bg-purple-50 shadow-md' : 'border-gray-200 bg-white hover:border-purple-300'}` }>
                  <RadioGroupItem value="results" id="results" />
                  <Label htmlFor="results" className="cursor-pointer w-full">
                    <div className="font-semibold text-lg text-purple-900">Match Results</div>
                    <div className="text-sm text-gray-500">Show results from completed matches</div>
                  </Label>
                </div>
                <div className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${displayMode==='standings' ? 'border-yellow-500 bg-yellow-50 shadow-md' : 'border-gray-200 bg-white hover:border-yellow-300'}` }>
                  <RadioGroupItem value="standings" id="standings" />
                  <Label htmlFor="standings" className="cursor-pointer w-full">
                    <div className="font-semibold text-lg text-yellow-900">Tournament Standings</div>
                    <div className="text-sm text-gray-500">Display current tournament standings</div>
                  </Label>
                </div>
                <div className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${displayMode==='awards' ? 'border-pink-500 bg-pink-50 shadow-md' : 'border-gray-200 bg-white hover:border-pink-300'}` }>
                  <RadioGroupItem value="awards" id="awards" />
                  <Label htmlFor="awards" className="cursor-pointer w-full">
                    <div className="font-semibold text-lg text-pink-900">Awards Ceremony</div>
                    <div className="text-sm text-gray-500">Display for awards presentations</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className="flex items-center gap-4 mt-10 justify-end">
              <Button 
                onClick={handlePreview} 
                variant="outline"
                className="border-blue-400 text-blue-700 font-semibold shadow-sm hover:bg-blue-50"
              >
                Preview
              </Button>
              <Button 
                onClick={handleApply}
                disabled={updateAudienceDisplay.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md px-6 py-2 rounded-lg"
              >
                {updateAudienceDisplay.isPending ? "Applying..." : "Apply to Audience Screens"}
              </Button>
            </div>
          </CardContent>
        </Card>
        {/* Match Selection Card */}
        <Card className="bg-white border-2 border-green-200 shadow-xl rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-green-900">Select Match</CardTitle>
            <CardDescription className="text-gray-700">
              Choose a match to display
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="scheduled">
              <TabsList className="w-full mb-4">
                <TabsTrigger value="scheduled" className="flex-1">Scheduled</TabsTrigger>
                <TabsTrigger value="in-progress" className="flex-1">In Progress</TabsTrigger>
                <TabsTrigger value="completed" className="flex-1">Completed</TabsTrigger>
              </TabsList>
              <TabsContent value="scheduled" className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {isLoadingScheduled ? (
                  <div className="py-8 text-center text-gray-400 font-semibold">Loading matches...</div>
                ) : scheduledMatches && scheduledMatches.length > 0 ? (
                  scheduledMatches.map((match: { id: string; matchNumber: number; status: string; stage?: { name: string } }) => (
                    <div 
                      key={match.id}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all flex flex-col gap-1 shadow-sm ${selectedMatchId === match.id ? 'border-green-500 bg-green-50 ring-2 ring-green-200' : 'border-gray-200 bg-white hover:border-green-400 hover:bg-green-50'}`}
                      onClick={() => handleMatchSelect(match.id)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-lg text-green-900">Match #{match.matchNumber}</span>
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-semibold">
                          {match.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {match.stage?.name}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-gray-400 font-semibold">No scheduled matches found</div>
                )}
              </TabsContent>
              <TabsContent value="in-progress" className="py-8 text-center text-gray-400 font-semibold">
                No matches currently in progress
              </TabsContent>
              <TabsContent value="completed" className="py-8 text-center text-gray-400 font-semibold">
                No completed matches found
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}