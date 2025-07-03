'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Settings, Eye, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Field } from '@/lib/types/tournament.types';
import type { AvailableReferee } from '@/lib/types/referee.types';

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
      "transition-all duration-200 hover:shadow-md",
      isFullyStaffed ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"
    )}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{field.name}</CardTitle>
            <p className="text-sm text-gray-600">Field {field.number || 'N/A'}</p>
          </div>
          <Badge 
            variant={isFullyStaffed ? "default" : "secondary"}
            className={isFullyStaffed ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}
          >
            {refereeCount}/4 Referees
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Head Referee */}
        <div>
          <Label className="text-sm font-medium text-gray-700">Head Referee</Label>
          {headReferee ? (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="default" className="bg-blue-100 text-blue-800">
                {headReferee.user.username}
              </Badge>
              <Crown size={14} className="text-yellow-500" />
            </div>
          ) : (
            <p className="text-sm text-gray-500 mt-1">Not assigned</p>
          )}
        </div>
        
        {/* Assistant Referees */}
        <div>
          <Label className="text-sm font-medium text-gray-700">
            Assistant Referees ({assistantReferees.length})
          </Label>
          {assistantReferees.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-1">
              {assistantReferees.map(ref => (
                <Badge key={ref.id} variant="outline" className="text-xs">
                  {ref.user.username}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 mt-1">None assigned</p>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onAssignReferees}
            className="flex-1"
          >
            <Settings className="h-3 w-3 mr-1" />
            Manage
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => {/* TODO: View matches functionality */}}
          >
            <Eye className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
