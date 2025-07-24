"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calculator, 
  PlayCircle, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  Settings,
  Zap,
  Shield,
  Target,
  TrendingUp,
  Info
} from "lucide-react";

// Import score calculation utilities
import { ScoreCalculationEngine } from "@/hooks/score-config/score-calculation";
import { ScoreConfig } from "@/types/score-config";

// Define missing types locally
interface ScoreValidationError {
  code: string;
  message: string;
  field?: string;
  section?: string;
}

interface ScoreConfigError {
  code: string;
  message: string;
  field?: string;
  section?: string;
}

interface ScorePreviewPanelProps {
  /**
   * The current score configuration being edited
   */
  config: {
    totalScoreFormula?: string;
    scoreSections?: any[];
    bonusConditions?: any[];
    penaltyConditions?: any[];
  };
  /**
   * Whether the preview panel is disabled (e.g., during form submission)
   */
  disabled?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

interface SampleScoreInputs {
  [sectionId: string]: {
    [elementId: string]: number;
  };
}

export const ScorePreviewPanel: React.FC<ScorePreviewPanelProps> = ({
  config,
  disabled = false,
  className = "",
}) => {
  // State for sample score inputs
  const [sampleInputs, setSampleInputs] = useState<SampleScoreInputs>({});
  const [calculatedScore, setCalculatedScore] = useState<number>(0);
  const [calculationDetails, setCalculationDetails] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ScoreValidationError[]>([]);
  const [configErrors, setConfigErrors] = useState<ScoreConfigError[]>([]);
  const [activeTab, setActiveTab] = useState("testing");

  // Create calculation engine instance
  const calculationEngine = useMemo(() => new ScoreCalculationEngine(), []);

  // Update sample inputs when config changes
  useEffect(() => {
    if (config.scoreSections) {
      const newInputs: SampleScoreInputs = {};
      config.scoreSections.forEach((section: any) => {
        newInputs[section.id] = {};
        section.elements?.forEach((element: any) => {
          newInputs[section.id][element.id] = 0;
        });
      });
      setSampleInputs(newInputs);
    }
  }, [config.scoreSections]);

  // Calculate score whenever inputs or config change
  useEffect(() => {
    calculateScore();
  }, [sampleInputs, config]);

  const calculateScore = async () => {
    if (!config.scoreSections || disabled) return;

    setIsCalculating(true);
    try {
      // Convert config to the format expected by the calculation engine
      const scoreConfig: any = {
        id: "preview",
        name: "Preview Config",
        totalScoreFormula: config.totalScoreFormula || "",
        scoreSections: config.scoreSections || [],
        scoreElements: [], // Legacy field
        bonusConditions: config.bonusConditions || [],
        penaltyConditions: config.penaltyConditions || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Convert nested sampleInputs to flat ElementScores structure
      const flatElementScores: Record<string, number> = {};
      Object.values(sampleInputs).forEach(sectionInputs => {
        Object.entries(sectionInputs).forEach(([elementId, value]) => {
          flatElementScores[elementId] = value;
        });
      });

      // Calculate the score using the correct method
      const result = calculationEngine.calculateScores(
        scoreConfig.scoreSections || [], 
        flatElementScores, 
        scoreConfig.totalScoreFormula
      );
      setCalculatedScore(result.totalScore);
      setCalculationDetails(result);
    } catch (error) {
      console.error("Score calculation error:", error);
      setCalculatedScore(0);
      setCalculationDetails({ error: error instanceof Error ? error.message : 'Unknown calculation error' });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleInputChange = (sectionId: string, elementId: string, value: number) => {
    setSampleInputs(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [elementId]: value,
      },
    }));
  };

  const resetInputs = () => {
    const resetInputs: SampleScoreInputs = {};
    config.scoreSections?.forEach((section: any) => {
      resetInputs[section.id] = {};
      section.elements?.forEach((element: any) => {
        resetInputs[section.id][element.id] = 0;
      });
    });
    setSampleInputs(resetInputs);
  };

  const generateSampleData = () => {
    const sampleInputs: SampleScoreInputs = {};
    config.scoreSections?.forEach((section: any) => {
      sampleInputs[section.id] = {};
      section.elements?.forEach((element: any) => {
        // Generate random sample values based on element type
        const randomValue = Math.floor(Math.random() * 10) + 1;
        sampleInputs[section.id][element.id] = randomValue;
      });
    });
    setSampleInputs(sampleInputs);
  };

  // Validation functions
  const validateConfig = () => {
    const errors: ScoreConfigError[] = [];
    
    if (!config.scoreSections || config.scoreSections.length === 0) {
      errors.push({
        code: 'NO_SECTIONS',
        message: 'At least one score section is required',
        field: 'scoreSections'
      });
    }
    
    config.scoreSections?.forEach((section, index) => {
      if (!section.name || section.name.trim() === '') {
        errors.push({
          code: 'MISSING_SECTION_NAME',
          message: `Section ${index + 1} is missing a name`,
          field: 'scoreSections',
          section: section.id
        });
      }
      
      if (!section.elements || section.elements.length === 0) {
        errors.push({
          code: 'NO_ELEMENTS',
          message: `Section "${section.name || 'Unnamed'}" has no score elements`,
          field: 'scoreSections',
          section: section.id
        });
      }
    });
    
    if (config.totalScoreFormula && config.totalScoreFormula.trim() !== '') {
      // Basic formula validation
      const formula = config.totalScoreFormula;
      const sectionCodes = config.scoreSections?.map(s => s.code || s.id) || [];
      
      sectionCodes.forEach(code => {
        if (!formula.includes(code)) {
          errors.push({
            code: 'UNUSED_SECTION',
            message: `Section "${code}" is not used in the formula`,
            field: 'totalScoreFormula'
          });
        }
      });
    }
    
    setConfigErrors(errors);
    return errors.length === 0;
  };
  
  useEffect(() => {
    validateConfig();
  }, [config]);

  // Render validation status
  const renderValidationStatus = () => {
    const isValid = configErrors.length === 0;
    return (
      <div className="flex items-center gap-2 mb-4">
        {isValid ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700 font-medium">Configuration Valid</span>
          </>
        ) : (
          <>
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-700 font-medium">
              {configErrors.length} validation error{configErrors.length > 1 ? 's' : ''}
            </span>
          </>
        )}
      </div>
    );
  };

  // Render testing interface
  const renderTestingInterface = () => (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex gap-2 mb-4">
        <Button
          size="sm"
          variant="outline"
          onClick={generateSampleData}
          disabled={disabled || !config.scoreSections?.length}
        >
          <PlayCircle className="h-4 w-4 mr-1" />
          Generate Sample Data
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={resetInputs}
          disabled={disabled}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Reset
        </Button>
      </div>

      {/* Score Inputs */}
      {config.scoreSections && config.scoreSections.length > 0 ? (
        <div className="space-y-4">
          {config.scoreSections.map((section: any) => (
            <div key={section.id} className="p-4 border rounded-lg bg-slate-50">
              <h4 className="font-semibold text-sm mb-3 text-slate-700">
                {section.name || section.id}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {section.elements?.map((element: any) => (
                  <div key={element.id} className="space-y-1">
                    <Label htmlFor={`${section.id}-${element.id}`} className="text-xs">
                      {element.name || element.id}
                    </Label>
                    <Input
                      id={`${section.id}-${element.id}`}
                      type="number"
                      value={sampleInputs[section.id]?.[element.id] || 0}
                      onChange={(e) =>
                        handleInputChange(section.id, element.id, parseInt(e.target.value) || 0)
                      }
                      disabled={disabled}
                      className="h-8 text-sm"
                      min="0"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500">
          <Calculator className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Add score sections to see the preview</p>
        </div>
      )}

      <Separator />

      {/* Calculation Results */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Total Score:</span>
          <Badge variant="secondary" className="text-lg font-bold px-3 py-1">
            {calculatedScore}
          </Badge>
        </div>

        {/* Calculation Breakdown */}
        {calculationDetails && !calculationDetails.error && (
          <div className="mt-3 space-y-2">
            <div className="text-xs text-slate-600">
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(calculationDetails.sectionScores || {}).map(([sectionId, score]) => (
                  <div key={sectionId} className="flex justify-between">
                    <span>{sectionId}:</span>
                    <span className="font-mono">{score as number}</span>
                  </div>
                ))}
              </div>
              {calculationDetails.bonusScore > 0 && (
                <div className="flex justify-between text-green-600 pt-1 border-t mt-2">
                  <span>Bonus:</span>
                  <span className="font-mono">+{calculationDetails.bonusScore}</span>
                </div>
              )}
              {calculationDetails.penaltyScore > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Penalty:</span>
                  <span className="font-mono">-{calculationDetails.penaltyScore}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {calculationDetails?.error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
            <strong>Calculation Error:</strong> {calculationDetails.error}
          </div>
        )}
      </div>

      {/* Formula Display */}
      {config.totalScoreFormula && (
        <div className="mt-4 p-3 bg-slate-100 rounded-lg">
          <Label className="text-xs text-slate-600 mb-1 block">Current Formula:</Label>
          <code className="text-xs font-mono text-slate-800 break-all">
            {config.totalScoreFormula}
          </code>
        </div>
      )}
    </div>
  );

  // Render control panel preview
  const renderControlPanelPreview = () => (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This shows how the scoring panel will appear to referees during matches.
        </AlertDescription>
      </Alert>
      
      <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 bg-slate-50/50">
        <div className="text-center mb-6">
          <h3 className="text-lg font-bold text-slate-800">Match Scoring Panel</h3>
          <p className="text-sm text-slate-600">Alliance: <span className="text-red-600 font-bold">RED</span></p>
        </div>
        
        {config.scoreSections && config.scoreSections.length > 0 ? (
          <div className="grid gap-4">
            {config.scoreSections.map((section: any) => (
              <Card key={section.id} className="p-4">
                <CardHeader className="pb-2 p-0">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4 text-red-600" />
                    {section.name || section.id}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 pt-2">
                  <div className="grid grid-cols-3 gap-2">
                    {section.elements?.slice(0, 6).map((element: any) => (
                      <div key={element.id} className="text-center p-2 border rounded bg-white">
                        <div className="text-xs text-slate-600 mb-1">{element.name || element.id}</div>
                        <div className="text-lg font-bold text-slate-800">0</div>
                        <div className="text-xs text-slate-500">+{element.pointsPerUnit || 1} pts</div>
                      </div>
                    ))}
                    {section.elements?.length > 6 && (
                      <div className="text-center p-2 border rounded bg-slate-100 text-slate-500">
                        <div className="text-xs mb-1">+{section.elements.length - 6} more</div>
                        <div className="text-sm">...</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <Eye className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No sections configured</p>
          </div>
        )}
        
        {/* Sample scoring summary */}
        <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-rose-50 rounded-lg border border-red-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-red-800">Alliance Total:</span>
            <Badge variant="destructive" className="text-lg font-bold px-3 py-1">
              {calculatedScore}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );

  // Render validation errors
  const renderValidationErrors = () => (
    <div className="space-y-4">
      {configErrors.length === 0 ? (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            ✅ Configuration is valid and ready to use!
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Found {configErrors.length} validation error{configErrors.length > 1 ? 's' : ''}. Please fix these issues before saving.
            </AlertDescription>
          </Alert>
          
          {configErrors.map((error, index) => (
            <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-red-800">{error.code}</div>
                  <div className="text-sm text-red-700">{error.message}</div>
                  {error.field && (
                    <div className="text-xs text-red-600 mt-1">Field: {error.field}</div>
                  )}
                  {error.section && (
                    <div className="text-xs text-red-600">Section: {error.section}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Helpful suggestions */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
          <Info className="h-4 w-4" />
          Suggestions for a better configuration:
        </h4>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Include meaningful names for all sections and elements</li>
          <li>Ensure your formula uses all defined sections</li>
          <li>Set appropriate point values for each element</li>
          <li>Consider adding bonus/penalty conditions for dynamic scoring</li>
          <li>Test with various score combinations to verify calculations</li>
        </ul>
      </div>
    </div>
  );

  // Render analytics
  const renderAnalytics = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Sections</span>
            </div>
            <div className="text-2xl font-bold">{config.scoreSections?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Elements</span>
            </div>
            <div className="text-2xl font-bold">
              {config.scoreSections?.reduce((total, section) => total + (section.elements?.length || 0), 0) || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">Bonuses</span>
            </div>
            <div className="text-2xl font-bold">{config.bonusConditions?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">Penalties</span>
            </div>
            <div className="text-2xl font-bold">{config.penaltyConditions?.length || 0}</div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Score Potential Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {config.scoreSections?.map((section: any) => {
              const maxScore = section.elements?.reduce((total: number, element: any) => 
                total + ((element.maxValue || 10) * (element.pointsPerUnit || 1)), 0) || 0;
              
              return (
                <div key={section.id} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                  <span className="text-sm font-medium">{section.name || section.id}</span>
                  <span className="text-sm text-slate-600">Max: {maxScore} pts</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-blue-600" />
          Score Configuration Preview
          {isCalculating && (
            <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
          )}
        </CardTitle>
        {renderValidationStatus()}
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="testing" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Testing
            </TabsTrigger>
            <TabsTrigger value="control-panel" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Control Panel
            </TabsTrigger>
            <TabsTrigger value="validation" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Validation
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="testing">
            {renderTestingInterface()}
          </TabsContent>

          <TabsContent value="control-panel">
            {renderControlPanelPreview()}
          </TabsContent>

          <TabsContent value="validation">
            {renderValidationErrors()}
          </TabsContent>

          <TabsContent value="analytics">
            {renderAnalytics()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ScorePreviewPanel;
