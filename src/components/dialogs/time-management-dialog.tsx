"use client";

import React, { useState, useEffect } from "react";
import { format, addMinutes } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, Info, Calendar } from "lucide-react";
import { useMatchTimeManagement } from "@/hooks/matches/use-match-time-management";
import type { UpdateMatchTimeRequest, BulkUpdateMatchTimesRequest } from "@/hooks/matches/use-match-time-management";

interface TimeManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'single' | 'bulk';
  matchId?: string;
  stageId?: string;
  stageName?: string;
  currentTime?: Date;
  matchNumber?: number;
}

export function TimeManagementDialog({
  isOpen,
  onClose,
  mode,
  matchId,
  stageId,
  stageName,
  currentTime,
  matchNumber,
}: TimeManagementDialogProps) {
  const { updateMatchTime, bulkUpdateMatchTimes, isAdmin } = useMatchTimeManagement();

  // Single match update states
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [updateSubsequent, setUpdateSubsequent] = useState(false);
  const [fieldIntervalMinutes, setFieldIntervalMinutes] = useState(5);

  // Bulk update states
  const [startTime, setStartTime] = useState<string>("");
  const [matchIntervalMinutes, setMatchIntervalMinutes] = useState(10);
  const [bulkFieldIntervalMinutes, setBulkFieldIntervalMinutes] = useState(5);
  const [resetAllTimes, setResetAllTimes] = useState(false);

  // Initialize form values
  useEffect(() => {
    if (isOpen) {
      if (mode === 'single' && currentTime) {
        setScheduledTime(format(currentTime, "yyyy-MM-dd'T'HH:mm"));
      } else if (mode === 'bulk') {
        // Default to current time + 10 minutes for bulk updates
        const defaultStart = addMinutes(new Date(), 10);
        setStartTime(format(defaultStart, "yyyy-MM-dd'T'HH:mm"));
      }
    }
  }, [isOpen, mode, currentTime]);

  // Reset form when closing
  const handleClose = () => {
    setScheduledTime("");
    setUpdateSubsequent(false);
    setFieldIntervalMinutes(5);
    setStartTime("");
    setMatchIntervalMinutes(10);
    setBulkFieldIntervalMinutes(5);
    setResetAllTimes(false);
    onClose();
  };

  // Handle single match time update
  const handleSingleUpdate = async () => {
    if (!matchId || !scheduledTime) return;

    const updateData: UpdateMatchTimeRequest = {
      scheduledTime: new Date(scheduledTime),
      updateSubsequent,
      fieldIntervalMinutes,
    };

    try {
      await updateMatchTime.mutateAsync({ matchId, data: updateData });
      handleClose();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  // Handle bulk time update
  const handleBulkUpdate = async () => {
    if (!stageId || !startTime) return;

    const updateData: BulkUpdateMatchTimesRequest = {
      stageId,
      startTime: new Date(startTime),
      matchIntervalMinutes,
      fieldIntervalMinutes: bulkFieldIntervalMinutes,
      resetAllTimes,
    };

    try {
      await bulkUpdateMatchTimes.mutateAsync(updateData);
      handleClose();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  if (!isAdmin) {
    return null;
  }

  const isLoading = updateMatchTime.isPending || bulkUpdateMatchTimes.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-white border border-gray-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <Clock size={20} />
            {mode === 'single' ? 'Update Match Time' : 'Bulk Update Match Times'}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {mode === 'single' 
              ? `Update the scheduled time for Match ${matchNumber}`
              : `Update all match times for stage "${stageName}"`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info Alert */}
          <Alert className="bg-blue-50 border-blue-200 text-blue-800">
            <Info size={16} />
            <AlertDescription>
              {mode === 'single' 
                ? "Field intervals: Each field starts 5 minutes after the previous field (Field 1: 8:00, Field 2: 8:05, etc.)"
                : "Default scheduling: 5-minute intervals between fields, 10-minute intervals between rounds."
              }
            </AlertDescription>
          </Alert>

          {mode === 'single' ? (
            // Single match update form
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scheduledTime" className="text-gray-700 font-medium">
                  Scheduled Time
                </Label>
                <Input
                  id="scheduledTime"
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="updateSubsequent"
                    checked={updateSubsequent}
                    onCheckedChange={(checked) => setUpdateSubsequent(checked as boolean)}
                  />
                  <Label htmlFor="updateSubsequent" className="text-gray-700">
                    Update all subsequent matches
                  </Label>
                </div>

                {updateSubsequent && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="fieldInterval" className="text-gray-700 font-medium">
                      Field Interval (minutes)
                    </Label>
                    <Input
                      id="fieldInterval"
                      type="number"
                      min="1"
                      max="60"
                      value={fieldIntervalMinutes}
                      onChange={(e) => setFieldIntervalMinutes(Number(e.target.value))}
                      className="w-24 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="text-sm text-gray-500">
                      Minutes between each field's start time
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Bulk update form
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="startTime" className="text-gray-700 font-medium">
                  Start Time
                </Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500">
                  Time when the first match should start
                </p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="matchInterval" className="text-gray-700 font-medium">
                    Match Interval (min)
                  </Label>
                  <Input
                    id="matchInterval"
                    type="number"
                    min="1"
                    max="120"
                    value={matchIntervalMinutes}
                    onChange={(e) => setMatchIntervalMinutes(Number(e.target.value))}
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="text-sm text-gray-500">
                    Time between matches on same field
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulkFieldInterval" className="text-gray-700 font-medium">
                    Field Interval (min)
                  </Label>
                  <Input
                    id="bulkFieldInterval"
                    type="number"
                    min="1"
                    max="60"
                    value={bulkFieldIntervalMinutes}
                    onChange={(e) => setBulkFieldIntervalMinutes(Number(e.target.value))}
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="text-sm text-gray-500">
                    Time between different fields
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="resetAllTimes"
                  checked={resetAllTimes}
                  onCheckedChange={(checked) => setResetAllTimes(checked as boolean)}
                />
                <Label htmlFor="resetAllTimes" className="text-gray-700">
                  Reset all match times (including completed matches)
                </Label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            onClick={mode === 'single' ? handleSingleUpdate : handleBulkUpdate}
            disabled={isLoading || (!scheduledTime && mode === 'single') || (!startTime && mode === 'bulk')}
            className="bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-400"
          >
            {isLoading ? "Updating..." : mode === 'single' ? "Update Time" : "Update All Times"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
