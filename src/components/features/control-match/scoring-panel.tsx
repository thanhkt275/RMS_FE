import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, Save, CheckCircle, Send } from "lucide-react";
import { useAuth } from "@/hooks/common/use-auth";
import { UserRole } from "@/types/user.types";

interface GameElement {
  element: string;
  count: number;
  pointsEach: number;
  totalPoints: number;
  operation: string;
}

interface ScoringPanelProps {
  // Score states
  redAutoScore: number;
  redDriveScore: number;
  blueAutoScore: number;
  blueDriveScore: number;
  redTotalScore: number;
  blueTotalScore: number;
  
  // Penalty states
  redPenalty: number;
  bluePenalty: number;
  
  // Game elements
  redGameElements: GameElement[];
  blueGameElements: GameElement[];
  
  // Team counts and multipliers
  redTeamCount: number;
  blueTeamCount: number;
  redMultiplier: number;
  blueMultiplier: number;
  
  // UI states
  isAddingRedElement: boolean;
  isAddingBlueElement: boolean;
  
  // Setters
  setRedAutoScore: (score: number) => void;
  setRedDriveScore: (score: number) => void;
  setBlueAutoScore: (score: number) => void;
  setBlueDriveScore: (score: number) => void;
  setIsAddingRedElement: (adding: boolean) => void;
  setIsAddingBlueElement: (adding: boolean) => void;
  setRedPenalty: (score: number) => void;
  setBluePenalty: (score: number) => void;
  
  // Actions
  onUpdateScores: () => void;
  onSubmitScores: () => void;

  addRedGameElement: () => void;
  addBlueGameElement: () => void;
  removeGameElement: (alliance: "red" | "blue", index: number) => void;
  updateRedTeamCount: (count: number) => void;
  updateBlueTeamCount: (count: number) => void;
  
  // States
  selectedMatchId: string;
  isLoading?: boolean;
  disabled?: boolean;
}

export function ScoringPanel({
  redAutoScore,
  redDriveScore,
  blueAutoScore,
  blueDriveScore,
  redTotalScore,
  blueTotalScore,
  redGameElements,
  blueGameElements,
  redTeamCount,
  blueTeamCount,
  redMultiplier,
  blueMultiplier,
  isAddingRedElement,
  isAddingBlueElement,
  setRedAutoScore,
  setRedDriveScore,
  setBlueAutoScore,
  setBlueDriveScore,
  setIsAddingRedElement,
  setIsAddingBlueElement,
  onUpdateScores,
  onSubmitScores,

  addRedGameElement,
  addBlueGameElement,
  removeGameElement,
  updateRedTeamCount,
  updateBlueTeamCount,
  selectedMatchId,
  isLoading = false,
  disabled = false,
  redPenalty,
  bluePenalty,
  setRedPenalty,
  setBluePenalty,
}: ScoringPanelProps) {
  const { user } = useAuth();
  const isDisabled = disabled || !selectedMatchId || isLoading;
  const isAllianceReferee = user?.role === UserRole.ALLIANCE_REFEREE;
  const isHeadReferee = user?.role === UserRole.HEAD_REFEREE;
  const isAdmin = user?.role === UserRole.ADMIN;

  return (
    <Card className="bg-white border border-gray-200 shadow-lg rounded-xl p-8 text-gray-700">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 text-center">Match Scoring</h2>
      
      {!selectedMatchId ? (
        <div className="text-center text-gray-600 py-8 bg-gray-50 rounded-lg">
          <div className="text-lg font-medium">No match selected</div>
          <div className="text-sm text-gray-500 mt-2">Select a match to begin scoring</div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Score Input Grid */}
          <div className="grid grid-cols-2 gap-8">
            {/* Red Alliance */}
            <div className="space-y-6 p-6 bg-red-50 rounded-xl border-2 border-red-200">
              <h3 className="text-xl font-bold text-red-800 text-center">Red Alliance</h3>
              
              {/* Team Count */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-800">
                  Team Count
                </label>
                <Select
                  value={redTeamCount.toString()}
                  onValueChange={(value) => updateRedTeamCount(Number(value))}
                  disabled={isDisabled}
                >
                  <SelectTrigger className="bg-white border border-red-300 rounded-lg focus:ring-2 focus:ring-red-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 Teams</SelectItem>
                    <SelectItem value="1">1 Team (1.25x)</SelectItem>
                    <SelectItem value="2">2 Teams (1.5x)</SelectItem>
                    <SelectItem value="3">3 Teams (1.75x)</SelectItem>
                    <SelectItem value="4">4 Teams (2.0x)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-xs text-red-700 mt-1 font-medium">
                  Multiplier: {redMultiplier}x
                </div>
              </div>

              {/* Auto Score */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-800">
                  Autonomous Score
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRedAutoScore(Math.max(0, redAutoScore - 1))}
                    disabled={isDisabled}
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    value={redAutoScore}
                    onChange={(e) => setRedAutoScore(Number(e.target.value) || 0)}
                    disabled={isDisabled}
                    className="text-center bg-white border border-red-300 rounded-lg font-mono text-lg focus:ring-2 focus:ring-red-300"
                    min={0}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRedAutoScore(redAutoScore + 1)}
                    disabled={isDisabled}
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Drive Score */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-800">
                  Teleoperated Score
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRedDriveScore(Math.max(0, redDriveScore - 1))}
                    disabled={isDisabled}
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    value={redDriveScore}
                    onChange={(e) => setRedDriveScore(Number(e.target.value) || 0)}
                    disabled={isDisabled}
                    className="text-center bg-white border border-red-300 rounded-lg font-mono text-lg focus:ring-2 focus:ring-red-300"
                    min={0}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRedDriveScore(redDriveScore + 1)}
                    disabled={isDisabled}
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Game Elements */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-semibold text-gray-800">Game Elements</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingRedElement(true)}
                    disabled={isDisabled}
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>

                {redGameElements.map((element, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200 shadow-sm mb-2">
                    <div className="text-sm">
                      <div className="font-semibold text-gray-900">{element.element}</div>
                      <div className="text-gray-600">
                        {element.count} × {element.pointsEach} = {element.totalPoints}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeGameElement("red", index)}
                      disabled={isDisabled}
                      className="border-red-300 text-red-700 hover:bg-red-100"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                {isAddingRedElement && (
                  <div className="space-y-3 p-4 bg-white border border-red-300 rounded-lg">
                    <Input
                      id="red-element-name"
                      placeholder="Element name"
                      disabled={isDisabled}
                      className="border-red-300 focus:ring-2 focus:ring-red-300"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        id="red-element-count"
                        type="number"
                        placeholder="Count"
                        min={0}
                        disabled={isDisabled}
                        className="border-red-300 focus:ring-2 focus:ring-red-300"
                      />
                      <Input
                        id="red-element-points"
                        type="number"
                        placeholder="Points each"
                        min={0}
                        disabled={isDisabled}
                        className="border-red-300 focus:ring-2 focus:ring-red-300"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={addRedGameElement}
                        disabled={isDisabled}
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        Add
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddingRedElement(false)}
                        disabled={isDisabled}
                        className="border-red-300 text-red-700 hover:bg-red-100"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>              {/* Penalties */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-800">
                  Penalties (Red gives to Blue)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={redPenalty || 0}
                  onChange={(e) => setRedPenalty(Number(e.target.value) || 0)}
                  disabled={isDisabled}
                  className="text-center bg-white border border-red-300 rounded-lg font-mono text-lg focus:ring-2 focus:ring-red-300"
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRedPenalty((redPenalty || 0) + 10)}
                    disabled={isDisabled}
                    className="border-red-300 text-red-700 hover:bg-red-100 flex-1"
                  >
                    +10
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRedPenalty((redPenalty || 0) + 20)}
                    disabled={isDisabled}
                    className="border-red-300 text-red-700 hover:bg-red-100 flex-1"
                  >
                    +20
                  </Button>``
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Blue receives <span className="font-bold text-blue-600">+{redPenalty || 0}</span> points from Red's penalties
                </div>
              </div>

              {/* Total Score */}
              <div className="text-xl font-bold text-red-800 p-4 bg-red-100 rounded-xl border border-red-300 text-center">
                Total Score: {redTotalScore}
              </div>
            </div>

            {/* Blue Alliance */}
            <div className="space-y-6 p-6 bg-blue-50 rounded-xl border-2 border-blue-200">
              <h3 className="text-xl font-bold text-blue-800 text-center">Blue Alliance</h3>
              
              {/* Team Count */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-800">
                  Team Count
                </label>
                <Select
                  value={blueTeamCount.toString()}
                  onValueChange={(value) => updateBlueTeamCount(Number(value))}
                  disabled={isDisabled}
                >
                  <SelectTrigger className="bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 Teams</SelectItem>
                    <SelectItem value="1">1 Team (1.25x)</SelectItem>
                    <SelectItem value="2">2 Teams (1.5x)</SelectItem>
                    <SelectItem value="3">3 Teams (1.75x)</SelectItem>
                    <SelectItem value="4">4 Teams (2.0x)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-xs text-blue-700 mt-1 font-medium">
                  Multiplier: {blueMultiplier}x
                </div>
              </div>

              {/* Auto Score */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-800">
                  Autonomous Score
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBlueAutoScore(Math.max(0, blueAutoScore - 1))}
                    disabled={isDisabled}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    value={blueAutoScore}
                    onChange={(e) => setBlueAutoScore(Number(e.target.value) || 0)}
                    disabled={isDisabled}
                    className="text-center bg-white border border-blue-300 rounded-lg font-mono text-lg focus:ring-2 focus:ring-blue-300"
                    min={0}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBlueAutoScore(blueAutoScore + 1)}
                    disabled={isDisabled}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Drive Score */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-800">
                  Teleoperated Score
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBlueDriveScore(Math.max(0, blueDriveScore - 1))}
                    disabled={isDisabled}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    value={blueDriveScore}
                    onChange={(e) => setBlueDriveScore(Number(e.target.value) || 0)}
                    disabled={isDisabled}
                    className="text-center bg-white border border-blue-300 rounded-lg font-mono text-lg focus:ring-2 focus:ring-blue-300"
                    min={0}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBlueDriveScore(blueDriveScore + 1)}
                    disabled={isDisabled}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Game Elements */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-semibold text-gray-800">Game Elements</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingBlueElement(true)}
                    disabled={isDisabled}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>

                {blueGameElements.map((element, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200 shadow-sm mb-2">
                    <div className="text-sm">
                      <div className="font-semibold text-gray-900">{element.element}</div>
                      <div className="text-gray-600">
                        {element.count} × {element.pointsEach} = {element.totalPoints}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeGameElement("blue", index)}
                      disabled={isDisabled}
                      className="border-blue-300 text-blue-700 hover:bg-blue-100"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                {isAddingBlueElement && (
                  <div className="space-y-3 p-4 bg-white border border-blue-300 rounded-lg">
                    <Input
                      id="blue-element-name"
                      placeholder="Element name"
                      disabled={isDisabled}
                      className="border-blue-300 focus:ring-2 focus:ring-blue-300"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        id="blue-element-count"
                        type="number"
                        placeholder="Count"
                        min={0}
                        disabled={isDisabled}
                        className="border-blue-300 focus:ring-2 focus:ring-blue-300"
                      />
                      <Input
                        id="blue-element-points"
                        type="number"
                        placeholder="Points each"
                        min={0}
                        disabled={isDisabled}
                        className="border-blue-300 focus:ring-2 focus:ring-blue-300"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={addBlueGameElement}
                        disabled={isDisabled}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        Add
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddingBlueElement(false)}
                        disabled={isDisabled}
                        className="border-blue-300 text-blue-700 hover:bg-blue-100"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>              {/* Penalties */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-800">
                  Penalties (Blue gives to Red)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={bluePenalty || 0}
                  onChange={(e) => setBluePenalty(Number(e.target.value) || 0)}
                  disabled={isDisabled}
                  className="text-center bg-white border border-blue-300 rounded-lg font-mono text-lg focus:ring-2 focus:ring-blue-300"
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBluePenalty((bluePenalty || 0) + 10)}
                    disabled={isDisabled}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100 flex-1"
                  >
                    +10
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBluePenalty((bluePenalty || 0) + 20)}
                    disabled={isDisabled}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100 flex-1"
                  >
                    +20
                  </Button>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Red receives <span className="font-bold text-red-600">+{bluePenalty || 0}</span> points from Blue's penalties
                </div>
              </div>

              {/* Total Score */}
              <div className="text-xl font-bold text-blue-800 p-4 bg-blue-100 rounded-xl border border-blue-300 text-center">
                Total Score: {blueTotalScore}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 pt-6 border-t border-gray-200">
            {/* Update Scores - Available to all roles */}
            <Button
              onClick={onUpdateScores}
              disabled={isDisabled}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-md"
              size="lg"
            >
              <Save className="w-5 h-5 mr-2" />
              Update Scores
            </Button>
            

            
            {/* Submit Final Scores - Available only to HEAD_REFEREE and ADMIN */}
            {(isHeadReferee || isAdmin) && (
              <Button
                onClick={onSubmitScores}
                disabled={isDisabled}
                className="bg-green-500 hover:bg-green-600 text-white font-bold shadow-md"
                size="lg"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Submit Final Scores
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
