import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AdvancementOptions, NextStageConfig } from "@/types/stage-advancement.types";
import { CalendarIcon, Settings, AlertTriangle } from "lucide-react";

interface AdvancementConfigProps {
  initialOptions?: Partial<AdvancementOptions>;
  teamsToAdvance: number;
  maxTeams: number;
  onOptionsChange?: (options: AdvancementOptions) => void;
  className?: string;
}

/**
 * Component for configuring advancement options
 * Implements Single Responsibility Principle - only handles advancement configuration
 */
export function AdvancementConfig({ 
  initialOptions = {},
  teamsToAdvance,
  maxTeams,
  onOptionsChange,
  className = "" 
}: AdvancementConfigProps) {
  
  const [nextStageId, setNextStageId] = useState(initialOptions.nextStageId || "");
  const [createNextStage, setCreateNextStage] = useState(initialOptions.createNextStage || false);
  const [nextStageConfig, setNextStageConfig] = useState<NextStageConfig>(
    initialOptions.nextStageConfig || {
      name: "",
      type: "PLAYOFF",
      startDate: new Date(),
      endDate: new Date(),
      teamsPerAlliance: 2,
    }
  );

  const updateOptions = () => {
    const options: AdvancementOptions = {
      teamsToAdvance,
      ...(nextStageId && { nextStageId }),
      createNextStage,
      ...(createNextStage && { nextStageConfig }),
    };
    onOptionsChange?.(options);
  };

  const handleNextStageConfigChange = (field: keyof NextStageConfig, value: any) => {
    const updated = { ...nextStageConfig, [field]: value };
    setNextStageConfig(updated);
    
    if (createNextStage) {
      const options: AdvancementOptions = {
        teamsToAdvance,
        createNextStage: true,
        nextStageConfig: updated,
      };
      onOptionsChange?.(options);
    }
  };

  const handleCreateNextStageChange = (checked: boolean) => {
    setCreateNextStage(checked);
    
    if (checked) {
      setNextStageId(""); // Clear existing stage selection
    }
    
    const options: AdvancementOptions = {
      teamsToAdvance,
      ...(checked ? { createNextStage: true, nextStageConfig } : { nextStageId }),
    };
    onOptionsChange?.(options);
  };

  const formatDateForInput = (date: Date): string => {
    return date.toISOString().slice(0, 16);
  };

  return (
    <div className={className}>
      <Card className="bg-white border border-gray-200 shadow-lg rounded-xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Settings className="h-5 w-5 text-blue-600" />
            Advancement Configuration
          </CardTitle>
          <CardDescription className="text-gray-600">
            Configure how teams will advance to the next stage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Teams Summary */}
          <Alert className="bg-blue-50 border-blue-200 text-blue-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium">Advancement Summary</div>
              <div className="text-sm mt-1">
                <span className="font-semibold text-blue-900">{teamsToAdvance}</span> out of <span className="font-semibold text-blue-900">{maxTeams}</span> teams will advance to the next stage.
                <br />
                <span className="text-red-600 font-medium">{maxTeams - teamsToAdvance}</span> teams will be eliminated.
              </div>
            </AlertDescription>
          </Alert>

          <Separator className="bg-gray-200" />

          {/* Next Stage Options */}
          <div className="space-y-6">
            <h4 className="font-semibold text-gray-900 text-lg">Next Stage Options</h4>
            
            {/* Option 1: Select Existing Stage */}
            <div className="space-y-3">
              <Label className="text-gray-700 font-medium text-base">Advance to Existing Stage</Label>
              <Select
                value={nextStageId}
                onValueChange={(value) => {
                  setNextStageId(value);
                  setCreateNextStage(false);
                  const options: AdvancementOptions = {
                    teamsToAdvance,
                    nextStageId: value,
                  };
                  onOptionsChange?.(options);
                }}
                disabled={createNextStage}
              >
                <SelectTrigger className={`bg-white border text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg transition-all duration-200 ${createNextStage ? 'border-gray-200 text-gray-400' : 'border-gray-300 hover:border-gray-400'}`}>
                  <SelectValue placeholder="Select an existing stage" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                  <SelectItem value="stage-1" className="text-gray-900 hover:bg-gray-50">
                    Playoff Bracket
                  </SelectItem>
                  <SelectItem value="stage-2" className="text-gray-900 hover:bg-gray-50">
                    Finals
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-center">
              <div className="text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-full font-medium">OR</div>
            </div>

            {/* Option 2: Create New Stage */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="createNextStage"
                  checked={createNextStage}
                  onCheckedChange={handleCreateNextStageChange}
                  className="h-5 w-5"
                />
                <Label htmlFor="createNextStage" className="text-gray-700 font-medium text-base cursor-pointer">
                  Create new stage automatically
                </Label>
              </div>

              {createNextStage && (
                <div className="ml-6 space-y-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="stageName" className="text-gray-700 font-medium">
                        Stage Name
                      </Label>
                      <Input
                        id="stageName"
                        value={nextStageConfig.name}
                        onChange={(e) => handleNextStageConfigChange('name', e.target.value)}
                        placeholder="e.g., Playoff Bracket"
                        className="bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg transition-all duration-200"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="stageType" className="text-gray-700 font-medium">
                        Stage Type
                      </Label>
                      <Select
                        value={nextStageConfig.type}
                        onValueChange={(value: 'SWISS' | 'PLAYOFF' | 'FINAL') => 
                          handleNextStageConfigChange('type', value)
                        }
                      >
                        <SelectTrigger className="bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg transition-all duration-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                          <SelectItem value="SWISS" className="text-gray-900 hover:bg-gray-50">
                            Swiss Tournament
                          </SelectItem>
                          <SelectItem value="PLAYOFF" className="text-gray-900 hover:bg-gray-50">
                            Playoff Bracket
                          </SelectItem>
                          <SelectItem value="FINAL" className="text-gray-900 hover:bg-gray-50">
                            Finals
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="startDate" className="text-gray-700 font-medium flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        Start Date & Time
                      </Label>
                      <Input
                        id="startDate"
                        type="datetime-local"
                        value={formatDateForInput(nextStageConfig.startDate)}
                        onChange={(e) => handleNextStageConfigChange('startDate', new Date(e.target.value))}
                        className="bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg transition-all duration-200"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="endDate" className="text-gray-700 font-medium flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        End Date & Time
                      </Label>
                      <Input
                        id="endDate"
                        type="datetime-local"
                        value={formatDateForInput(nextStageConfig.endDate)}
                        onChange={(e) => handleNextStageConfigChange('endDate', new Date(e.target.value))}
                        className="bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg transition-all duration-200"
                      />
                    </div>

                    <div className="space-y-3 md:col-span-2 lg:col-span-1">
                      <Label htmlFor="teamsPerAlliance" className="text-gray-700 font-medium">
                        Teams per Alliance
                      </Label>
                      <Select
                        value={nextStageConfig.teamsPerAlliance?.toString() || "2"}
                        onValueChange={(value) => 
                          handleNextStageConfigChange('teamsPerAlliance', parseInt(value))
                        }
                      >
                        <SelectTrigger className="bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg w-full transition-all duration-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                          <SelectItem value="2" className="text-gray-900 hover:bg-gray-50">2 teams</SelectItem>
                          <SelectItem value="3" className="text-gray-900 hover:bg-gray-50">3 teams</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
