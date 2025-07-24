import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Trophy, 
  Zap, 
  Star, 
  CheckCircle, 
  Clock,
  Target,
  Award,
  Sparkles
} from 'lucide-react';
import { BonusConfig, ElementScores } from '@/types/score-config.types';

interface BonusConditionProps {
  bonus: BonusConfig;
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

const BonusCondition: React.FC<BonusConditionProps> = ({
  bonus,
  elementScores,
  allianceColor,
  readonly = false,
  showDetails = true,
  animated = true
}) => {
  // Color classes for alliance theming
  const colorClasses = {
    RED: {
      active: 'bg-green-50 border-green-300 shadow-green-100',
      inactive: 'bg-red-50 border-red-200',
      badge: 'bg-green-600 text-white',
      inactiveBadge: 'bg-red-200 text-red-800',
      text: 'text-green-700',
      inactiveText: 'text-red-600',
      points: 'text-green-600 font-bold',
      inactivePoints: 'text-red-500',
      glow: 'shadow-lg shadow-green-200'
    },
    BLUE: {
      active: 'bg-green-50 border-green-300 shadow-green-100',
      inactive: 'bg-blue-50 border-blue-200',
      badge: 'bg-green-600 text-white',
      inactiveBadge: 'bg-blue-200 text-blue-800',
      text: 'text-green-700',
      inactiveText: 'text-blue-600',
      points: 'text-green-600 font-bold',
      inactivePoints: 'text-blue-500',
      glow: 'shadow-lg shadow-green-200'
    }
  };

  const colors = colorClasses[allianceColor];

  // Evaluate bonus condition
  const evaluateCondition = (bonus: BonusConfig, scores: ElementScores): ConditionEvaluationResult => {
    try {
      if (!bonus.condition || typeof bonus.condition !== 'object') {
        return { isTriggered: false };
      }

      const condition = bonus.condition;

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
          evaluateCondition({ ...bonus, condition: cond }, scores)
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
          evaluateCondition({ ...bonus, condition: cond }, scores)
        );
        const anyTriggered = results.some((r: ConditionEvaluationResult) => r.isTriggered);
        const maxProgress = Math.max(...results.map((r: ConditionEvaluationResult) => r.progress || 0));
        
        return {
          isTriggered: anyTriggered,
          conditionText: results.map((r:ConditionEvaluationResult) => r.conditionText).join(' OR '),
          progress: maxProgress
        };
      }

    } catch (error) {
      console.warn('Error evaluating bonus condition:', error);
    }

    return { isTriggered: false, conditionText: 'Invalid condition' };
  };

  const evaluation = evaluateCondition(bonus, elementScores);
  const isActive = evaluation.isTriggered;

  // Get appropriate icon based on bonus type or use default
  const getIcon = () => {
    const iconSize = "w-4 h-4";
    
    if (bonus.name.toLowerCase().includes('mobility')) return <Target className={iconSize} />;
    if (bonus.name.toLowerCase().includes('autonomous')) return <Clock className={iconSize} />;
    if (bonus.name.toLowerCase().includes('endgame')) return <Star className={iconSize} />;
    if (bonus.name.toLowerCase().includes('cooperation')) return <Award className={iconSize} />;
    if (bonus.name.toLowerCase().includes('perfect')) return <Sparkles className={iconSize} />;
    
    return <Zap className={iconSize} />;
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
              variant={isActive ? 'default' : 'secondary'}
              className={`
                transition-all duration-300
                ${isActive ? colors.badge : colors.inactiveBadge}
              `}
            >
              {getIcon()}
              <span className="ml-1">{bonus.name}</span>
            </Badge>
            
            {isActive && animated && (
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-600 animate-bounce" />
                <Trophy className="w-4 h-4 text-yellow-500 animate-pulse" />
              </div>
            )}
          </div>
          
          <div className={`
            font-bold text-lg transition-all duration-300
            ${isActive ? colors.points : colors.inactivePoints}
          `}>
            +{bonus.bonusPoints} pts
          </div>
        </div>

        {/* Description */}
        {bonus.description && (
          <p className="text-xs text-gray-600 leading-relaxed">
            {bonus.description}
          </p>
        )}

        {/* Condition Details */}
        {showDetails && evaluation.conditionText && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Condition:</span>
              <code className={`
                px-2 py-1 rounded text-xs font-mono
                ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}
              `}>
                {evaluation.conditionText}
              </code>
            </div>

            {/* Progress bar for conditions that have progress */}
            {evaluation.progress !== undefined && evaluation.progress > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Progress:</span>
                  <span className={isActive ? colors.text : colors.inactiveText}>
                    {Math.round(evaluation.progress)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`
                      h-2 rounded-full transition-all duration-500
                      ${isActive ? 'bg-green-500' : `bg-${allianceColor.toLowerCase()}-400`}
                    `}
                    style={{ width: `${evaluation.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Current vs required values */}
            {evaluation.currentValue !== undefined && evaluation.requiredValue !== undefined && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Current / Required:</span>
                <span className={`font-mono ${isActive ? colors.text : colors.inactiveText}`}>
                  {evaluation.currentValue} / {evaluation.requiredValue}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Active indicator */}
        {isActive && (
          <div className={`
            flex items-center justify-center gap-2 p-2 rounded-lg
            bg-green-100 border border-green-300 text-green-700
            ${animated ? 'animate-pulse' : ''}
          `}>
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-semibold">BONUS ACTIVE</span>
            <Sparkles className="w-4 h-4" />
          </div>
        )}
      </div>
    </Card>
  );
};

export default BonusCondition;
