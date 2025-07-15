'use client';
import { useRouter } from 'next/navigation';
import { useTournaments} from '@/hooks/tournaments/use-tournaments';
import type { Tournament } from '@/types/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useState } from 'react';

export default function AudienceDisplayPage() {
  // Search/filter state
  const [search, setSearch] = useState('');
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('all');
  const router = useRouter();
  // Fetch tournaments
  const { data: tournaments = [], isLoading, isError } = useTournaments();

  // Filter tournaments by search
  const filtered = tournaments.filter((t: Tournament) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  // Tournament selector options
  const tournamentOptions = [
    { id: 'all', name: 'All Tournaments' },
    ...filtered
  ];

  // Filtered tournaments to display
  const displayTournaments = selectedTournamentId === 'all'
    ? filtered
    : filtered.filter(t => t.id === selectedTournamentId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-10 px-4 w-full">
      <h1 className="text-4xl font-extrabold text-center mb-10 text-gray-900 drop-shadow-lg tracking-tight">
        Robotics Tournaments
      </h1>
      <div className="max-w-3xl mx-auto mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-2/3">
          <input
        type="text"
        placeholder="Search tournaments by name..."
        className="w-full px-4 py-3 border border-blue-300 rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white text-blue-900 font-semibold placeholder-blue-400"
        value={search}
        onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full md:w-1/3">
          <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
        <SelectTrigger className="w-full bg-white border border-blue-300 rounded-xl px-4 py-3 shadow-md focus:ring-2 focus:ring-blue-600 text-blue-900 font-semibold">
          <SelectValue placeholder="Select tournament" className="text-blue-900 font-semibold" />
        </SelectTrigger>
        <SelectContent>
          {tournamentOptions.map(t => (
            <SelectItem
          key={t.id}
          value={t.id}
          className="text-blue-900 font-semibold data-[state=checked]:bg-blue-100 data-[state=checked]:text-blue-900"
            >
          {t.id === 'all' ? (
            <span className="font-bold text-blue-800">🏆 {t.name}</span>
          ) : (
            <span className="font-bold">{t.name}</span>
          )}
            </SelectItem>
          ))}
        </SelectContent>
          </Select>
        </div>
      </div>
      {isLoading && (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}
      {isError && (
        <div className="text-center text-red-800 bg-red-50 border border-red-200 rounded-xl p-6 font-semibold text-lg py-10 mx-auto max-w-md">
          Could not load tournaments. Please try again later.
        </div>
      )}
      {!isLoading && !isError && displayTournaments.length === 0 && (
        <div className="text-center text-gray-600 font-semibold text-lg py-10">
          No tournaments available at the moment
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 max-w-6xl mx-auto mt-6">
        {displayTournaments.map((t: Tournament) => (
          <Card
            key={t.id}
            className="bg-white border-2 border-blue-700 shadow-2xl rounded-2xl hover:shadow-2xl transition-all duration-200 cursor-pointer hover:border-blue-900 group flex flex-col justify-between min-h-[320px]"
            onClick={() => router.push(`/audience-display/${t.id}`)}
          >
            <CardHeader className="pb-2 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-extrabold text-blue-900 group-hover:text-blue-800 transition-colors">
                  {t.name}
                </CardTitle>
                <Badge
                  variant="outline"
                  className="bg-blue-800 text-white border-blue-900 font-bold px-3 py-1 rounded-full text-xs shadow-md"
                >
                  Upcoming
                </Badge>
              </div>
              <div className="text-blue-900 text-base font-bold mt-1">
                <span className="font-extrabold text-blue-800">Dates:</span> {formatDateRange(t.startDate, t.endDate)}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between pb-2">
              {t.description && <div className="text-gray-700 mb-3 text-base font-medium line-clamp-3">{t.description}</div>}
              {t.numberOfFields !== undefined && (
                <div className="text-blue-800 mb-2 text-sm font-semibold">
                  <span className="font-bold text-blue-900">Fields:</span> {t.numberOfFields}
                </div>
              )}
              {t.admin && t.admin.username && (
                <div className="text-blue-700 text-xs font-semibold">Admin: <span className="font-bold">{t.admin.username}</span></div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between items-center pt-4 border-t border-blue-100">
              <span className="text-blue-900 font-bold text-xs uppercase tracking-wide">Location TBA</span>
              <button
                className="bg-blue-700 hover:bg-blue-900 text-white font-bold py-2 px-5 rounded-lg shadow-lg transition-colors duration-200 text-base"
                onClick={e => { e.stopPropagation(); router.push(`/audience-display/${t.id}`); }}
              >
                View Tournament
              </button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return '';
  const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  if (s.toDateString() === e.toDateString()) return s.toLocaleDateString(undefined, opts);
  return `${s.toLocaleDateString(undefined, opts)} - ${e.toLocaleDateString(undefined, opts)}`;
}