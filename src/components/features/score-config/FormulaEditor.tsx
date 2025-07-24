import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Calculator, Info, Lightbulb } from "lucide-react";
import { ScoreSection, BonusCondition, PenaltyCondition } from "@/types/score-config";

interface FormulaEditorProps {
  formula: string;
  onChange: (formula: string) => void;
  sections: ScoreSection[];
  disabled?: boolean;
}

const FormulaEditor: React.FC<FormulaEditorProps> = ({ 
  formula, 
  onChange, 
  sections, 
  disabled 
}) => {
  const sectionCodes = sections.map(section => section.code).filter(Boolean);

  const exampleFormulas = [
    {
      formula: "auto + teleop",
      description: "Simple addition of sections"
    },
    {
      formula: "auto * 1.5 + teleop",
      description: "Weighted sections (autonomous worth 1.5x)"
    },
    {
      formula: "auto * 2 + teleop + endgame * 0.5",
      description: "Complex weighted formula with multiple sections"
    },
    {
      formula: "(auto + teleop) * 1.2",
      description: "20% bonus on combined score"
    },
    {
      formula: "auto + teleop + bonus + penalty",
      description: "Include special bonus and penalty sections"
    }
  ];

  const insertSectionCode = (code: string) => {
    if (disabled) return;
    
    const input = document.getElementById('formula-input') as HTMLTextAreaElement;
    if (input) {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const newFormula = formula.substring(0, start) + code + formula.substring(end);
      onChange(newFormula);
      
      // Restore cursor position
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + code.length, start + code.length);
      }, 0);
    } else {
      onChange(formula + code);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-blue-600" />
          Total Score Formula
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="formula-input">Formula Expression</Label>
          <Textarea
            id="formula-input"
            value={formula}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="e.g., auto * 1.5 + teleop (leave empty to sum all sections)"
            rows={3}
            className="font-mono"
          />
          <p className="text-sm text-gray-500 mt-1">
            Use section codes as variables in mathematical expressions. Leave empty to sum all sections.
          </p>
        </div>

        {/* Available Section Variables */}
        {sectionCodes.length > 0 && (
          <div>
            <Label className="text-sm font-medium text-blue-700">📊 Available Section Variables:</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {sectionCodes.map((code) => (
                <Badge
                  key={code}
                  variant="outline"
                  className="cursor-pointer hover:bg-blue-50 hover:border-blue-300 border-blue-200"
                  onClick={() => insertSectionCode(code)}
                >
                  {code}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              💡 Click any section code to insert it into the formula
            </p>
          </div>
        )}

        {/* Formula Examples */}
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Formula Examples:</p>
              <div className="space-y-1">
                {exampleFormulas.map((example, idx) => (
                  <div key={idx} className="text-sm">
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                      {example.formula}
                    </code>
                    <span className="ml-2 text-gray-600">- {example.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Formula Info */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1 text-sm">
              <p><strong>Supported Operations:</strong> +, -, *, /, ( )</p>
              <p><strong>Variables:</strong> Only section codes (e.g., auto, teleop, bonus, penalty)</p>
              <p><strong>Section Scores:</strong> Each section total includes its elements + bonuses + penalties</p>
              <p><strong>Special Sections:</strong> Create sections with codes "bonus" or "penalty" for global conditions</p>
              <p><strong>Default Behavior:</strong> If no formula is provided, all section scores will be summed</p>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default FormulaEditor;
