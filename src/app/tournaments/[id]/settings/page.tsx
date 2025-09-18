"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { TournamentService } from "@/services/tournament.service";
import { useTournamentSettings } from "@/hooks/tournaments/use-tournament-mutations";
import { useTournamentManagement } from "@/hooks/api/use-tournament-management";
import { toast } from "sonner";

export default function TournamentSettingsPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { tournament, isLoading } = useTournamentManagement(id);
  const { updateSettings } = useTournamentSettings(id);

  const [settings, setSettings] = useState({
    maxTeams: tournament?.maxTeams || undefined,
    maxTeamMembers: tournament?.maxTeamMembers || undefined,
  });

  const handleSave = async () => {
    try {
      // Only save fields that are actually supported by the backend
      const validSettings = {
        maxTeams: settings.maxTeams,
        maxTeamMembers: settings.maxTeamMembers,
      };
      await updateSettings.mutateAsync(validSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      // Error toast is handled by the mutation hook
    }
  };

  const handleReset = () => {
    setSettings({
      maxTeams: tournament?.maxTeams || undefined,
      maxTeamMembers: tournament?.maxTeamMembers || undefined,
    });
  };

  // Update settings when tournament data loads
  useEffect(() => {
    if (tournament) {
      setSettings(prev => ({
        ...prev,
        maxTeams: tournament.maxTeams || undefined,
        maxTeamMembers: tournament.maxTeamMembers || undefined,
      }));
    }
  }, [tournament]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-3 sm:mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600">Loading tournament settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="w-full sm:w-auto min-h-[44px] touch-target"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 line-clamp-1">Tournament Settings</h1>
              <p className="text-sm sm:text-base text-gray-600 line-clamp-1">{tournament?.name}</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={handleReset}
              className="w-full sm:w-auto min-h-[44px] touch-target"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={updateSettings.isPending}
              className="w-full sm:w-auto min-h-[44px] touch-target"
            >
              <Save className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{updateSettings.isPending ? 'Saving...' : 'Save Changes'}</span>
              <span className="sm:hidden">{updateSettings.isPending ? 'Saving...' : 'Save'}</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* General Settings */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Team Registration Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
              <div className="space-y-2">
                <Label htmlFor="maxTeams" className="text-sm sm:text-base">Maximum Teams</Label>
                <Input
                  id="maxTeams"
                  type="number"
                  min="1"
                  placeholder="No limit"
                  value={settings.maxTeams || ''}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    maxTeams: e.target.value ? Math.max(1, parseInt(e.target.value)) : undefined
                  }))}
                  className="min-h-[44px] touch-target"
                />
                <p className="text-xs sm:text-sm text-gray-600">
                  Set the maximum number of teams that can register for this tournament. Leave empty for no limit.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxTeamMembers" className="text-sm sm:text-base">Maximum Team Members</Label>
                <Input
                  id="maxTeamMembers"
                  type="number"
                  min="1"
                  placeholder="No limit"
                  value={settings.maxTeamMembers || ''}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    maxTeamMembers: e.target.value ? Math.max(1, parseInt(e.target.value)) : undefined
                  }))}
                  className="min-h-[44px] touch-target"
                />
                <p className="text-xs sm:text-sm text-gray-600">
                  Set the maximum number of members per team. Leave empty for no limit.
                </p>
              </div>

              {/* Current Status Display */}
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 text-sm sm:text-base">Current Status</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 bg-blue-50 rounded-lg">
                    <div className="text-xs sm:text-sm font-medium text-blue-900">Teams Registered</div>
                    <div className="text-xl sm:text-2xl font-bold text-blue-600">
                      {tournament?._count?.teams || 0}
                      {settings.maxTeams && ` / ${settings.maxTeams}`}
                    </div>
                  </div>
                  <div className="p-3 sm:p-4 bg-green-50 rounded-lg">
                    <div className="text-xs sm:text-sm font-medium text-green-900">Registration Status</div>
                    <div className="text-base sm:text-lg font-medium text-green-600">
                      {settings.maxTeams && tournament?._count?.teams && tournament._count.teams >= settings.maxTeams 
                        ? 'Full' 
                        : 'Open'
                      }
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Information Card */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Additional Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
              <div className="p-3 sm:p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2 text-sm sm:text-base">Future Features</h4>
                <p className="text-xs sm:text-sm text-blue-700">
                  Additional tournament settings like referee assignments, scoring configurations, 
                  and notification preferences will be available in future updates. For now, you can 
                  manage these through their respective dedicated pages.
                </p>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 text-sm sm:text-base">Quick Links</h4>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start min-h-[44px] touch-target"
                    onClick={() => router.push(`/tournaments/${id}/teams`)}
                  >
                    Manage Teams
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start min-h-[44px] touch-target"
                    onClick={() => router.push(`/tournaments/${id}/stages`)}
                  >
                    Manage Stages
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start min-h-[44px] touch-target"
                    onClick={() => router.push(`/tournaments/${id}/fields`)}
                  >
                    Manage Fields & Referees
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
