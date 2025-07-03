import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "@/components/ui/card";


interface ConnectionStatusProps {
  isConnected: boolean;
  tournamentId?: string | null;
  currentTournament?: string | null;
  selectedFieldId?: string | null;
  onFieldSelect?: (fieldId: string | null) => void;
}

/**
 * ConnectionStatus component displays the current connection state
 * to the WebSocket server and the active tournament ID
 */
const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  tournamentId,
  currentTournament,
  selectedFieldId,
  onFieldSelect,
}) => {
  // Use whichever tournament ID is provided
  const activeTournament = tournamentId || currentTournament;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Connection Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
            aria-hidden="true"
          />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        {activeTournament && (
          <div className="mt-2">
            <span className="text-sm text-muted-foreground">
              Tournament ID: {activeTournament}
            </span>
          </div>
        )}
        {onFieldSelect && (
          <div className="mt-2">
            <span className="text-sm text-muted-foreground">Field: </span>
            <span className="text-sm font-semibold">{selectedFieldId || 'All Fields'}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConnectionStatus;