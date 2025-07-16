import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="flex flex-col gap-2">
      {value.map((item, idx) => (
        <div key={idx} className="flex gap-2 items-end flex-wrap">
          <div>
            <Label>Name</Label>
            <Input
              value={item.name}
              onChange={e => handleChange(idx, "name", e.target.value)}
              disabled={disabled}
              placeholder="Name"
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
            <Label>Penalty Points</Label>
            <Input
              value={item.penaltyPoints}
              onChange={e => handleChange(idx, "penaltyPoints", Number(e.target.value))}
              disabled={disabled}
              placeholder="Penalty Points"
              type="number"
            />
          </div>
          <div>
            <Label>Condition (JSON)</Label>
            <Input
              value={JSON.stringify(item.condition)}
              onChange={e => handleChange(idx, "condition", e.target.value ? JSON.parse(e.target.value) : {})}
              disabled={disabled}
              placeholder="Condition as JSON"
            />
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
        Add Penalty Condition
      </Button>
    </div>
  );
};

export default PenaltyConditionEditor; 