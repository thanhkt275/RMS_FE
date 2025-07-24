import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, AlertTriangle } from "lucide-react";
import ConditionBuilder from "./ConditionBuilder";
import { PenaltyCondition } from "@/types/score-config";

interface PenaltyConditionEditorProps {
  value: PenaltyCondition[];
  onChange: (val: PenaltyCondition[]) => void;
  disabled?: boolean;
}

const emptyPenalty: PenaltyCondition = {
  id: "",
  scoreConfigId: "",
  name: "",
  code: "",
  description: "",
  penaltyPoints: 0,
  condition: {},
  displayOrder: undefined,
};

const PenaltyConditionEditor: React.FC<PenaltyConditionEditorProps> = ({ value, onChange, disabled }) => {
  const handleChange = (idx: number, field: keyof PenaltyCondition, val: any) => {
    const updated = value.map((item, i) =>
      i === idx ? { ...item, [field]: val } : item
    );
    onChange(updated);
  };

  const handleAdd = () => {
    onChange([...value, { ...emptyPenalty }]);
  };

  const handleRemove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      {value.map((item, idx) => (
        <Card key={idx} className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span>Penalty Condition #{idx + 1}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(idx)}
                disabled={disabled}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor={`penalty-name-${idx}`}>Name *</Label>
                <Input
                  id={`penalty-name-${idx}`}
                  value={item.name}
                  onChange={e => handleChange(idx, "name", e.target.value)}
                  disabled={disabled}
                  placeholder="e.g., Red Card Penalty"
                />
              </div>
              <div>
                <Label htmlFor={`penalty-code-${idx}`}>Code *</Label>
                <Input
                  id={`penalty-code-${idx}`}
                  value={item.code}
                  onChange={e => handleChange(idx, "code", e.target.value)}
                  disabled={disabled}
                  placeholder="e.g., RED_CARD"
                />
              </div>
              <div>
                <Label htmlFor={`penalty-points-${idx}`}>Penalty Points *</Label>
                <Input
                  id={`penalty-points-${idx}`}
                  value={item.penaltyPoints}
                  onChange={e => handleChange(idx, "penaltyPoints", Number(e.target.value) || 0)}
                  disabled={disabled}
                  placeholder="-10"
                  type="number"
                  max="-1"
                />
              </div>
            </div>
            
            {/* Second Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`penalty-desc-${idx}`}>Description</Label>
                <Input
                  id={`penalty-desc-${idx}`}
                  value={item.description}
                  onChange={e => handleChange(idx, "description", e.target.value)}
                  disabled={disabled}
                  placeholder="Penalty for receiving red card"
                />
              </div>
              <div>
                <Label htmlFor={`penalty-order-${idx}`}>Display Order</Label>
                <Input
                  id={`penalty-order-${idx}`}
                  value={item.displayOrder ?? ""}
                  onChange={e => handleChange(idx, "displayOrder", e.target.value ? Number(e.target.value) : undefined)}
                  disabled={disabled}
                  placeholder="1"
                  type="number"
                  min="1"
                />
              </div>
            </div>
            
            {/* Condition Builder */}
            <div>
              <Label>Trigger Conditions</Label>
              <ConditionBuilder
                value={item.condition}
                onChange={(condition) => handleChange(idx, "condition", condition)}
                disabled={disabled}
                type="penalty"
              />
            </div>
          </CardContent>
        </Card>
      ))}
      
      <Button 
        type="button" 
        onClick={handleAdd} 
        disabled={disabled} 
        variant="outline"
        className="w-full border-dashed border-2 h-12 text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Penalty Condition
      </Button>
    </div>
  );
};

export default PenaltyConditionEditor; 