import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BonusPenaltyEditorProps {
  value: any[]; // TODO: type properly
  onChange: (val: any[]) => void;
  disabled?: boolean;
}

const BonusPenaltyEditor: React.FC<BonusPenaltyEditorProps> = ({ value, onChange, disabled }) => {
  const handleChange = (idx: number, field: string, val: string) => {
    const updated = value.map((item, i) =>
      i === idx ? { ...item, [field]: val } : item
    );
    onChange(updated);
  };

  const handleAdd = () => {
    onChange([...value, { type: "", description: "", value: "" }]);
  };

  const handleRemove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-col gap-2">
      {value.map((item, idx) => (
        <div key={idx} className="flex gap-2 items-end">
          <div>
            <Label>Type</Label>
            <Input
              value={item.type}
              onChange={e => handleChange(idx, "type", e.target.value)}
              disabled={disabled}
              placeholder="Bonus or Penalty"
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
            <Label>Value</Label>
            <Input
              value={item.value}
              onChange={e => handleChange(idx, "value", e.target.value)}
              disabled={disabled}
              placeholder="Value"
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
        Add Bonus/Penalty
      </Button>
    </div>
  );
};

export default BonusPenaltyEditor;
