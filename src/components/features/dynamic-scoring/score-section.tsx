import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Trophy, AlertTriangle } from 'lucide-react';
import ScoreElement from './score-element';
import BonusCondition from './bonus-condition';
import PenaltyCondition from './penalty-condition';
import { ScoreSectionProps, ElementScores } from '../../../types/score-config.types';
import { useClientScoreCalculation } from '../../../hooks/score-config/use-score-config';

const ScoreSection: React.FC<ScoreSectionProps> = ({
  section,
  scores,
  onScoreChange,
  readonly = false,
  disabled = false,
  allianceColor
}) => {
  const colorClasses = {
    RED: {
      header: 'bg-red-100 border-red-200',
      headerText: 'text-red-800',
      accent: 'text-red-600',
      badge: 'bg-red-200 text-red-800'
    },
    BLUE: {
      header: 'bg-blue-100 border-blue-200',
      headerText: 'text-blue-800',
      accent: 'text-blue-600',
      badge: 'bg-blue-200 text-blue-800'
    }
  };

  const colors = colorClasses[allianceColor];

  // Sort elements by display order
  const sortedElements = [...section.elements].sort((a, b) => a.displayOrder - b.displayOrder);
  const sortedBonuses = [...section.bonuses].sort((a, b) => a.displayOrder - b.displayOrder);
  const sortedPenalties = [...section.penalties].sort((a, b) => a.displayOrder - b.displayOrder);

  // Calculate section totals
  const elementTotal = sortedElements.reduce((total, element) => {
    const value = scores[element.code] || 0;
    return total + (value * element.pointsPerUnit);
  }, 0);

  const bonusTotal = sortedBonuses.reduce((total, bonus) => {
    // Simple bonus calculation - in real implementation, this would evaluate conditions
    const isTriggered = checkBonusCondition(bonus, scores);
    return total + (isTriggered ? bonus.bonusPoints : 0);
  }, 0);

  const penaltyTotal = sortedPenalties.reduce((total, penalty) => {
    // Simple penalty calculation - in real implementation, this would evaluate conditions
    const isTriggered = checkPenaltyCondition(penalty, scores);
    return total + (isTriggered ? penalty.penaltyPoints : 0);
  }, 0);

  const sectionTotal = elementTotal + bonusTotal - penaltyTotal;

  // Simple condition checking - in real implementation, this would be more sophisticated
  function checkBonusCondition(bonus: any, elementScores: ElementScores): boolean {
    // This is a simplified check - real implementation would parse JSON conditions
    try {
      if (bonus.condition && typeof bonus.condition === 'object') {
        // Example: { "element": "auto_cones", "operator": ">=", "value": 3 }
        const condition = bonus.condition;
        if (condition.element && condition.operator && condition.value !== undefined) {
          const elementValue = elementScores[condition.element] || 0;
          switch (condition.operator) {
            case '>=': return elementValue >= condition.value;
            case '>': return elementValue > condition.value;
            case '<=': return elementValue <= condition.value;
            case '<': return elementValue < condition.value;
            case '==': return elementValue === condition.value;
            case '!=': return elementValue !== condition.value;
            default: return false;
          }
        }
      }
    } catch (error) {
      console.warn('Error evaluating bonus condition:', error);
    }
    return false;
  }

  function checkPenaltyCondition(penalty: any, elementScores: ElementScores): boolean {
    // Similar to bonus condition checking
    try {
      if (penalty.condition && typeof penalty.condition === 'object') {
        const condition = penalty.condition;
        if (condition.element && condition.operator && condition.value !== undefined) {
          const elementValue = elementScores[condition.element] || 0;
          switch (condition.operator) {
            case '>=': return elementValue >= condition.value;
            case '>': return elementValue > condition.value;
            case '<=': return elementValue <= condition.value;
            case '<': return elementValue < condition.value;
            case '==': return elementValue === condition.value;
            case '!=': return elementValue !== condition.value;
            default: return false;
          }
        }
      }
    } catch (error) {
      console.warn('Error evaluating penalty condition:', error);
    }
    return false;
  }

  return (
    <Card className="w-full">
      {/* Section Header */}
      <div className={`p-4 border-b ${colors.header}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-bold ${colors.headerText}`}>
              {section.name}
            </h3>
            {section.description && (
              <p className="text-sm text-gray-600 mt-1">{section.description}</p>
            )}
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${colors.accent}`}>
              {sectionTotal} pts
            </div>
            <div className="text-xs text-gray-500">
              Section Total
            </div>
          </div>
        </div>
      </div>

      {/* Elements */}
      {sortedElements.length > 0 && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedElements.map((element) => (
              <ScoreElement
                key={element.id}
                element={element}
                description={element.description}
                value={scores[element.code] || 0}
                onChange={(value) => onScoreChange(element.code, value)}
                disabled={disabled}
                readonly={readonly}
                allianceColor={allianceColor}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bonuses and Penalties */}
      {(sortedBonuses.length > 0 || sortedPenalties.length > 0) && (
        <>
          <Separator />
          <div className="p-4 space-y-4">
            {/* Bonuses */}
            {sortedBonuses.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  <h4 className="font-semibold text-gray-800 text-lg">Bonus Conditions</h4>
                  <Badge variant="outline" className="text-xs">
                    {sortedBonuses.filter(b => checkBonusCondition(b, scores)).length} / {sortedBonuses.length} Active
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sortedBonuses.map((bonus) => (
                    <BonusCondition
                      key={bonus.id}
                      bonus={bonus}
                      elementScores={scores}
                      allianceColor={allianceColor}
                      readonly={readonly}
                      showDetails={true}
                      animated={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Penalties */}
            {sortedPenalties.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h4 className="font-semibold text-gray-800 text-lg">Penalty Conditions</h4>
                  <Badge variant="outline" className="text-xs">
                    {sortedPenalties.filter(p => checkPenaltyCondition(p, scores)).length} / {sortedPenalties.length} Active
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sortedPenalties.map((penalty) => (
                    <PenaltyCondition
                      key={penalty.id}
                      penalty={penalty}
                      elementScores={scores}
                      allianceColor={allianceColor}
                      readonly={readonly}
                      showDetails={true}
                      animated={true}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Section Summary */}
      <div className={`p-4 border-t ${colors.header}`}>
        <div className="flex justify-between text-sm">
          <div className="space-y-1">
            <div>Elements: <span className="font-medium">{elementTotal} pts</span></div>
            {bonusTotal > 0 && (
              <div className="text-green-600">Bonuses: <span className="font-medium">+{bonusTotal} pts</span></div>
            )}
            {penaltyTotal > 0 && (
              <div className="text-red-600">Penalties: <span className="font-medium">-{penaltyTotal} pts</span></div>
            )}
          </div>
          <div className={`text-right font-bold ${colors.headerText}`}>
            <div className="text-lg">{sectionTotal} pts</div>
            <div className="text-xs font-normal">Section Total</div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ScoreSection;
