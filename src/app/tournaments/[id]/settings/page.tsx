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
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tournament Settings</h1>
              <p className="text-gray-600">{tournament?.name}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={updateSettings.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Team Registration Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="maxTeams">Maximum Teams</Label>
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
                />
                <p className="text-sm text-gray-600">
                  Set the maximum number of teams that can register for this tournament. Leave empty for no limit.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxTeamMembers">Maximum Team Members</Label>
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
                />
                <p className="text-sm text-gray-600">
                  Set the maximum number of members per team. Leave empty for no limit.
                </p>
              </div>

              {/* Current Status Display */}
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Current Status</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm font-medium text-blue-900">Teams Registered</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {tournament?._count?.teams || 0}
                      {settings.maxTeams && ` / ${settings.maxTeams}`}
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-sm font-medium text-green-900">Registration Status</div>
                    <div className="text-lg font-medium text-green-600">
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
            <CardHeader>
              <CardTitle>Additional Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Future Features</h4>
                <p className="text-sm text-blue-700">
                  Additional tournament settings like referee assignments, scoring configurations, 
                  and notification preferences will be available in future updates. For now, you can 
                  manage these through their respective dedicated pages.
                </p>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Quick Links</h4>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => router.push(`/tournaments/${id}/teams`)}
                  >
                    Manage Teams
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => router.push(`/tournaments/${id}/stages`)}
                  >
                    Manage Stages
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
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
