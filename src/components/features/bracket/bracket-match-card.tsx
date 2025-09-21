"use client";

import type { BracketAlliance, BracketMatch } from "@/types/match.types";
import { cn } from "@/lib/utils";

interface BracketMatchCardProps {
  match: BracketMatch;
}

const statusStyles: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700 border-gray-200",
  IN_PROGRESS: "bg-amber-100 text-amber-800 border-amber-200",
  COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CANCELLED: "bg-rose-100 text-rose-700 border-rose-200",
};

const formatTime = (value?: string | null) => {
  if (!value) return "TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBD";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const getAllianceScore = (alliance: BracketAlliance) => {
  if (typeof alliance.score === "number") return alliance.score;
  const total = (alliance.autoScore ?? 0) + (alliance.driveScore ?? 0);
  return total || undefined;
};

const getAllianceLabel = (alliance: BracketAlliance) => {
  if (!alliance.teamAlliances?.length) return "TBD";
  return alliance.teamAlliances
    .map((team) => team.teamNumber || team.teamName || "TBD")
    .join(" • ");
};

const getAllianceAriaLabel = (alliance: BracketAlliance) => {
  if (!alliance.teamAlliances?.length) return "No teams assigned";
  return alliance.teamAlliances
    .map((team) => {
      const name = team.teamName || team.teamNumber || "Unknown team";
      return team.isSurrogate ? `${name} (surrogate)` : name;
    })
    .join(", ");
};

const BracketMatchCard = ({ match }: BracketMatchCardProps) => {
  const redAlliance = match.alliances?.find((alliance) => alliance.color === "RED");
  const blueAlliance = match.alliances?.find((alliance) => alliance.color === "BLUE");

  const winningColor = match.winningAlliance;
  const statusClass = statusStyles[match.status] ?? statusStyles.PENDING;

  return (
    <article
      tabIndex={0}
      role="group"
      aria-label={`Match ${match.matchNumber}, ${match.status.replace(/_/g, " ")}`}
      className="border border-gray-200 rounded-xl shadow-sm bg-white overflow-hidden min-w-[240px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <header className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="text-xs font-semibold text-gray-700">
          Match {match.matchNumber}
        </div>
        <div className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", statusClass)}>
          {match.status.replace(/_/g, " ")}
        </div>
      </header>
      <div className="px-3 py-2 text-xs text-gray-500 flex items-center justify-between border-b border-gray-200">
        <span>{formatTime(match.scheduledTime || match.startTime)}</span>
        {match.recordBucket && (
          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-semibold">
            {match.recordBucket}
          </span>
        )}
      </div>
      <div className="divide-y divide-gray-200">
        {redAlliance && (
          <AllianceRow
            alliance={redAlliance}
            isWinner={winningColor === "RED"}
            labelClass="text-red-600"
          />
        )}
        {blueAlliance && (
          <AllianceRow
            alliance={blueAlliance}
            isWinner={winningColor === "BLUE"}
            labelClass="text-blue-600"
          />
        )}
      </div>
    </article>
  );
};

interface AllianceRowProps {
  alliance: BracketAlliance;
  isWinner: boolean;
  labelClass: string;
}

const AllianceRow = ({ alliance, isWinner, labelClass }: AllianceRowProps) => {
  const score = getAllianceScore(alliance);

  return (
    <div
      className={cn(
        "px-3 py-3 flex items-center justify-between gap-3 bg-white",
        isWinner && "bg-green-50"
      )}
      aria-label={`${alliance.color === "RED" ? "Red" : "Blue"} alliance: ${getAllianceAriaLabel(alliance)}`}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <div className={cn("text-[10px] font-semibold uppercase tracking-wide", labelClass)}>
            {alliance.color === "RED" ? "Red Alliance" : "Blue Alliance"}
          </div>
          {isWinner && (
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              Winner
            </span>
          )}
        </div>
        <ul className="text-sm font-medium text-gray-900 space-y-1">
          {alliance.teamAlliances?.map((team) => (
            <li
              key={team.id}
              className="flex items-center gap-2"
            >
              <span className="inline-flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-600">
                  {team.teamNumber?.slice(-2) || team.teamName?.[0] || "?"}
                </span>
                <span className="truncate">
                  {team.teamNumber ? `#${team.teamNumber}` : null}
                  {team.teamNumber && team.teamName ? " • " : null}
                  {team.teamName}
                </span>
              </span>
              {team.isSurrogate && (
                <span className="text-[10px] font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                  Surrogate
                </span>
              )}
            </li>
          )) || <li className="text-sm text-gray-500">Teams TBA</li>}
        </ul>
      </div>
      {typeof score === "number" && (
        <div className="text-base font-bold text-gray-900 min-w-[2rem] text-right">
          {score}
        </div>
      )}
    </div>
  );
};

export default BracketMatchCard;
