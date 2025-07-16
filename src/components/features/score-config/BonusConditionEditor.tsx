import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
            <Label>Bonus Points</Label>
            <Input
              value={item.bonusPoints}
              onChange={e => handleChange(idx, "bonusPoints", Number(e.target.value))}
              disabled={disabled}
              placeholder="Bonus Points"
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
        Add Bonus Condition
      </Button>
    </div>
  );
};

export default BonusConditionEditor; 