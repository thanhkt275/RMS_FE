import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, Layers, Target, GripVertical } from "lucide-react";
import { ScoreSection } from "@/types/score-config";
import ScoreElementEditor from "./ScoreElementEditor";

interface ScoreSectionEditorProps {
  value: ScoreSection[];
  onChange: (val: ScoreSection[]) => void;
  disabled?: boolean;
}

const emptySection: ScoreSection = {
  id: "",
  scoreConfigId: "",
  name: "",
  code: "",
  description: "",
  displayOrder: 0,
  scoreElements: [],
};

const ScoreSectionEditor: React.FC<ScoreSectionEditorProps> = ({ value, onChange, disabled }) => {
  const handleChange = (idx: number, field: keyof ScoreSection, val: any) => {
    const updated = value.map((item, i) =>
      i === idx ? { ...item, [field]: val } : item
    );
    onChange(updated);
  };

  const handleAdd = () => {
    const newSection = { 
      ...emptySection, 
      displayOrder: value.length 
    };
    onChange([...value, newSection]);
  };

  const handleRemove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const moveSection = (fromIndex: number, toIndex: number) => {
    const updatedSections = [...value];
    const [movedSection] = updatedSections.splice(fromIndex, 1);
    updatedSections.splice(toIndex, 0, movedSection);
    
    // Update display orders
    const reorderedSections = updatedSections.map((section, index) => ({
      ...section,
      displayOrder: index
    }));
    
    onChange(reorderedSections);
  };

  return (
    <div className="space-y-6">
      {value.map((section, idx) => (
        <Card key={idx} className="border-2 border-dashed border-blue-200">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between text-xl">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-blue-600">
                  <Layers className="h-5 w-5" />
                  <GripVertical className="h-4 w-4" />
                </div>
                <span>Section #{idx + 1}: {section.name || "Unnamed Section"}</span>
              </div>
              <div className="flex items-center gap-2">
                {idx > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveSection(idx, idx - 1)}
                    disabled={disabled}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ↑
                  </Button>
                )}
                {idx < value.length - 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveSection(idx, idx + 1)}
                    disabled={disabled}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ↓
                  </Button>
                )}
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
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Section Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor={`section-name-${idx}`}>Section Name *</Label>
                <Input
                  id={`section-name-${idx}`}
                  value={section.name}
                  onChange={e => handleChange(idx, "name", e.target.value)}
                  disabled={disabled}
                  placeholder="e.g., Autonomous Period"
                />
              </div>
              <div>
                <Label htmlFor={`section-code-${idx}`}>Section Code *</Label>
                <Input
                  id={`section-code-${idx}`}
                  value={section.code}
                  onChange={e => handleChange(idx, "code", e.target.value)}
                  disabled={disabled}
                  placeholder="e.g., auto"
                />
              </div>
              <div>
                <Label htmlFor={`section-order-${idx}`}>Display Order</Label>
                <Input
                  id={`section-order-${idx}`}
                  value={section.displayOrder}
                  onChange={e => handleChange(idx, "displayOrder", Number(e.target.value) || 0)}
                  disabled={disabled}
                  placeholder="0"
                  type="number"
                  min="0"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor={`section-desc-${idx}`}>Description</Label>
              <Textarea
                id={`section-desc-${idx}`}
                value={section.description || ""}
                onChange={e => handleChange(idx, "description", e.target.value)}
                disabled={disabled}
                placeholder="Describe this scoring section..."
                rows={2}
              />
            </div>

            <Separator />

            {/* Score Elements */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                <h4 className="text-lg font-semibold text-gray-900">Score Elements</h4>
                <span className="text-sm text-gray-500">({section.scoreElements?.length || 0} elements)</span>
              </div>
              
              <ScoreElementEditor
                value={section.scoreElements || []}
                onChange={(val: any) => handleChange(idx, "scoreElements", val)}
                disabled={disabled}
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
        className="w-full border-dashed border-2 h-16 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
      >
        <Plus className="h-5 w-5 mr-2" />
        Add Score Section
      </Button>
    </div>
  );
};

export default ScoreSectionEditor;
