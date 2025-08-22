'use client';

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Calendar,
  AlertTriangle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateValidationResult, DateRange } from '@/lib/date-validation';
import { format, differenceInDays, differenceInHours } from 'date-fns';

interface DateValidationIndicatorProps {
  validation: DateValidationResult;
  className?: string;
  showWarnings?: boolean;
  compact?: boolean;
}

export function DateValidationIndicator({
  validation,
  className,
  showWarnings = true,
  compact = false
}: DateValidationIndicatorProps) {
  if (validation.errors.length === 0 && validation.warnings.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {validation.errors.length > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {validation.errors.length} error{validation.errors.length !== 1 ? 's' : ''}
          </Badge>
        )}
        {showWarnings && validation.warnings.length > 0 && (
          <Badge variant="outline" className="flex items-center gap-1 text-yellow-700 border-yellow-300">
            <AlertTriangle className="h-3 w-3" />
            {validation.warnings.length} warning{validation.warnings.length !== 1 ? 's' : ''}
          </Badge>
        )}
        {validation.isValid && validation.errors.length === 0 && (
          <Badge variant="outline" className="flex items-center gap-1 text-green-700 border-green-300">
            <CheckCircle className="h-3 w-3" />
            Valid
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {validation.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validation.errors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {showWarnings && validation.warnings.length > 0 && (
        <Alert className="border-yellow-300 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <div className="space-y-1">
              {validation.warnings.map((warning, index) => (
                <div key={index}>{warning}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {validation.isValid && validation.errors.length === 0 && validation.warnings.length === 0 && (
        <Alert className="border-green-300 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Date range is valid
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

interface DateBoundaryDisplayProps {
  parentRange?: DateRange;
  currentRange?: DateRange;
  entityName?: string;
  parentName?: string;
  className?: string;
}

export function DateBoundaryDisplay({
  parentRange,
  currentRange,
  entityName = 'Entity',
  parentName = 'Parent',
  className
}: DateBoundaryDisplayProps) {
  if (!parentRange) return null;

  const now = new Date();
  const isParentActive = now >= parentRange.startDate && now <= parentRange.endDate;
  const isParentPast = now > parentRange.endDate;
  const isParentFuture = now < parentRange.startDate;

  return (
    <Card className={cn("border-l-4 border-l-blue-500", className)}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-gray-700">
              {parentName} Date Boundaries
            </h4>
            <Badge 
              variant={isParentActive ? "default" : isParentPast ? "secondary" : "outline"}
              className={cn(
                isParentActive && "bg-green-600",
                isParentPast && "bg-gray-600",
                isParentFuture && "border-blue-500 text-blue-700"
              )}
            >
              {isParentActive ? 'Active' : isParentPast ? 'Completed' : 'Upcoming'}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="flex items-center gap-1 text-gray-600 mb-1">
                <Calendar className="h-3 w-3" />
                <span>Start Date</span>
              </div>
              <div className="font-medium">
                {format(parentRange.startDate, 'PPP')}
              </div>
              <div className="text-xs text-gray-500">
                {format(parentRange.startDate, 'p')}
              </div>
            </div>
            
            <div>
              <div className="flex items-center gap-1 text-gray-600 mb-1">
                <Calendar className="h-3 w-3" />
                <span>End Date</span>
              </div>
              <div className="font-medium">
                {format(parentRange.endDate, 'PPP')}
              </div>
              <div className="text-xs text-gray-500">
                {format(parentRange.endDate, 'p')}
              </div>
            </div>
          </div>

          {currentRange && (
            <div className="pt-2 border-t border-gray-200">
              <div className="text-xs text-gray-600 mb-2">
                {entityName} must be scheduled within these boundaries
              </div>
              
              {/* Show current range status */}
              <div className="flex items-center gap-2 text-xs">
                <Clock className="h-3 w-3" />
                <span>
                  Duration: {differenceInDays(currentRange.endDate, currentRange.startDate)} days, 
                  {' '}{differenceInHours(currentRange.endDate, currentRange.startDate) % 24} hours
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface DateRangeInputProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  validation?: DateValidationResult;
  parentRange?: DateRange;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function DateRangeInput({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  validation,
  parentRange,
  label = "Date Range",
  required = false,
  disabled = false,
  className
}: DateRangeInputProps) {
  const hasErrors = validation?.errors.length ?? 0 > 0;
  const hasWarnings = validation?.warnings.length ?? 0 > 0;

  // Calculate min/max dates based on parent range
  const minDate = parentRange ? format(parentRange.startDate, 'yyyy-MM-dd\'T\'HH:mm') : undefined;
  const maxDate = parentRange ? format(parentRange.endDate, 'yyyy-MM-dd\'T\'HH:mm') : undefined;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Start Date {required && <span className="text-red-500">*</span>}
          </label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            min={minDate}
            max={maxDate}
            disabled={disabled}
            className={cn(
              "w-full px-3 py-2 border rounded-md text-sm",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
              hasErrors && "border-red-500 focus:ring-red-500 focus:border-red-500",
              hasWarnings && !hasErrors && "border-yellow-500 focus:ring-yellow-500 focus:border-yellow-500",
              disabled && "bg-gray-100 cursor-not-allowed"
            )}
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            End Date {required && <span className="text-red-500">*</span>}
          </label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            min={minDate}
            max={maxDate}
            disabled={disabled}
            className={cn(
              "w-full px-3 py-2 border rounded-md text-sm",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
              hasErrors && "border-red-500 focus:ring-red-500 focus:border-red-500",
              hasWarnings && !hasErrors && "border-yellow-500 focus:ring-yellow-500 focus:border-yellow-500",
              disabled && "bg-gray-100 cursor-not-allowed"
            )}
          />
        </div>
      </div>

      {/* Show parent boundaries */}
      {parentRange && (
        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border">
          <div className="flex items-center gap-1 mb-1">
            <Info className="h-3 w-3" />
            <span className="font-medium">Allowed Range:</span>
          </div>
          <div>
            {format(parentRange.startDate, 'PPP p')} - {format(parentRange.endDate, 'PPP p')}
          </div>
        </div>
      )}

      {/* Validation feedback */}
      {validation && (
        <DateValidationIndicator 
          validation={validation} 
          showWarnings={true}
        />
      )}
    </div>
  );
}
