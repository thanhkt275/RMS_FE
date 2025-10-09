import React from "react";
import Image from "next/image";
import DataTable, {
  defaultTableState,
} from "@/components/data-table/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { TeamRanking } from "@/types/stage-advancement.types";

interface TeamInfo {
  teamNumber?: string;
  name?: string;
}

interface RankingRow {
  rank: number;
  teamId: string;
  teamNumber: string;
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
  pointsScored: number;
  pointsConceded: number;
  pointDifferential: number;
  rankingPoints: number;
  opponentWinPercentage: number;
  matchesPlayed: number;
}

export function SwissRankingsDisplay({
  rankings: rawRankings,
  isLoading,
}: {
  rankings: any[];
  isLoading?: boolean;
}) {
  // Transform raw rankings data to table format
  const tableData = React.useMemo((): RankingRow[] => {
    if (!Array.isArray(rawRankings)) return [];

    // Sort by ranking priority: Ranking Points -> OWP -> Point Differential
    const sorted = [...rawRankings].sort((a, b) => {
      // First priority: Ranking Points (higher is better)
      const aRankingPoints = a.rankingPoints ?? 0;
      const bRankingPoints = b.rankingPoints ?? 0;
      if (bRankingPoints !== aRankingPoints)
        return bRankingPoints - aRankingPoints;

      // Second priority: Opponent Win Percentage (higher is better)
      const aOWP = a.opponentWinPercentage ?? 0;
      const bOWP = b.opponentWinPercentage ?? 0;
      if (bOWP !== aOWP) return bOWP - aOWP;

      // Third priority: Point Differential (higher is better)
      const aPointDiff = a.pointDifferential ?? 0;
      const bPointDiff = b.pointDifferential ?? 0;
      if (bPointDiff !== aPointDiff) return bPointDiff - aPointDiff;

      return 0;
    });

    return sorted.map((r, idx) => ({
      rank: idx + 1,
      teamId: r.teamId,
      teamNumber: r.teamNumber || r.team?.teamNumber || "N/A",
      teamName: r.teamName || r.team?.name || "Unknown Team",
      wins: r.wins ?? 0,
      losses: r.losses ?? 0,
      ties: r.ties ?? 0,
      pointsScored: r.totalScore ?? r.pointsScored ?? 0,
      pointsConceded: r.pointsConceded ?? 0,
      pointDifferential: r.pointDifferential ?? 0,
      rankingPoints: r.rankingPoints ?? 0,
      opponentWinPercentage: r.opponentWinPercentage ?? 0,
      matchesPlayed: r.matchesPlayed ?? 0,
    }));
  }, [rawRankings]);

  // Define table columns for rankings display
  const columns = React.useMemo(() => {
    const cols: ColumnDef<any>[] = [
      {
        id: "rank",
        header: "Hạng",
        cell: ({ row }: any) => (
          <div className="text-xl md:text-xl text-foreground font-bold text-center">
            {row.original.rank}
          </div>
        ),
        enableSorting: false,
        size: 80,
      },
      {
        accessorKey: "teamNumber",
        header: "Mã đội",
        cell: ({ getValue }: any) => (
          <div className="text-xl md:text-xl text-foreground font-bold ">
            {getValue() as string}
          </div>
        ),
        enableSorting: true,
        size: 120,
      },
      {
        accessorKey: "teamName",
        header: "Tên đội",
        cell: ({ getValue }: any) => (
          <div className="text-xl md:text-xl font-bold text-foreground">
            {getValue() as string}
          </div>
        ),
        enableSorting: true,
        size: 300,
      },
      {
        accessorKey: "rankingPoints",
        header: "Điểm xếp hạng",
        cell: ({ getValue }: any) => (
          <div className="text-xl md:text-2xl font-bold text-primary text-center">
            {getValue() as number}
          </div>
        ),
        enableSorting: true,
        size: 140,
      },
      {
        accessorKey: "opponentWinPercentage",
        header: "Tỉ lệ thua",
        cell: ({ getValue }: any) => (
          <div className="text-xl md:text-2xl font-bold text-foreground text-center">
            {((getValue() as number) * 100).toFixed(1)}%
          </div>
        ),
        enableSorting: true,
        size: 140,
      },

      {
        accessorKey: "pointsScored",
        header: "Điểm ghi",
        cell: ({ getValue }: any) => (
          <div className="text-xl md:text-2xl font-semibold text-foreground text-center">
            {getValue() as number}
          </div>
        ),
        enableSorting: true,
        size: 120,
      },
      {
        accessorKey: "pointsConceded",
        header: "Điểm thua",
        cell: ({ getValue }: any) => (
          <div className="text-xl md:text-2xl font-semibold text-foreground text-center">
            {getValue() as number}
          </div>
        ),
        enableSorting: true,
        size: 120,
      },
      {
        accessorKey: "pointDifferential",
        header: "Hiệu số",
        cell: ({ getValue }: any) => {
          const value = getValue() as number;
          return (
            <div
              className={`text-xl md:text-2xl font-semibold text-center ${
                value > 0
                  ? "text-green-600"
                  : value < 0
                  ? "text-red-600"
                  : "text-foreground"
              }`}
            >
              {value > 0 ? "+" : ""}
              {value}
            </div>
          );
        },
        enableSorting: true,
        size: 120,
      },
      {
        accessorKey: "matchesPlayed",
        header: "Số trận đã đấu",
        cell: ({ getValue }: any) => (
          <div className="text-lg md:text-2xl font-semibold text-foreground text-center">
            {getValue() as number}
          </div>
        ),
        enableSorting: true,
        size: 100,
      },
      {
        id: "record",
        header: "Thành tích",
        cell: ({ row }: any) => {
          const wins = row.original.wins;
          const ties = row.original.ties;
          const losses = row.original.losses;
          return (
            <div className="text-xl md:text-2xl font-bold text-center">
              <span className="text-green-600">{wins}</span>
              <span className="text-gray-400">-</span>
              <span className="text-yellow-600">{ties}</span>
              <span className="text-gray-400">-</span>
              <span className="text-red-600">{losses}</span>
            </div>
          );
        },
        enableSorting: false,
        size: 150,
      },
      
    ];
    return cols;
  }, []);

  return (
    <div className="bg-black text-white w-screen h-screen flex flex-col relative overflow-hidden">
      {/* Top White Bar */}
      <div className="absolute top-0 left-0 right-0 h-[110px] bg-white z-30 flex items-center justify-center">
        <div className="text-center w-full">
          <h1 className="text-black text-5xl font-bold tracking-tight mb-2">
            Bảng xếp hạng vòng thể thức Thụy Sĩ
          </h1>
          <p className="text-black text-3xl md:text-lg animate-fade-in-slow">
            Bảng xếp hạng gồm có{" "}
            <span className="text-primary font-bold text-3xl">
              {tableData.length}
            </span>{" "}
            đội
          </p>
        </div>
      </div>

      {/* Rankings Content Area */}
      <div className="flex-1 p-1 overflow-auto pt-[120px] flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-full min-h-[300px] bg-white rounded-xl shadow-lg p-8 animate-pulse">
            <div className="text-xl text-slate-500 font-semibold mb-4">
              Loading rankings...
            </div>
          </div>
        ) : tableData.length > 0 ? (
          <div
            className="bg-white rounded-xl shadow-lg overflow-hidden animate-fade-in"
            style={{ width: "80%", maxWidth: "1440px" }}
          >
            <style jsx global>{`
              .audience-rankings-table .bg-card {
                background-color: white !important;
                border: none !important;
                box-shadow: none !important;
              }
              .audience-rankings-table .bg-muted {
                background-color: #f3f4f6 !important;
              }
              .audience-rankings-table .hover\:bg-muted\/50:hover {
                background-color: #f9fafb !important;
              }
              .audience-rankings-table .text-foreground {
                color: #111827 !important;
              }
              .audience-rankings-table .text-muted-foreground {
                color: #6b7280 !important;
              }
              .audience-rankings-table .border-border {
                border-color: #e5e7eb !important;
              }
              .audience-rankings-table th {
                background-color: #f3f4f6 !important;
                color: #111827 !important;
                font-weight: 700 !important;
                font-size: 1.125rem !important;
                padding: 0.75rem !important;
              }
              .audience-rankings-table td {
                padding: 0.75rem !important;
                border-bottom: 1px solid #e5e7eb !important;
              }
              .audience-rankings-table tbody tr:last-child td {
                border-bottom: none !important;
              }
            `}</style>
            <div className="audience-rankings-table">
              <DataTable
                data={tableData}
                columns={columns as any}
                totalCount={tableData.length}
                isLoading={isLoading}
                showPagination={false}
                tableState={{ ...defaultTableState, pageSize: 10 }}
                setTableState={() => {}} // Read-only for audience display
                emptyState={
                  <div className="flex flex-col items-center justify-center py-16 text-center bg-white">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
                      No Rankings Available
                    </h3>
                    <p className="text-base md:text-lg text-gray-600">
                      Rankings for this tournament will appear here.
                    </p>
                  </div>
                }
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-white rounded-xl shadow-lg p-12 text-center animate-fade-in">
            <svg
              className="w-16 h-16 text-slate-300 mb-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zM12 12.75a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
              />
            </svg>
            <h3 className="text-xl font-semibold text-slate-700 mb-3">
              No Rankings Available
            </h3>
            <p className="text-base text-slate-500">
              Rankings for this tournament will appear here.
            </p>
          </div>
        )}
      </div>

      {/* Bottom White Bar - Footer */}
      <footer className="bg-white h-[10%] w-full flex items-center px-8 relative z-20">
        {/* Logos */}
        <div className="flex items-center gap-4 h-full py-2 w-[400px]">
          <div className="relative h-full aspect-square w-full">
            <Image
              src="/btc_trans.png"
              alt="Logo STEAM For Vietnam, Đại học Bách khoa Hà Nội, UNICEF, Đại sứ quán Hoa Kỳ"
              fill
              className="object-contain"
              sizes="400px"
            />
          </div>
        </div>

        {/* Event info */}
        <div className="flex-1 text-center">
          <p className="text-black text-3xl font-bold">
            STEMESE Festival - 19/10 - Đại học Bách Khoa Hà Nội
          </p>
        </div>

        {/* Rankings indicator */}
        <div className="flex items-center justify-end gap-2 w-[320px]">
          <div className="w-[18px] h-[18px] bg-[#00FF2F] rounded-full animate-pulse" />
          <span className="text-[#00FF2F] text-[32px] font-bold">LIVE</span>
        </div>
      </footer>
    </div>
  );
}
