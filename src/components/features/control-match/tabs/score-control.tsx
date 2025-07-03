"use client";

import { useState, useRef, useEffect } from 'react';
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ScoreControlProps {
  selectedMatch: any | null;
  selectedMatchId: string;
  redAutoScore: number;
  setRedAutoScore: React.Dispatch<React.SetStateAction<number>>;
  redDriveScore: number;
  setRedDriveScore: React.Dispatch<React.SetStateAction<number>>;
  redTeamCount: number;
  setRedTeamCount: (count: number) => void;
  redMultiplier: number;
  setRedMultiplier: (multiplier: number) => void;
  blueAutoScore: number;
  setBlueAutoScore: React.Dispatch<React.SetStateAction<number>>;
  blueDriveScore: number;
  setBlueDriveScore: React.Dispatch<React.SetStateAction<number>>;
  blueTeamCount: number;
  setBlueTeamCount: (count: number) => void;
  blueMultiplier: number;
  setBlueMultiplier: (multiplier: number) => void;
  handleUpdateScores: () => void;
  handleSubmitScores: () => void;
  gameElementType: {
    element: string;
    count: number;
    pointsEach: number;
    operation: string;
    totalPoints: number;
  };
  redGameElements: any[];
  blueGameElements: any[];
  getRedTeams: (match: any) => string[];
  getBlueTeams: (match: any) => string[];
  scoreDetails: any;
  setScoreDetails: (details: any) => void;
  updateRedTeamCount: (count: number) => void;
  updateBlueTeamCount: (count: number) => void;
  addRedGameElement: () => void;
  addBlueGameElement: () => void;
  removeGameElement: (alliance: 'red' | 'blue', index: number) => void;
}

export default function ScoreControl({
  selectedMatch,
  selectedMatchId,
  redAutoScore,
  setRedAutoScore,
  redDriveScore,
  setRedDriveScore,
  redTeamCount,
  setRedTeamCount,
  redMultiplier,
  setRedMultiplier,
  blueAutoScore,
  setBlueAutoScore,
  blueDriveScore,
  setBlueDriveScore,
  blueTeamCount,
  setBlueTeamCount,
  blueMultiplier,
  setBlueMultiplier,
  handleUpdateScores,
  handleSubmitScores,
  gameElementType,
  redGameElements,
  blueGameElements,
  getRedTeams,
  getBlueTeams,
  scoreDetails,
  setScoreDetails,
  updateRedTeamCount,
  updateBlueTeamCount,
  addRedGameElement,
  addBlueGameElement,
  removeGameElement
}: ScoreControlProps) {
  // Manage dialog state locally (could be moved to parent if needed)
  const [isAddingRedElement, setIsAddingRedElement] = useState(false);
  const [isAddingBlueElement, setIsAddingBlueElement] = useState(false);
  const [newElement, setNewElement] = useState({
    element: '',
    count: 1,
    pointsEach: 1,
    operation: 'multiply',
    totalPoints: 0
  });

  // Debounce handleUpdateScores to avoid rapid/broken websocket updates
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const debouncedUpdateScores = () => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      handleUpdateScores();
    }, 100); // 100ms debounce
  };

  useEffect(() => {
    debouncedUpdateScores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redAutoScore, redDriveScore, blueAutoScore, blueDriveScore]);

  return (
    <Card className="bg-gray-900 border-gray-700 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700">
        <CardTitle className="flex items-center text-gray-100">
          <span className="text-xl font-bold">Match Scores</span>
          {selectedMatch && (
            <Badge className="ml-2 bg-blue-600 text-white">
              Match #{selectedMatch.matchNumber}
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-gray-300">
          Update the current match scores
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6 bg-gray-900 text-gray-100">
        {selectedMatch && (
          <div className="text-sm bg-blue-900 p-3 rounded-md border-l-4 border-blue-500 mb-4 flex items-center text-blue-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-300 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>
              Updating scores for <strong className="text-white">Match {selectedMatch.matchNumber}</strong> (ID: {selectedMatch.id})
            </span>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Red Alliance */}
          <div className="space-y-4 p-5 bg-gradient-to-br from-red-950 to-red-900 rounded-lg border-2 border-red-600 shadow-md">
            <h3 className="text-xl font-bold text-red-200 text-center mb-2 pb-2 border-b-2 border-red-700">
              RED ALLIANCE
            </h3>
            
            {selectedMatch && (
              <div className="text-sm font-medium bg-red-900 bg-opacity-70 text-red-100 p-2 rounded mb-3 text-center border-l-4 border-red-500">
                Teams: {getRedTeams(selectedMatch).join(', ') || 'N/A'}
              </div>
            )}
            
            {/* Team Count Multiplier */}
            <div className="bg-gray-800 rounded-md p-3 space-y-2 mb-4">
              <div className="flex justify-between items-center">
                <div className="text-sm text-red-200">Team Count Multiplier:</div>
                <div>
                  <Badge className="bg-red-800 text-red-100 font-mono">{redMultiplier}×</Badge>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-1" tabIndex={0} onBlur={debouncedUpdateScores}>
                <Button 
                  size="sm" 
                  variant="outline"
                  className={`text-xs ${redTeamCount === 0 ? 'bg-red-700 text-white' : 'bg-gray-700'}`}
                  onClick={() => { updateRedTeamCount(0); debouncedUpdateScores(); }}
                >
                  0
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className={`text-xs ${redTeamCount === 1 ? 'bg-red-700 text-white' : 'bg-gray-700'}`}
                  onClick={() => { updateRedTeamCount(1); debouncedUpdateScores(); }}
                >
                  1
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className={`text-xs ${redTeamCount === 2 ? 'bg-red-700 text-white' : 'bg-gray-700'}`}
                  onClick={() => { updateRedTeamCount(2); debouncedUpdateScores(); }}
                >
                  2
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className={`text-xs ${redTeamCount === 3 ? 'bg-red-700 text-white' : 'bg-gray-700'}`}
                  onClick={() => { updateRedTeamCount(3); debouncedUpdateScores(); }}
                >
                  3
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className={`text-xs ${redTeamCount === 4 ? 'bg-red-700 text-white' : 'bg-gray-700'}`}
                  onClick={() => { updateRedTeamCount(4); debouncedUpdateScores(); }}
                >
                  4
                </Button>
              </div>
            </div>
            
            {/* Basic Scoring */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="redAutoScore" className="text-red-200">Auto Score</Label>
                  <div className="flex">
                    <Button 
                      size="icon"
                      variant="outline" 
                      className="bg-red-800 text-red-100 rounded-r-none border-red-600"
                      onClick={() => { setRedAutoScore((prev: number) => Math.max(0, prev - 5)); debouncedUpdateScores(); }}
                    >
                      -
                    </Button>
                    <Input
                      id="redAutoScore"
                      type="number"
                      value={isNaN(redAutoScore) ? 0 : redAutoScore}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                        setRedAutoScore(isNaN(val) ? 0 : val);
                        debouncedUpdateScores();
                      }}
                      onBlur={debouncedUpdateScores}
                      className="text-center border-red-600 bg-red-900 text-red-100 rounded-none"
                    />
                    <Button 
                      size="icon"
                      variant="outline" 
                      className="bg-red-800 text-red-100 rounded-l-none border-red-600"
                      onClick={() => { setRedAutoScore((prev: number) => prev + 5); debouncedUpdateScores(); }}
                    >
                      +
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="redDriveScore" className="text-red-200">Drive Score</Label>
                  <div className="flex">
                    <Button 
                      size="icon"
                      variant="outline" 
                      className="bg-red-800 text-red-100 rounded-r-none border-red-600"
                      onClick={() => { setRedDriveScore((prev: number) => Math.max(0, prev - 5)); debouncedUpdateScores(); }}
                    >
                      -
                    </Button>
                    <Input
                      id="redDriveScore"
                      type="number"
                      value={isNaN(redDriveScore) ? 0 : redDriveScore}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                        setRedDriveScore(isNaN(val) ? 0 : val);
                        debouncedUpdateScores();
                      }}
                      onBlur={debouncedUpdateScores}
                      className="text-center border-red-600 bg-red-900 text-red-100 rounded-none"
                    />
                    <Button 
                      size="icon"
                      variant="outline" 
                      className="bg-red-800 text-red-100 rounded-l-none border-red-600"
                      onClick={() => { setRedDriveScore((prev: number) => prev + 5); debouncedUpdateScores(); }}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Game Elements Accordion */}
            <Accordion type="single" collapsible className="bg-red-950 rounded-md overflow-hidden">
              <AccordionItem value="red-elements" className="border-red-700">
                <AccordionTrigger className="px-3 py-2 text-red-200 hover:text-red-100 hover:no-underline">
                  Game Elements Scoring
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  {redGameElements.length === 0 ? (
                    <div className="text-center py-2 text-red-300">
                      No game elements added
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {redGameElements.map((item, index) => (
                        <div key={index} className="flex justify-between items-center bg-red-950 p-2 rounded-md">
                          <div className="flex-1">
                            <div className="font-medium text-red-200">{item.element}</div>
                            <div className="text-xs text-red-300">
                              {item.count} × {item.pointsEach} pts {item.operation === 'add' ? '(added)' : '(multiplied)'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-red-100">{item.totalPoints} pts</span>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-100 hover:bg-red-800"
                              onClick={() => removeGameElement('red', index)}
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-3 flex justify-center">
                    <Dialog open={isAddingRedElement} onOpenChange={setIsAddingRedElement}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-red-700 text-red-200 bg-red-900 bg-opacity-50 hover:bg-red-800"
                        >
                          + Add Game Element
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-gray-900 border-red-700 text-gray-100">
                        <DialogHeader>
                          <DialogTitle>Add Red Game Element</DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4 py-2">
                          <div className="space-y-2">
                            <Label htmlFor="element-name" className="text-red-200">Element Name</Label>
                            <Input
                              id="element-name"
                              value={newElement.element}
                              onChange={(e) => setNewElement({...newElement, element: e.target.value})}
                              className="bg-gray-800 border-red-700 text-red-100"
                              placeholder="e.g., Ball, Robot, Zone"
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="element-count" className="text-red-200">Count</Label>
                              <Input
                                id="element-count"
                                type="number"
                                value={isNaN(newElement.count) ? 1 : newElement.count}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 1 : parseInt(e.target.value);
                                  setNewElement({...newElement, count: isNaN(val) ? 1 : val});
                                }}
                                className="bg-gray-800 border-red-700 text-red-100"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="element-points" className="text-red-200">Points Each</Label>
                              <Input
                                id="element-points"
                                type="number"
                                value={newElement.pointsEach}
                                onChange={(e) => {
                                  const inputValue = e.target.value;
                                  const numValue = inputValue === '' ? 0 : parseInt(inputValue, 10);
                                  setNewElement({
                                    ...newElement, 
                                    pointsEach: isNaN(numValue) ? newElement.pointsEach : numValue
                                  });
                                }}
                                className="bg-gray-800 border-red-700 text-red-100"
                                min="0"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="element-operation" className="text-red-200">Operation</Label>
                            <Select
                              value={newElement.operation}
                              onValueChange={(value) => setNewElement({...newElement, operation: value})}
                            >
                              <SelectTrigger id="element-operation" className="bg-gray-800 border-red-700 text-red-100">
                                <SelectValue placeholder="Select operation" />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-800 text-red-100">
                                <SelectItem value="multiply">Multiply (Count × Points)</SelectItem>
                                <SelectItem value="add">Add (Count + Points)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="bg-gray-800 p-3 rounded-md mt-2 text-center">
                            <div className="text-sm text-gray-400">Preview:</div>
                            <div className="text-lg font-bold text-red-100">
                              {newElement.operation === 'multiply'
                                ? `${newElement.count} × ${newElement.pointsEach} = ${newElement.count * newElement.pointsEach} points`
                                : `${newElement.count} + ${newElement.pointsEach} = ${newElement.count + newElement.pointsEach} points`
                              }
                            </div>
                          </div>
                        </div>
                        
                        <DialogFooter>
                          <Button 
                            variant="outline" 
                            onClick={() => setIsAddingRedElement(false)}
                            className="border-gray-600 text-gray-300 hover:bg-gray-800"
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={addRedGameElement}
                            className="bg-red-700 text-white hover:bg-red-600"
                          >
                            Add Element
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {redGameElements.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-red-700 flex justify-between items-center">
                      <span className="text-red-200">Elements Total:</span>
                      <span className="font-bold text-red-100">
                        {redGameElements.reduce((sum, item) => sum + item.totalPoints, 0)} pts
                      </span>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="mt-4 pt-3 border-t-2 border-red-700 bg-red-800 rounded-lg p-3">
              <div className="flex flex-col space-y-1">
                <div className="flex justify-between items-center text-sm text-red-200">
                  <span>Auto + Teleop:</span>
                  <span>{redAutoScore + redDriveScore} pts</span>
                </div>
                {redGameElements.length > 0 && (
                  <div className="flex justify-between items-center text-sm text-red-200">
                    <span>Game Elements:</span>
                    <span>{redGameElements.reduce((sum, item) => sum + item.totalPoints, 0)} pts</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm text-red-200">
                  <span>Team Count Multiplier:</span>
                  <span>{redMultiplier}×</span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold text-red-100 pt-2 mt-1 border-t border-red-700">
                  <span>Total Score:</span>
                  <span>
                    {Math.round(
                      (redAutoScore + redDriveScore + redGameElements.reduce((sum, item) => sum + item.totalPoints, 0)) * redMultiplier
                    )} pts
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Blue Alliance */}
          <div className="space-y-4 p-5 bg-gradient-to-br from-blue-950 to-blue-900 rounded-lg border-2 border-blue-600 shadow-md">
            <h3 className="text-xl font-bold text-blue-200 text-center mb-2 pb-2 border-b-2 border-blue-700">
              BLUE ALLIANCE
            </h3>
            
            {selectedMatch && (
              <div className="text-sm font-medium bg-blue-900 bg-opacity-70 text-blue-100 p-2 rounded mb-3 text-center border-l-4 border-blue-500">
                Teams: {getBlueTeams(selectedMatch).join(', ') || 'N/A'}
              </div>
            )}
            
            {/* Team Count Multiplier */}
            <div className="bg-gray-800 rounded-md p-3 space-y-2 mb-4">
              <div className="flex justify-between items-center">
                <div className="text-sm text-blue-200">Team Count Multiplier:</div>
                <div>
                  <Badge className="bg-blue-800 text-blue-100 font-mono">{blueMultiplier}×</Badge>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-1" tabIndex={0} onBlur={debouncedUpdateScores}>
                <Button 
                  size="sm" 
                  variant="outline"
                  className={`text-xs ${blueTeamCount === 0 ? 'bg-blue-700 text-white' : 'bg-gray-700'}`}
                  onClick={() => { updateBlueTeamCount(0); debouncedUpdateScores(); }}
                >
                  0
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className={`text-xs ${blueTeamCount === 1 ? 'bg-blue-700 text-white' : 'bg-gray-700'}`}
                  onClick={() => { updateBlueTeamCount(1); debouncedUpdateScores(); }}
                >
                  1
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className={`text-xs ${blueTeamCount === 2 ? 'bg-blue-700 text-white' : 'bg-gray-700'}`}
                  onClick={() => { updateBlueTeamCount(2); debouncedUpdateScores(); }}
                >
                  2
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className={`text-xs ${blueTeamCount === 3 ? 'bg-blue-700 text-white' : 'bg-gray-700'}`}
                  onClick={() => { updateBlueTeamCount(3); debouncedUpdateScores(); }}
                >
                  3
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className={`text-xs ${blueTeamCount === 4 ? 'bg-blue-700 text-white' : 'bg-gray-700'}`}
                  onClick={() => { updateBlueTeamCount(4); debouncedUpdateScores(); }}
                >
                  4
                </Button>
              </div>
            </div>
            
            {/* Basic Scoring */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="blueAutoScore" className="text-blue-200">Auto Score</Label>
                  <div className="flex">
                    <Button 
                      size="icon"
                      variant="outline" 
                      className="bg-blue-800 text-blue-100 rounded-r-none border-blue-600"
                      onClick={() => { setBlueAutoScore((prev: number) => Math.max(0, prev - 5)); debouncedUpdateScores(); }}
                    >
                      -
                    </Button>
                    <Input
                      id="blueAutoScore"
                      type="number"
                      value={isNaN(blueAutoScore) ? 0 : blueAutoScore}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                        setBlueAutoScore(isNaN(val) ? 0 : val);
                        debouncedUpdateScores();
                      }}
                      onBlur={debouncedUpdateScores}
                      className="text-center border-blue-600 bg-blue-900 text-blue-100 rounded-none"
                    />
                    <Button 
                      size="icon"
                      variant="outline" 
                      className="bg-blue-800 text-blue-100 rounded-l-none border-blue-600"
                      onClick={() => { setBlueAutoScore((prev: number) => prev + 5); debouncedUpdateScores(); }}
                    >
                      +
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blueDriveScore" className="text-blue-200">Drive Score</Label>
                  <div className="flex">
                    <Button 
                      size="icon"
                      variant="outline" 
                      className="bg-blue-800 text-blue-100 rounded-r-none border-blue-600"
                      onClick={() => { setBlueDriveScore((prev: number) => Math.max(0, prev - 5)); debouncedUpdateScores(); }}
                    >
                      -
                    </Button>
                    <Input
                      id="blueDriveScore"
                      type="number"
                      value={isNaN(blueDriveScore) ? 0 : blueDriveScore}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                        setBlueDriveScore(isNaN(val) ? 0 : val);
                        debouncedUpdateScores();
                      }}
                      onBlur={debouncedUpdateScores}
                      className="text-center border-blue-600 bg-blue-900 text-blue-100 rounded-none"
                    />
                    <Button 
                      size="icon"
                      variant="outline" 
                      className="bg-blue-800 text-blue-100 rounded-l-none border-blue-600"
                      onClick={() => { setBlueDriveScore((prev: number) => prev + 5); debouncedUpdateScores() }}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Game Elements Accordion */}
            <Accordion type="single" collapsible className="bg-blue-950 rounded-md overflow-hidden">
              <AccordionItem value="blue-elements" className="border-blue-700">
                <AccordionTrigger className="px-3 py-2 text-blue-200 hover:text-blue-100 hover:no-underline">
                  Game Elements Scoring
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  {blueGameElements.length === 0 ? (
                    <div className="text-center py-2 text-blue-300">
                      No game elements added
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {blueGameElements.map((item, index) => (
                        <div key={index} className="flex justify-between items-center bg-blue-950 p-2 rounded-md">
                          <div className="flex-1">
                            <div className="font-medium text-blue-200">{item.element}</div>
                            <div className="text-xs text-blue-300">
                              {item.count} × {item.pointsEach} pts {item.operation === 'add' ? '(added)' : '(multiplied)'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-blue-100">{item.totalPoints} pts</span>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0 text-blue-400 hover:text-blue-100 hover:bg-blue-800"
                              onClick={() => removeGameElement('blue', index)}
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-3 flex justify-center">
                    <Dialog open={isAddingBlueElement} onOpenChange={setIsAddingBlueElement}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-blue-700 text-blue-200 bg-blue-900 bg-opacity-50 hover:bg-blue-800"
                        >
                          + Add Game Element
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-gray-900 border-blue-700 text-gray-100">
                        <DialogHeader>
                          <DialogTitle>Add Blue Game Element</DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4 py-2">
                          <div className="space-y-2">
                            <Label htmlFor="element-name" className="text-blue-200">Element Name</Label>
                            <Input
                              id="element-name"
                              value={newElement.element}
                              onChange={(e) => setNewElement({...newElement, element: e.target.value})}
                              className="bg-gray-800 border-blue-700 text-blue-100"
                              placeholder="e.g., Ball, Robot, Zone"
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="element-count" className="text-blue-200">Count</Label>
                              <Input
                                id="element-count"
                                type="number"
                                value={isNaN(newElement.count) ? 1 : newElement.count}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 1 : parseInt(e.target.value);
                                  setNewElement({...newElement, count: isNaN(val) ? 1 : val});
                                }}
                                className="bg-gray-800 border-blue-700 text-blue-100"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="element-points" className="text-blue-200">Points Each</Label>
                              <Input
                                id="element-points"
                                type="number"
                                value={newElement.pointsEach}
                                onChange={(e) => {
                                  const inputValue = e.target.value;
                                  const numValue = inputValue === '' ? 0 : parseInt(inputValue, 10);
                                  setNewElement({
                                    ...newElement, 
                                    pointsEach: isNaN(numValue) ? newElement.pointsEach : numValue
                                  });
                                }}
                                className="bg-gray-800 border-blue-700 text-blue-100"
                                min="0"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="element-operation" className="text-blue-200">Operation</Label>
                            <Select
                              value={newElement.operation}
                              onValueChange={(value) => setNewElement({...newElement, operation: value})}
                            >
                              <SelectTrigger id="element-operation" className="bg-gray-800 border-blue-700 text-blue-100">
                                <SelectValue placeholder="Select operation" />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-800 text-blue-100">
                                <SelectItem value="multiply">Multiply (Count × Points)</SelectItem>
                                <SelectItem value="add">Add (Count + Points)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="bg-gray-800 p-3 rounded-md mt-2 text-center">
                            <div className="text-sm text-gray-400">Preview:</div>
                            <div className="text-lg font-bold text-blue-100">
                              {newElement.operation === 'multiply'
                                ? `${newElement.count} × ${newElement.pointsEach} = ${newElement.count * newElement.pointsEach} points`
                                : `${newElement.count} + ${newElement.pointsEach} = ${newElement.count + newElement.pointsEach} points`
                              }
                            </div>
                          </div>
                        </div>
                        
                        <DialogFooter>
                          <Button 
                            variant="outline" 
                            onClick={() => setIsAddingBlueElement(false)}
                            className="border-gray-600 text-gray-300 hover:bg-gray-800"
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={addBlueGameElement}
                            className="bg-blue-700 text-white hover:bg-blue-600"
                          >
                            Add Element
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {blueGameElements.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-blue-700 flex justify-between items-center">
                      <span className="text-blue-200">Elements Total:</span>
                      <span className="font-bold text-blue-100">
                        {blueGameElements.reduce((sum, item) => sum + item.totalPoints, 0)} pts
                      </span>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="mt-4 pt-3 border-t-2 border-blue-700 bg-blue-800 rounded-lg p-3">
              <div className="flex flex-col space-y-1">
                <div className="flex justify-between items-center text-sm text-blue-200">
                  <span>Auto + Teleop:</span>
                  <span>{blueAutoScore + blueDriveScore} pts</span>
                </div>
                {blueGameElements.length > 0 && (
                  <div className="flex justify-between items-center text-sm text-blue-200">
                    <span>Game Elements:</span>
                    <span>{blueGameElements.reduce((sum, item) => sum + item.totalPoints, 0)} pts</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm text-blue-200">
                  <span>Team Count Multiplier:</span>
                  <span>{blueMultiplier}×</span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold text-blue-100 pt-2 mt-1 border-t border-blue-700">
                  <span>Total Score:</span>
                  <span>
                    {Math.round(
                      (blueAutoScore + blueDriveScore + blueGameElements.reduce((sum, item) => sum + item.totalPoints, 0)) * blueMultiplier
                    )} pts
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          onClick={handleUpdateScores} 
          className="flex-1 mr-2"
          disabled={!selectedMatchId}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
          Update Scores
        </Button>
        <Button 
          onClick={handleSubmitScores} 
          className="flex-1 bg-green-700 hover:bg-green-600 text-white font-bold"
          disabled={!selectedMatchId}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Submit Final Scores
        </Button>
      </CardFooter>
    </Card>
  );
}