import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Zap, AlertTriangle } from "lucide-react";

interface Condition {
  field: string;
  operator: string;
  value: string | number;
  logicalOperator?: 'AND' | 'OR';
}

interface ConditionBuilderProps {
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
  type: 'bonus' | 'penalty';
}

const OPERATORS = [
  { value: 'equals', label: 'Equals (=)' },
  { value: 'not_equals', label: 'Not Equals (≠)' },
  { value: 'greater_than', label: 'Greater Than (>)' },
  { value: 'greater_than_equal', label: 'Greater Than or Equal (≥)' },
  { value: 'less_than', label: 'Less Than (<)' },
  { value: 'less_than_equal', label: 'Less Than or Equal (≤)' },
  { value: 'contains', label: 'Contains' },
];

const COMMON_FIELDS = [
  { value: 'total_score', label: 'Total Score' },
  { value: 'time_remaining', label: 'Time Remaining' },
  { value: 'goals_scored', label: 'Goals Scored' },
  { value: 'yellow_cards', label: 'Yellow Cards' },
  { value: 'red_cards', label: 'Red Cards' },
  { value: 'fouls', label: 'Fouls' },
  { value: 'custom', label: 'Custom Field...' },
];

const ConditionBuilder: React.FC<ConditionBuilderProps> = ({ 
  value, 
  onChange, 
  disabled, 
  type 
}) => {
  const [conditions, setConditions] = useState<Condition[]>(() => {
    if (!value || typeof value !== 'object') return [];
    // Try to parse existing condition structure
    if (value.conditions && Array.isArray(value.conditions)) {
      return value.conditions;
    }
    return [];
  });

  const [customField, setCustomField] = useState('');

  const updateConditions = (newConditions: Condition[]) => {
    setConditions(newConditions);
    onChange({
      type: 'complex',
      conditions: newConditions,
    });
  };

  const addCondition = () => {
    const newCondition: Condition = {
      field: '',
      operator: 'equals',
      value: '',
      logicalOperator: conditions.length > 0 ? 'AND' : undefined,
    };
    updateConditions([...conditions, newCondition]);
  };

  const removeCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    // Remove logical operator from first condition if it exists
    if (newConditions.length > 0 && newConditions[0].logicalOperator) {
      newConditions[0] = { ...newConditions[0], logicalOperator: undefined };
    }
    updateConditions(newConditions);
  };

  const updateCondition = (index: number, field: keyof Condition, value: any) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    updateConditions(newConditions);
  };

  const IconComponent = type === 'bonus' ? Zap : AlertTriangle;
  const colorClass = type === 'bonus' ? 'text-green-700' : 'text-red-700';
  const bgColorClass = type === 'bonus' ? 'bg-green-50/50' : 'bg-red-50/50';

  return (
    <div className={`border rounded-lg p-4 ${bgColorClass}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <IconComponent className={`h-4 w-4 ${colorClass}`} />
          <h4 className="font-medium">
            {type === 'bonus' ? 'Bonus' : 'Penalty'} Conditions
          </h4>
        </div>
        {conditions.length > 0 && (
          <span className="text-xs text-gray-500">
            {conditions.length} condition{conditions.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {conditions.map((condition, index) => (
          <Card key={index} className="p-3">
            <div className="space-y-3">
              {/* Logical Operator (for conditions after the first) */}
              {index > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">When</span>
                  <Select
                    value={condition.logicalOperator || 'AND'}
                    onValueChange={(value) => updateCondition(index, 'logicalOperator', value as 'AND' | 'OR')}
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">AND</SelectItem>
                      <SelectItem value="OR">OR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Condition Definition */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <Label>Field</Label>
                  <Select
                    value={condition.field}
                    onValueChange={(value) => {
                      if (value === 'custom') {
                        updateCondition(index, 'field', customField);
                      } else {
                        updateCondition(index, 'field', value);
                      }
                    }}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_FIELDS.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Operator</Label>
                  <Select
                    value={condition.operator}
                    onValueChange={(value) => updateCondition(index, 'operator', value)}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Value</Label>
                  <Input
                    value={condition.value}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Try to convert to number if it's numeric
                      const numVal = Number(val);
                      updateCondition(index, 'value', isNaN(numVal) ? val : numVal);
                    }}
                    disabled={disabled}
                    placeholder="Enter value"
                  />
                </div>

                <div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCondition(index)}
                    disabled={disabled}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Custom field input */}
              {condition.field === 'custom' && (
                <div>
                  <Label>Custom Field Name</Label>
                  <Input
                    value={customField}
                    onChange={(e) => {
                      setCustomField(e.target.value);
                      updateCondition(index, 'field', e.target.value);
                    }}
                    disabled={disabled}
                    placeholder="Enter custom field name"
                  />
                </div>
              )}
            </div>
          </Card>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addCondition}
          disabled={disabled}
          className="w-full border-dashed"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Condition
        </Button>
      </div>

      {/* JSON Preview (for developers) */}
      {conditions.length > 0 && (
        <details className="mt-4">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
            View JSON (for developers)
          </summary>
          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
            {JSON.stringify({ type: 'complex', conditions }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default ConditionBuilder;
