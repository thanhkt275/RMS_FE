import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Minus, Timer, Check, X } from 'lucide-react';
import { ElementType, ScoreElementProps } from '@/types/score-config.types';

const ScoreElement: React.FC<ScoreElementProps> = ({
  element,
  value,
  onChange,
  disabled = false,
  readonly = false,
  allianceColor
}) => {
  const isDisabled = disabled || readonly;
  const colorClasses = {
    RED: {
      border: 'border-red-300',
      background: 'bg-red-50',
      button: 'border-red-300 text-red-700 hover:bg-red-100',
      focus: 'focus:ring-2 focus:ring-red-300',
      accent: 'text-red-800'
    },
    BLUE: {
      border: 'border-blue-300',
      background: 'bg-blue-50',
      button: 'border-blue-300 text-blue-700 hover:bg-blue-100',
      focus: 'focus:ring-2 focus:ring-blue-300',
      accent: 'text-blue-800'
    }
  };

  const colors = colorClasses[allianceColor];

  const renderCounter = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-800">{element.name}</label>
        <div className="text-xs text-gray-600">
          {element.pointsPerUnit} pts each
        </div>
      </div>
      
      {element.description && (
        <div className="text-xs text-gray-500 mb-2">{element.description}</div>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(Math.max(element.minValue || 0, value - 1))}
          disabled={isDisabled || value <= (element.minValue || 0)}
          className={`${colors.button} disabled:opacity-50`}
        >
          <Minus className="w-4 h-4" />
        </Button>
        
        <Input
          type="number"
          value={value}
          onChange={(e) => {
            const newValue = Number(e.target.value) || 0;
            const clampedValue = Math.min(
              Math.max(newValue, element.minValue || 0),
              element.maxValue || 999
            );
            onChange(clampedValue);
          }}
          disabled={isDisabled}
          className={`text-center font-mono text-lg ${colors.border} ${colors.focus} bg-white`}
          min={element.minValue || 0}
          max={element.maxValue || 999}
        />
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(Math.min(element.maxValue || 999, value + 1))}
          disabled={isDisabled || value >= (element.maxValue || 999)}
          className={`${colors.button} disabled:opacity-50`}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="text-center text-sm font-medium text-gray-700">
        Total: <span className={colors.accent}>{value * element.pointsPerUnit} points</span>
      </div>
    </div>
  );

  const renderBoolean = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-800">{element.name}</label>
        <div className="text-xs text-gray-600">
          {element.pointsPerUnit} pts
        </div>
      </div>
      
      {element.description && (
        <div className="text-xs text-gray-500 mb-2">{element.description}</div>
      )}

      <div className="flex items-center justify-center gap-4 p-4 bg-white rounded-lg border">
        <Button
          variant={value === 0 ? "outline" : "default"}
          size="sm"
          onClick={() => onChange(0)}
          disabled={isDisabled}
          className={`flex items-center gap-2 ${value === 0 ? colors.button : `bg-gray-200 text-gray-700`}`}
        >
          <X className="w-4 h-4" />
          No
        </Button>
        
        <Button
          variant={value === 1 ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(1)}
          disabled={isDisabled}
          className={`flex items-center gap-2 ${value === 1 ? `bg-green-500 text-white hover:bg-green-600` : colors.button}`}
        >
          <Check className="w-4 h-4" />
          Yes
        </Button>
      </div>

      {value === 1 && (
        <div className="text-center text-sm font-medium text-gray-700">
          <span className={colors.accent}>+{element.pointsPerUnit} points</span>
        </div>
      )}
    </div>
  );

  const renderTimer = () => {
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-gray-800">{element.name}</label>
          <div className="text-xs text-gray-600">
            {element.pointsPerUnit} pts/sec
          </div>
        </div>
        
        {element.description && (
          <div className="text-xs text-gray-500 mb-2">{element.description}</div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange(Math.max(0, value - 1))}
            disabled={isDisabled || value <= 0}
            className={colors.button}
          >
            <Minus className="w-4 h-4" />
          </Button>
          
          <div className={`flex-1 text-center font-mono text-xl p-3 bg-white rounded-lg border ${colors.border}`}>
            <Timer className="w-5 h-5 inline mr-2" />
            {formatTime(value)}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange(Math.min(element.maxValue || 300, value + 1))}
            disabled={isDisabled || value >= (element.maxValue || 300)}
            className={colors.button}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange(value + 5)}
            disabled={isDisabled}
            className={`${colors.button} flex-1`}
          >
            +5s
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange(value + 10)}
            disabled={isDisabled}
            className={`${colors.button} flex-1`}
          >
            +10s
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange(value + 30)}
            disabled={isDisabled}
            className={`${colors.button} flex-1`}
          >
            +30s
          </Button>
        </div>

        <div className="text-center text-sm font-medium text-gray-700">
          Total: <span className={colors.accent}>{value * element.pointsPerUnit} points</span>
        </div>
      </div>
    );
  };

  const renderSelect = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-800">{element.name}</label>
        <div className="text-xs text-gray-600">
          {element.pointsPerUnit} pts
        </div>
      </div>
      
      {element.description && (
        <div className="text-xs text-gray-500 mb-2">{element.description}</div>
      )}

      <Select
        value={value.toString()}
        onValueChange={(val) => onChange(Number(val))}
        disabled={isDisabled}
      >
        <SelectTrigger className={`${colors.border} ${colors.focus} bg-white`}>
          <SelectValue placeholder="Select option" />
        </SelectTrigger>
        <SelectContent>
          {element.options?.map((option, index) => (
            <SelectItem key={index} value={index.toString()}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value > 0 && (
        <div className="text-center text-sm font-medium text-gray-700">
          Total: <span className={colors.accent}>{value * element.pointsPerUnit} points</span>
        </div>
      )}
    </div>
  );

  const renderElement = () => {
    switch (element.elementType) {
      case ElementType.COUNTER:
        return renderCounter();
      case ElementType.BOOLEAN:
        return renderBoolean();
      case ElementType.TIMER:
        return renderTimer();
      case ElementType.SELECT:
        return renderSelect();
      default:
        return renderCounter(); // fallback
    }
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${colors.background} ${colors.border}`}>
      {element.icon && (
        <div className="flex items-center gap-2 mb-2">
          <div className="text-lg">{element.icon}</div>
        </div>
      )}
      {renderElement()}
    </div>
  );
};

export default ScoreElement;
