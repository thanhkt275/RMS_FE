import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { TeamRanking } from "@/types/stage-advancement.types";
import { RankingsTable } from "./rankings-table";
import { Users, Trophy, ArrowRight } from "lucide-react";

interface AdvancementPreviewProps {
  rankings: TeamRanking[];
  initialTeamsToAdvance?: number;
  maxTeams?: number;
  onTeamsToAdvanceChange?: (count: number) => void;
  className?: string;
}

/**
 * Component to preview which teams would advance
 * Implements Single Responsibility Principle - only handles advancement preview
 */
export function AdvancementPreview({ 
  rankings, 
  initialTeamsToAdvance = Math.ceil(rankings.length / 2),
  maxTeams = rankings.length,
  onTeamsToAdvanceChange,
  className = "" 
}: AdvancementPreviewProps) {
  
  const [teamsToAdvance, setTeamsToAdvance] = useState(
    Math.min(initialTeamsToAdvance, maxTeams)
  );

  const handleTeamsToAdvanceChange = (newCount: number) => {
    const validCount = Math.max(1, Math.min(newCount, maxTeams));
    setTeamsToAdvance(validCount);
    onTeamsToAdvanceChange?.(validCount);
  };

  const advancingTeams = rankings.slice(0, teamsToAdvance);
  const eliminatedTeams = rankings.slice(teamsToAdvance);

  return (
    <div className={className}>
      <Card className="bg-white border border-gray-200 shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Advancement Preview
          </CardTitle>
          <CardDescription className="text-gray-600">
            Preview which teams will advance to the next stage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Teams to Advance Input */}
          <div className="space-y-2">
            <Label htmlFor="teamsToAdvance" className="text-gray-700 font-medium">
              Number of teams to advance
            </Label>
            <div className="flex items-center gap-4">
              <Input
                id="teamsToAdvance"
                type="number"
                min={1}
                max={maxTeams}
                value={teamsToAdvance}
                onChange={(e) => handleTeamsToAdvanceChange(Number(e.target.value))}
                className="w-32 bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg"
              />
              <div className="text-sm text-gray-600">
                out of {rankings.length} teams
              </div>
            </div>
            
            {/* Quick selection buttons */}
            <div className="flex gap-2 flex-wrap">
              {[
                { label: "Top 25%", value: Math.ceil(rankings.length * 0.25) },
                { label: "Top 50%", value: Math.ceil(rankings.length * 0.5) },
                { label: "Top 75%", value: Math.ceil(rankings.length * 0.75) },
              ].map(({ label, value }) => (
                <Button
                  key={label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleTeamsToAdvanceChange(value)}
                  className={`border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 rounded-lg ${
                    teamsToAdvance === value ? 'bg-blue-50 border-blue-300 text-blue-700' : ''
                  }`}
                >
                  {label} ({value})
                </Button>
              ))}
            </div>
          </div>

          <Separator className="bg-gray-200" />

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Advancing</span>
              </div>
              <div className="text-2xl font-bold text-green-900">{advancingTeams.length}</div>
              <div className="text-xs text-green-700">
                {((advancingTeams.length / rankings.length) * 100).toFixed(1)}% of teams
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">Eliminated</span>
              </div>
              <div className="text-2xl font-bold text-red-900">{eliminatedTeams.length}</div>
              <div className="text-xs text-red-700">
                {((eliminatedTeams.length / rankings.length) * 100).toFixed(1)}% of teams
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <ArrowRight className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Cut Line</span>
              </div>
              <div className="text-sm font-bold text-blue-900">
                After Rank #{teamsToAdvance}
              </div>
              <div className="text-xs text-blue-700">
                {teamsToAdvance < rankings.length ? 
                  `Next: ${rankings[teamsToAdvance]?.teamNumber || 'N/A'}` : 
                  'All teams advance'
                }
              </div>
            </div>
          </div>

          <Separator className="bg-gray-200" />

          {/* Rankings Table with Highlighting */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">Team Rankings</h4>
              <div className="flex gap-2">
                <Badge className="bg-green-100 text-green-800 border-green-300">
                  Advancing
                </Badge>
                <Badge variant="outline" className="border-gray-300 text-gray-600">
                  Eliminated
                </Badge>
              </div>
            </div>
            
            <RankingsTable 
              rankings={rankings} 
              highlightAdvancing={teamsToAdvance}
              className="border border-gray-200 rounded-lg overflow-hidden"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
