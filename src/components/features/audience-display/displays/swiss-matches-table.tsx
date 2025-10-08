import React from "react";
import { Match } from "./schedule-display";
import Image from "next/image";
interface SwissMatchesTableProps {
  matches: Match[];
  stageName?: string;
}

export const SwissMatchesTable: React.FC<SwissMatchesTableProps> = ({
  matches,
  stageName,
}) => {
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return dateString;
    }
  };

  const getTeamDisplay = (
    team: { name: string; teamNumber?: string } | undefined
  ) => {
    if (!team) return "TBD";
    return team.teamNumber ? `#${team.teamNumber} ${team.name}` : team.name;
  };

  const getTeams = (match: Match, color: "RED" | "BLUE") => {
    const alliance = match.alliances?.find((a) => a.color === color);
    if (!alliance?.teamAlliances) return ["TBD"];
    return alliance.teamAlliances.map((ta) => getTeamDisplay(ta.team));
  };

  const getStatusColor = (status: Match["status"]) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800";
      case "PENDING":
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getWinnerDisplay = (match: Match) => {
    if (match.status !== "COMPLETED" || !match.winningAlliance) return null;

    const winnerColor =
      match.winningAlliance === "RED" ? "text-red-600" : "text-blue-600";
    return (
      <span className={`font-bold text-lg ${winnerColor}`}>
        {match.winningAlliance} WINS
      </span>
    );
  };

  if (!matches.length) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 text-lg">
          No matches available for {stageName}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black text-white w-full h-full flex flex-col relative overflow-hidden">
      {/* Header with responsive sizing */}
      <div className="flex-shrink-0 text-center py-2 bg-white border-b">
        <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800" style={{ fontSize: 'clamp(1.25rem, 2.5vw, 1.875rem)' }}>
          Danh sách các trận đấu thuộc {stageName}
        </h3>
      </div>

      {/* Table Container with responsive scaling */}
      <div className="flex-1 overflow-auto p-1 md:p-2">
        <div className="mx-auto w-full max-w-[95%]">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" style={{ fontSize: 'clamp(0.75rem, 1.2vw, 1rem)' }}>
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left font-medium text-gray-500 uppercase tracking-wider w-16" style={{ fontSize: 'clamp(0.7rem, 1vw, 0.875rem)' }}>
                      Match
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left font-medium text-gray-500 uppercase tracking-wider w-20" style={{ fontSize: 'clamp(0.7rem, 1vw, 0.875rem)' }}>
                      Time
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left font-medium text-gray-500 uppercase tracking-wider w-65" style={{ fontSize: 'clamp(0.7rem, 1vw, 0.875rem)' }}>
                      Red Alliance
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-center font-medium text-gray-500 uppercase tracking-wider w-30" style={{ fontSize: 'clamp(0.7rem, 1vw, 0.875rem)' }}>
                      Red Score
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-center font-medium text-gray-500 uppercase tracking-wider w-30" style={{ fontSize: 'clamp(0.7rem, 1vw, 0.875rem)' }}>
                      Blue Score
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left font-medium text-gray-500 uppercase tracking-wider w-65" style={{ fontSize: 'clamp(0.7rem, 1vw, 0.875rem)' }}>
                      Blue Alliance
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-center font-medium text-gray-500 uppercase tracking-wider w-16" style={{ fontSize: 'clamp(0.7rem, 1vw, 0.875rem)' }}>
                      Status
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-center font-medium text-gray-500 uppercase tracking-wider w-16" style={{ fontSize: 'clamp(0.7rem, 1vw, 0.875rem)' }}>
                      Result
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {matches
                    .sort((a, b) => {
                      // Sort by scheduled time, then by match number
                      const timeA = new Date(a.scheduledTime).getTime();
                      const timeB = new Date(b.scheduledTime).getTime();
                      if (timeA !== timeB) return timeA - timeB;

                      const numA =
                        typeof a.matchNumber === "string"
                          ? parseInt(a.matchNumber)
                          : a.matchNumber;
                      const numB =
                        typeof b.matchNumber === "string"
                          ? parseInt(b.matchNumber)
                          : b.matchNumber;
                      return numA - numB;
                    })
                    .map((match) => {
                      const redTeams = getTeams(match, "RED");
                      const blueTeams = getTeams(match, "BLUE");

                      return (
                        <tr key={match.id} className="hover:bg-gray-50" style={{ height: 'clamp(3rem, 8vh, 5rem)' }}>
                          <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap font-medium text-gray-900 w-20" style={{ fontSize: 'clamp(0.8rem, 1.2vw, 1rem)' }}>
                            #{match.matchNumber}
                          </td>
                          <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap font-medium text-gray-900 w-24" style={{ fontSize: 'clamp(0.8rem, 1.2vw, 1rem)' }}>
                            {formatTime(match.scheduledTime)}
                          </td>
                          <td className={`px-2 md:px-4 py-2 md:py-3 text-gray-900 w-56 ${match.winningAlliance === 'RED' ? 'bg-red-100' : ''}`}>
                            <div className="space-y-1">
                              {redTeams.map((team, idx) => (
                                <div
                                  key={idx}
                                  className="text-red-600 font-semibold"
                                  style={{ fontSize: 'clamp(0.75rem, 1.1vw, 1.125rem)' }}
                                >
                                  {team}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className={`px-2 md:px-4 py-2 md:py-3 whitespace-nowrap text-center font-bold text-red-600 w-20 ${match.winningAlliance === 'RED' ? 'bg-red-100' : ''}`} style={{ fontSize: 'clamp(1rem, 1.5vw, 1.5rem)' }}>
                            {match.redScore !== undefined &&
                            match.redScore !== null
                              ? match.redScore
                              : "-"}
                          </td>
                          <td className={`px-2 md:px-4 py-2 md:py-3 whitespace-nowrap text-center font-bold text-blue-600 w-20 ${match.winningAlliance === 'BLUE' ? 'bg-blue-100' : ''}`} style={{ fontSize: 'clamp(1rem, 1.5vw, 1.5rem)' }}>
                            {match.blueScore !== undefined &&
                            match.blueScore !== null
                              ? match.blueScore
                              : "-"}
                          </td>
                          <td className={`px-2 md:px-4 py-2 md:py-3 text-gray-900 w-56 ${match.winningAlliance === 'BLUE' ? 'bg-blue-100' : ''}`}>
                            <div className="space-y-1">
                              {blueTeams.map((team, idx) => (
                                <div
                                  key={idx}
                                  className="text-blue-600 font-semibold"
                                  style={{ fontSize: 'clamp(0.75rem, 1.1vw, 1.125rem)' }}
                                >
                                  {team}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap text-center w-24">
                            <span
                              className={`inline-flex px-2 py-1 font-semibold rounded-full ${getStatusColor(
                                match.status
                              )}`}
                              style={{ fontSize: 'clamp(0.7rem, 0.9vw, 0.875rem)' }}
                            >
                              {match.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap text-center w-24" style={{ fontSize: 'clamp(0.8rem, 1vw, 1rem)' }}>
                            {getWinnerDisplay(match)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};

export default SwissMatchesTable;
