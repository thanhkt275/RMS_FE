import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="flex flex-col gap-2">
      {value.map((item, idx) => (
        <div key={idx} className="flex gap-2 items-end flex-wrap">
          <div>
            <Label>Name</Label>
            <Input
              value={item.name}
              onChange={e => handleChange(idx, "name", e.target.value)}
              disabled={disabled}
              placeholder="Element Name"
            />
          </div>
          <div>
            <Label>Code</Label>
            <Input
              value={item.code}
              onChange={e => handleChange(idx, "code", e.target.value)}
              disabled={disabled}
              placeholder="Code"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={item.description}
              onChange={e => handleChange(idx, "description", e.target.value)}
              disabled={disabled}
              placeholder="Description"
            />
          </div>
          <div>
            <Label>Points Per Unit</Label>
            <Input
              value={item.pointsPerUnit}
              onChange={e => handleChange(idx, "pointsPerUnit", Number(e.target.value))}
              disabled={disabled}
              placeholder="Points Per Unit"
              type="number"
            />
          </div>
          <div>
            <Label>Max Units</Label>
            <Input
              value={item.maxUnits ?? ""}
              onChange={e => handleChange(idx, "maxUnits", e.target.value ? Number(e.target.value) : undefined)}
              disabled={disabled}
              placeholder="Max Units"
              type="number"
            />
          </div>
          <div>
            <Label>Category</Label>
            <Input
              value={item.category}
              onChange={e => handleChange(idx, "category", e.target.value)}
              disabled={disabled}
              placeholder="Category"
            />
          </div>
          <div>
            <Label>Element Type</Label>
            <select
              value={item.elementType}
              onChange={e => handleChange(idx, "elementType", e.target.value as ElementType)}
              disabled={disabled}
            >
              <option value="COUNTER">COUNTER</option>
              <option value="BOOLEAN">BOOLEAN</option>
              <option value="TIMER">TIMER</option>
            </select>
          </div>
          <div>
            <Label>Display Order</Label>
            <Input
              value={item.displayOrder ?? ""}
              onChange={e => handleChange(idx, "displayOrder", e.target.value ? Number(e.target.value) : undefined)}
              disabled={disabled}
              placeholder="Display Order"
              type="number"
            />
          </div>
          <div>
            <Label>Icon</Label>
            <Input
              value={item.icon}
              onChange={e => handleChange(idx, "icon", e.target.value)}
              disabled={disabled}
              placeholder="Icon"
            />
          </div>
          <div>
            <Label>Color</Label>
            <Input
              value={item.color}
              onChange={e => handleChange(idx, "color", e.target.value)}
              disabled={disabled}
              placeholder="Color"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            onClick={() => handleRemove(idx)}
            disabled={disabled}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button type="button" onClick={handleAdd} disabled={disabled} variant="secondary">
        Add Score Element
      </Button>
    </div>
  );
};

export default ScoreElementEditor;
