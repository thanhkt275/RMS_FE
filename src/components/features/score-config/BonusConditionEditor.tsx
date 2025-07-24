import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Zap } from "lucide-react";
import ConditionBuilder from "./ConditionBuilder";
import { BonusCondition } from "@/types/score-config";

interface BonusConditionEditorProps {
  value: BonusCondition[];
  onChange: (val: BonusCondition[]) => void;
  disabled?: boolean;
}

const emptyBonus: BonusCondition = {
  id: "",
  scoreConfigId: "",
  name: "",
  code: "",
  description: "",
  bonusPoints: 0,
  condition: {},
  displayOrder: undefined,
};

const BonusConditionEditor: React.FC<BonusConditionEditorProps> = ({ value, onChange, disabled }) => {
  const handleChange = (idx: number, field: keyof BonusCondition, val: any) => {
    const updated = value.map((item, i) =>
      i === idx ? { ...item, [field]: val } : item
    );
    onChange(updated);
  };

  const handleAdd = () => {
    onChange([...value, { ...emptyBonus }]);
  };

  const handleRemove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      {value.map((item, idx) => (
        <Card key={idx} className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-600" />
                <span>Bonus Condition #{idx + 1}</span>
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
                <Label htmlFor={`bonus-name-${idx}`}>Name *</Label>
                <Input
                  id={`bonus-name-${idx}`}
                  value={item.name}
                  onChange={e => handleChange(idx, "name", e.target.value)}
                  disabled={disabled}
                  placeholder="e.g., Hat Trick Bonus"
                />
              </div>
              <div>
                <Label htmlFor={`bonus-code-${idx}`}>Code *</Label>
                <Input
                  id={`bonus-code-${idx}`}
                  value={item.code}
                  onChange={e => handleChange(idx, "code", e.target.value)}
                  disabled={disabled}
                  placeholder="e.g., HAT_TRICK"
                />
              </div>
              <div>
                <Label htmlFor={`bonus-points-${idx}`}>Bonus Points *</Label>
                <Input
                  id={`bonus-points-${idx}`}
                  value={item.bonusPoints}
                  onChange={e => handleChange(idx, "bonusPoints", Number(e.target.value) || 0)}
                  disabled={disabled}
                  placeholder="50"
                  type="number"
                  min="1"
                />
              </div>
            </div>
            
            {/* Second Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`bonus-desc-${idx}`}>Description</Label>
                <Input
                  id={`bonus-desc-${idx}`}
                  value={item.description}
                  onChange={e => handleChange(idx, "description", e.target.value)}
                  disabled={disabled}
                  placeholder="Bonus for scoring 3+ goals"
                />
              </div>
              <div>
                <Label htmlFor={`bonus-order-${idx}`}>Display Order</Label>
                <Input
                  id={`bonus-order-${idx}`}
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
                type="bonus"
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
        className="w-full border-dashed border-2 h-12 text-green-600 hover:text-green-700 hover:bg-green-50"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Bonus Condition
      </Button>
    </div>
  );
};

export default BonusConditionEditor; 