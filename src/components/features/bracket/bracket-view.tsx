"use client";

import dynamic from "next/dynamic";
import BracketColumn from "@/components/features/bracket/bracket-column";
import type { NormalizedBracket } from "@/utils/bracket-normalizer";
import type { StageBracketResponse } from "@/types/match.types";

const EnhancedEliminationBracket = dynamic<{ bracket: StageBracketResponse }>(
  () => import("@/components/features/bracket/gloot-bracket-view").then((mod) => mod.GlootBracketView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] items-center justify-center text-sm text-slate-500">
        Preparing bracket view…
      </div>
    ),
  }
);
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BracketViewProps {
  normalizedBracket: NormalizedBracket;
  stageName?: string;
  stageType?: string;
  generatedAt?: string;
  teamsPerAlliance?: number;
  rawBracket?: StageBracketResponse | null;
}

const BracketView = ({
  normalizedBracket,
  stageName,
  stageType,
  generatedAt,
  teamsPerAlliance,
  rawBracket,
}: BracketViewProps) => {
  const canUseEnhancedElimination =
    normalizedBracket.type === "elimination" && rawBracket && rawBracket.structure.type === "elimination";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-base font-semibold text-gray-900">
            {stageName ? `${stageName} Bracket` : "Stage Bracket"}
          </h4>
          {stageType && (
            <p className="text-sm text-gray-600 capitalize">{stageType.toLowerCase()} stage</p>
          )}
          {typeof teamsPerAlliance === "number" && teamsPerAlliance > 0 && (
            <p className="text-xs text-gray-500">Alliance size: {teamsPerAlliance}</p>
          )}
        </div>
        {generatedAt && (
          <span className="text-xs text-gray-500">
            Updated {new Date(generatedAt).toLocaleString()}
          </span>
        )}
      </header>

      {normalizedBracket.type === "swiss" && normalizedBracket.buckets.length > 0 && (
        <TooltipProvider>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h5 className="text-sm font-semibold text-gray-800">Record Buckets</h5>
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-semibold cursor-help"
                    aria-label="Swiss bracket explanation"
                  >
                    ?
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-sm text-blue-50 bg-blue-700">
                  Teams move between buckets based on wins and losses. Arrows indicate where winners and losers advance after each round.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex flex-wrap gap-2">
              {normalizedBracket.buckets.map((bucket) => (
                <div
                  key={bucket.record}
                  className="px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold"
                >
                  {bucket.record} • {bucket.matches.length} match{bucket.matches.length === 1 ? "" : "es"}
                </div>
              ))}
            </div>
          </div>
        </TooltipProvider>
      )}

      {canUseEnhancedElimination ? (
        <div className="w-full overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-lg relative">
          {/* Compact bracket info */}
          {typeof teamsPerAlliance === "number" && teamsPerAlliance > 2 && (
            <div className="absolute top-3 right-3 z-10 bg-blue-50/90 backdrop-blur-sm rounded px-2 py-1 text-xs font-semibold text-blue-700 border border-blue-200/50 shadow-sm">
              {teamsPerAlliance}v{teamsPerAlliance}
            </div>
          )}
          <div className="w-full">
            <EnhancedEliminationBracket bracket={rawBracket} />
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-6 min-w-full snap-x snap-mandatory pb-2">
            {normalizedBracket.columns.map((column) => (
              <BracketColumn key={column.key} label={column.label} matches={column.matches} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BracketView;
