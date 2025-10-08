import React from "react";
import { useMemo } from "react";
import { Users } from "lucide-react";
import { Team } from "@/types/team.types";
import { format } from "date-fns";
import DataTable, {
  defaultTableState,
} from "@/components/data-table/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";

interface TeamsDisplayProps {
  teams: Team[];
  isLoading: boolean;
}

interface AudienceTeamData {
  id: string;
  name: string;
  teamNumber: string;
  memberCount: number;
  organization: string;
  location?: string;
  createdAt: string;
}

/**
 * Empty state for when no teams are found
 */
const TeamsTableEmpty = React.memo(function TeamsTableEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Users className="mx-auto h-16 w-16 md:h-20 md:w-20 text-muted-foreground mb-6" />
      <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
        No teams found
      </h3>
      <p className="text-base md:text-lg text-muted-foreground">
        No teams have been registered for this tournament yet.
      </p>
    </div>
  );
});

export const TeamsDisplay: React.FC<TeamsDisplayProps> = ({
  teams,
  isLoading,
}) => {
  // Process teams data for the table
  const tableData = useMemo((): AudienceTeamData[] => {
    return teams.map((team) => {
      const memberCount =
        team.teamMemberCount ??
        team._count?.teamMembers ??
        team.teamMembers?.length ??
        0;
      const organization =
        team.teamMembers?.[0]?.organization || team.user?.email || "N/A";
      const location = undefined;
      const createdDate = new Date(team.createdAt);

      return {
        id: team.id,
        name: team.name,
        teamNumber: team.teamNumber || "N/A",
        memberCount,
        organization,
        location,
        createdAt: format(createdDate, "MMM d, yyyy"),
      };
    });
  }, [teams]);

  // Define table columns optimized for audience display
  const columns = useMemo(() => {
    const cols: ColumnDef<any>[] = [
      {
        id: "index",
        header: "STT",
        cell: ({ row }: any) => (
          <div className="text-base md:text-lg text-foreground font-bold text-center">
            {row.index + 1}
          </div>
        ),
        enableSorting: false,
        size: 80,
      },
      {
        accessorKey: "teamNumber",
        header: "Mã đội thi #",
        cell: ({ getValue }: any) => (
          <div className="text-base md:text-lg text-foreground font-mono font-semibold">
            {getValue() as string}
          </div>
        ),
        enableSorting: true,
        size: 140,
      },
      {
        accessorKey: "name",
        header: "Tên đội thi",
        cell: ({ getValue }: any) => (
          <div className="text-lg md:text-lg font-bold text-foreground">
            {getValue() as string}
          </div>
        ),
        enableSorting: true,
        size: 300,
      },
      {
        accessorKey: "memberCount",
        header: "Số lượng thành viên",
        cell: ({ getValue }: any) => (
          <div className="flex items-center">
            <Users className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground mr-2" />
            <span className="text-lg md:text-lg font-semibold text-foreground">
              {getValue() as number}
            </span>
          </div>
        ),
        enableSorting: true,
        size: 140,
      },
      {
        accessorKey: "organization",
        header: "Trường / Tổ chức",
        cell: ({ getValue }: any) => (
          <div className="text-lg md:text-lg text-foreground max-w-xs truncate font-medium">
            {getValue() as string}
          </div>
        ),
        enableSorting: true,
        size: 250,
      },
      {
        accessorKey: "location",
        header: "Khu vực",
        cell: ({ row }: any) => {
          const team = row.original as AudienceTeamData;
          if (!team.location)
            return (
              <span className="text-muted-foreground text-base md:text-lg">
                —
              </span>
            );
          return (
            <span className="text-lg md:text-lg text-foreground font-medium">
              {team.location}
            </span>
          );
        },
        enableSorting: true,
        size: 200,
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
            Danh sách đội thi tham gia giải đấu Motion In Fire
          </h1>
          <p className="text-black text-lg md:text-xl animate-fade-in-slow">
            Danh sách gồm có tổng cộng{" "}
            <span className="text-primary font-bold text-3xl">
              {teams.length}
            </span>{" "}
            đội thi
          </p>
        </div>
      </div>

      {/* Teams List Table Area */}
      <div className="flex-1 p-1 overflow-auto pt-[120px] flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-full min-h-[300px] bg-white rounded-xl shadow-lg p-8 animate-pulse">
            <div className="text-xl text-slate-500 font-semibold mb-4">
              Loading teams...
            </div>
          </div>
        ) : tableData.length > 0 ? (
          <div
            className="bg-white rounded-xl shadow-lg overflow-hidden animate-fade-in"
            style={{ width: "80%", maxWidth: "1440px" }}
          >
            <style jsx global>{`
              .audience-teams-table .bg-card {
                background-color: white !important;
                border: none !important;
                box-shadow: none !important;
              }
              .audience-teams-table .bg-muted {
                background-color: #f3f4f6 !important;
              }
              .audience-teams-table .hover\:bg-muted\/50:hover {
                background-color: #f9fafb !important;
              }
              .audience-teams-table .text-foreground {
                color: #111827 !important;
              }
              .audience-teams-table .text-muted-foreground {
                color: #6b7280 !important;
              }
              .audience-teams-table .border-border {
                border-color: #e5e7eb !important;
              }
              .audience-teams-table th {
                background-color: #f3f4f6 !important;
                color: #111827 !important;
                font-weight: 700 !important;
                font-size: 1.125rem !important;
                padding: 0.75rem !important;
              }
              .audience-teams-table td {
                padding: 0.75rem !important;
                border-bottom: 1px solid #e5e7eb !important;
              }
              .audience-teams-table tbody tr:last-child td {
                border-bottom: none !important;
              }
            `}</style>
            <div className="audience-teams-table">
              <DataTable
                data={tableData}
                columns={columns as any}
                totalCount={tableData.length}
                isLoading={isLoading}
                showPagination={false}
                tableState={{ ...defaultTableState, pageSize: 20 }}
                setTableState={() => {}} // Read-only for audience display
                emptyState={<TeamsTableEmpty />}
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
              No Teams Available
            </h3>
            <p className="text-base text-slate-500">
              Teams for this tournament will appear here.
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
              sizes="400px"
              className="object-contain"
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
};

export default TeamsDisplay;
