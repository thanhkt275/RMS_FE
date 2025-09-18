'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Settings, Eye, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Field } from '@/types/tournament.types';
import type { AvailableReferee } from '@/types/referee.types';

interface FieldCardProps {
  field: Field;
  onAssignReferees: () => void;
  availableReferees?: AvailableReferee[];
}

export function FieldCard({ field, onAssignReferees }: FieldCardProps) {
  const headReferee = field.fieldReferees?.find(fr => fr.isHeadRef);
  const assistantReferees = field.fieldReferees?.filter(fr => !fr.isHeadRef) || [];
  
  const refereeCount = field.fieldReferees?.length || 0;
  const isFullyStaffed = refereeCount >= 3 && refereeCount <= 4 && headReferee;
  
  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-lg bg-gray-900 border-gray-700 active:scale-[0.98]",
      isFullyStaffed ? "ring-1 ring-green-400" : "ring-1 ring-orange-400"
    )}>
      <CardHeader className="pb-3 p-4 sm:p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base sm:text-lg text-slate-100 line-clamp-1">{field.name}</CardTitle>
            <p className="text-xs sm:text-sm text-slate-400">Field {field.number || 'N/A'}</p>
          </div>
          <Badge 
            variant={isFullyStaffed ? "default" : "secondary"}
            className={cn(
              "text-xs flex-shrink-0 ml-2",
              isFullyStaffed ? "bg-green-700 text-green-100" : "bg-orange-700 text-orange-100"
            )}
          >
            {refereeCount}/4 Referees
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
        {/* Head Referee */}
        <div>
          <Label className="text-xs sm:text-sm font-medium text-slate-200">Head Referee</Label>
          {headReferee ? (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="default" className="bg-blue-700 text-blue-100 text-xs">
                {headReferee.user.username}
              </Badge>
              <Crown size={14} className="text-yellow-400 flex-shrink-0" />
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Not assigned</p>
          )}
        </div>
        
        {/* Assistant Referees */}
        <div>
          <Label className="text-xs sm:text-sm font-medium text-slate-200">
            Assistant Referees ({assistantReferees.length})
          </Label>
          {assistantReferees.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-1">
              {assistantReferees.map(ref => (
                <Badge key={ref.id} variant="outline" className="text-xs text-slate-100 border-slate-600">
                  {ref.user.username}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-slate-500 mt-1">None assigned</p>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-700">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onAssignReferees}
            className="flex-1 text-slate-200 border-slate-600 hover:bg-slate-700 hover:text-white min-h-[36px] touch-target"
          >
            <Settings className="h-3 w-3 mr-1" />
            Manage Referees
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => {/* TODO: View matches functionality */}}
            className="sm:flex-shrink-0 text-slate-200 border-slate-600 hover:bg-slate-700 hover:text-white min-h-[36px] touch-target"
          >
            <Eye className="h-3 w-3 mr-1 sm:mr-0" />
            <span className="sm:hidden">View Matches</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
