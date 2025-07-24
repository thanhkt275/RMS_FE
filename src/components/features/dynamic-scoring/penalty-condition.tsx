import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  AlertTriangle, 
  XCircle, 
  Shield, 
  AlertCircle,
  Slash,
  Ban,
  FileWarning,
  MinusCircle
} from 'lucide-react';
import { PenaltyConfig, ElementScores } from '../../../types/score-config.types';

interface PenaltyConditionProps {
  penalty: PenaltyConfig;
  elementScores: ElementScores;
  allianceColor: 'RED' | 'BLUE';
  readonly?: boolean;
  showDetails?: boolean;
  animated?: boolean;
  description?: string;
}

interface ConditionEvaluationResult {
  isTriggered: boolean;
  currentValue?: number;
  requiredValue?: number;
  conditionText?: string;
  progress?: number; // 0-100 percentage
}

const PenaltyCondition: React.FC<PenaltyConditionProps> = ({
  penalty,
  elementScores,
  allianceColor,
  readonly = false,
  showDetails = true,
  animated = true
}) => {
  // Color classes for alliance theming
  const colorClasses = {
    RED: {
      active: 'bg-red-50 border-red-400 shadow-red-100',
      inactive: 'bg-red-50 border-red-200',
      badge: 'bg-red-600 text-white',
      inactiveBadge: 'bg-red-200 text-red-800',
      text: 'text-red-700',
      inactiveText: 'text-red-400',
      points: 'text-red-600 font-bold',
      inactivePoints: 'text-red-400',
      glow: 'shadow-lg shadow-red-200'
    },
    BLUE: {
      active: 'bg-red-50 border-red-400 shadow-red-100',
      inactive: 'bg-blue-50 border-blue-200',
      badge: 'bg-red-600 text-white',
      inactiveBadge: 'bg-blue-200 text-blue-800',
      text: 'text-red-700',
      inactiveText: 'text-blue-400',
      points: 'text-red-600 font-bold',
      inactivePoints: 'text-blue-400',
      glow: 'shadow-lg shadow-red-200'
    }
  };

  const colors = colorClasses[allianceColor];

  // Evaluate penalty condition
  const evaluateCondition = (penalty: PenaltyConfig, scores: ElementScores): ConditionEvaluationResult => {
    try {
      if (!penalty.condition || typeof penalty.condition !== 'object') {
        return { isTriggered: false };
      }

      const condition = penalty.condition;

      // Handle simple element-based conditions
      if (condition.element && condition.operator && condition.value !== undefined) {
        const currentValue = scores[condition.element] || 0;
        const requiredValue = condition.value;
        let isTriggered = false;
        let progress = 0;

        switch (condition.operator) {
          case '>=':
            isTriggered = currentValue >= requiredValue;
            progress = Math.min((currentValue / requiredValue) * 100, 100);
            break;
          case '>':
            isTriggered = currentValue > requiredValue;
            progress = Math.min(((currentValue - 1) / requiredValue) * 100, 100);
            break;
          case '<=':
            isTriggered = currentValue <= requiredValue;
            progress = requiredValue > 0 ? Math.max(100 - ((currentValue / requiredValue) * 100), 0) : 100;
            break;
          case '<':
            isTriggered = currentValue < requiredValue;
            progress = requiredValue > 0 ? Math.max(100 - (((currentValue + 1) / requiredValue) * 100), 0) : 100;
            break;
          case '==':
            isTriggered = currentValue === requiredValue;
            progress = isTriggered ? 100 : 0;
            break;
          case '!=':
            isTriggered = currentValue !== requiredValue;
            progress = isTriggered ? 100 : 0;
            break;
        }

        return {
          isTriggered,
          currentValue,
          requiredValue,
          conditionText: `${condition.element} ${condition.operator} ${requiredValue}`,
          progress
        };
      }

      // Handle complex conditions (AND, OR logic)
      if (condition.type === 'AND' && condition.conditions) {
        const results = condition.conditions.map((cond: any) => 
          evaluateCondition({ ...penalty, condition: cond }, scores)
        );
        const allTriggered = results.every((r: ConditionEvaluationResult) => r.isTriggered);
        const avgProgress = results.reduce((sum: number, r: ConditionEvaluationResult) => sum + (r.progress || 0), 0) / results.length;
        
        return {
          isTriggered: allTriggered,
          conditionText: results.map((r: ConditionEvaluationResult) => r.conditionText).join(' AND '),
          progress: avgProgress
        };
      }

      if (condition.type === 'OR' && condition.conditions) {
        const results = condition.conditions.map((cond: any) => 
          evaluateCondition({ ...penalty, condition: cond }, scores)
        );
        const anyTriggered = results.some((r: ConditionEvaluationResult) => r.isTriggered);
        const maxProgress = Math.max(...results.map((r: ConditionEvaluationResult) => r.progress || 0));
        
        return {
          isTriggered: anyTriggered,
          conditionText: results.map((r: ConditionEvaluationResult) => r.conditionText).join(' OR '),
          progress: maxProgress
        };
      }

    } catch (error) {
      console.warn('Error evaluating penalty condition:', error);
    }

    return { isTriggered: false, conditionText: 'Invalid condition' };
  };

  const evaluation = evaluateCondition(penalty, elementScores);
  const isActive = evaluation.isTriggered;

  // Get appropriate icon based on penalty type or use default
  const getIcon = () => {
    const iconSize = "w-4 h-4";
    
    if (penalty.name.toLowerCase().includes('foul')) return <Ban className={iconSize} />;
    if (penalty.name.toLowerCase().includes('technical')) return <FileWarning className={iconSize} />;
    if (penalty.name.toLowerCase().includes('major')) return <XCircle className={iconSize} />;
    if (penalty.name.toLowerCase().includes('minor')) return <MinusCircle className={iconSize} />;
    if (penalty.name.toLowerCase().includes('disable')) return <Slash className={iconSize} />;
    if (penalty.name.toLowerCase().includes('card')) return <Shield className={iconSize} />;
    
    return <AlertTriangle className={iconSize} />;
  };

  return (
    <Card 
      className={`
        transition-all duration-300 border-2
        ${isActive 
          ? `${colors.active} ${animated ? colors.glow : ''} ${animated ? 'transform scale-105' : ''}` 
          : colors.inactive
        }
        ${animated && isActive ? 'animate-pulse' : ''}
      `}
    >
      <div className="p-3 space-y-3">
        {/* Header with name and status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge 
              variant={isActive ? 'destructive' : 'secondary'}
              className={`
                transition-all duration-300
                ${isActive ? colors.badge : colors.inactiveBadge}
              `}
            >
              {getIcon()}
              <span className="ml-1">{penalty.name}</span>
            </Badge>
            
            {isActive && animated && (
              <div className="flex items-center gap-1">
                <XCircle className="w-4 h-4 text-red-600 animate-bounce" />
                <AlertTriangle className="w-4 h-4 text-orange-500 animate-pulse" />
              </div>
            )}
          </div>
          
          <div className={`
            font-bold text-lg transition-all duration-300
            ${isActive ? colors.points : colors.inactivePoints}
          `}>
            -{penalty.penaltyPoints} pts
          </div>
        </div>

        {/* Description */}
        {penalty.description && (
          <p className="text-xs text-gray-600 leading-relaxed">
            {penalty.description}
          </p>
        )}

        {/* Condition Details */}
        {showDetails && evaluation.conditionText && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Condition:</span>
              <code className={`
                px-2 py-1 rounded text-xs font-mono
                ${isActive ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}
              `}>
                {evaluation.conditionText}
              </code>
            </div>

            {/* Progress bar for conditions that have progress */}
            {evaluation.progress !== undefined && evaluation.progress > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Risk Level:</span>
                  <span className={isActive ? colors.text : colors.inactiveText}>
                    {Math.round(evaluation.progress)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`
                      h-2 rounded-full transition-all duration-500
                      ${isActive ? 'bg-red-500' : `bg-${allianceColor.toLowerCase()}-400`}
                    `}
                    style={{ width: `${evaluation.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Current vs required values */}
            {evaluation.currentValue !== undefined && evaluation.requiredValue !== undefined && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Current / Threshold:</span>
                <span className={`font-mono ${isActive ? colors.text : colors.inactiveText}`}>
                  {evaluation.currentValue} / {evaluation.requiredValue}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Warning indicators */}
        {!isActive && evaluation.progress !== undefined && evaluation.progress > 60 && (
          <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-yellow-50 border border-yellow-300 text-yellow-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-semibold">WARNING: Close to penalty</span>
          </div>
        )}

        {/* Active indicator */}
        {isActive && (
          <div className={`
            flex items-center justify-center gap-2 p-2 rounded-lg
            bg-red-100 border border-red-400 text-red-700
            ${animated ? 'animate-pulse' : ''}
          `}>
            <XCircle className="w-4 h-4" />
            <span className="text-sm font-semibold">PENALTY APPLIED</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
        )}
      </div>
    </Card>
  );
};

export default PenaltyCondition;
