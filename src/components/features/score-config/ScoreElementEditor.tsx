import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Target } from "lucide-react";
import { ScoreElement, ElementType } from "@/types/score-config";

interface ScoreElementEditorProps {
  value: ScoreElement[];
  onChange: (val: ScoreElement[]) => void;
  disabled?: boolean;
}

const emptyElement: ScoreElement = {
  id: "",
  scoreConfigId: "",
  name: "",
  code: "",
  description: "",
  pointsPerUnit: 0,
  maxUnits: undefined,
  category: "",
  elementType: "COUNTER",
  displayOrder: undefined,
  icon: "",
  color: "",
};

const ScoreElementEditor: React.FC<ScoreElementEditorProps> = ({ value, onChange, disabled }) => {
  const handleChange = (idx: number, field: keyof ScoreElement, val: any) => {
    const updated = value.map((item, i) =>
      i === idx ? { ...item, [field]: val } : item
    );
    onChange(updated);
  };

  const handleAdd = () => {
    onChange([...value, { ...emptyElement }]);
  };

  const handleRemove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      {value.map((item, idx) => (
        <Card key={idx} className="p-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                <span>Score Element #{idx + 1}</span>
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
            {/* Row 1: Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor={`element-name-${idx}`}>Name *</Label>
                <Input
                  id={`element-name-${idx}`}
                  value={item.name}
                  onChange={e => handleChange(idx, "name", e.target.value)}
                  disabled={disabled}
                  placeholder="e.g., Goals Scored"
                />
              </div>
              <div>
                <Label htmlFor={`element-code-${idx}`}>Code *</Label>
                <Input
                  id={`element-code-${idx}`}
                  value={item.code}
                  onChange={e => handleChange(idx, "code", e.target.value)}
                  disabled={disabled}
                  placeholder="e.g., GOAL"
                />
              </div>
              <div>
                <Label htmlFor={`element-type-${idx}`}>Type</Label>
                <Select
                  value={item.elementType}
                  onValueChange={(val) => handleChange(idx, "elementType", val as ElementType)}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COUNTER">Counter</SelectItem>
                    <SelectItem value="BOOLEAN">Boolean</SelectItem>
                    <SelectItem value="TIMER">Timer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Row 2: Points & Limits */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor={`element-points-${idx}`}>Points Per Unit *</Label>
                <Input
                  id={`element-points-${idx}`}
                  value={item.pointsPerUnit}
                  onChange={e => handleChange(idx, "pointsPerUnit", Number(e.target.value) || 0)}
                  disabled={disabled}
                  placeholder="10"
                  type="number"
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor={`element-max-${idx}`}>Max Units</Label>
                <Input
                  id={`element-max-${idx}`}
                  value={item.maxUnits ?? ""}
                  onChange={e => handleChange(idx, "maxUnits", e.target.value ? Number(e.target.value) : undefined)}
                  disabled={disabled}
                  placeholder="Unlimited"
                  type="number"
                  min="1"
                />
              </div>
              <div>
                <Label htmlFor={`element-order-${idx}`}>Display Order</Label>
                <Input
                  id={`element-order-${idx}`}
                  value={item.displayOrder ?? ""}
                  onChange={e => handleChange(idx, "displayOrder", e.target.value ? Number(e.target.value) : undefined)}
                  disabled={disabled}
                  placeholder="1"
                  type="number"
                  min="1"
                />
              </div>
            </div>
            
            {/* Row 3: Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor={`element-category-${idx}`}>Category</Label>
                <Input
                  id={`element-category-${idx}`}
                  value={item.category}
                  onChange={e => handleChange(idx, "category", e.target.value)}
                  disabled={disabled}
                  placeholder="e.g., Offense"
                />
              </div>
              <div>
                <Label htmlFor={`element-icon-${idx}`}>Icon</Label>
                <Input
                  id={`element-icon-${idx}`}
                  value={item.icon}
                  onChange={e => handleChange(idx, "icon", e.target.value)}
                  disabled={disabled}
                  placeholder="⚽"
                />
              </div>
              <div>
                <Label htmlFor={`element-color-${idx}`}>Color</Label>
                <Input
                  id={`element-color-${idx}`}
                  value={item.color}
                  onChange={e => handleChange(idx, "color", e.target.value)}
                  disabled={disabled}
                  placeholder="#3B82F6"
                  type="color"
                />
              </div>
            </div>
            
            {/* Row 4: Description */}
            <div>
              <Label htmlFor={`element-desc-${idx}`}>Description</Label>
              <Input
                id={`element-desc-${idx}`}
                value={item.description}
                onChange={e => handleChange(idx, "description", e.target.value)}
                disabled={disabled}
                placeholder="Describe how this element is scored..."
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
        className="w-full border-dashed border-2 h-12 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Score Element
      </Button>
    </div>
  );
};

export default ScoreElementEditor;
