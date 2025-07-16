import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Team, Match } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { Calendar, Trophy, Target, Users } from 'lucide-react';

const Home = () => {
  const [groupedTeams, setGroupedTeams] = useState<Record<string, Team[]>>({});
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<string>('A');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch teams with calculated stats
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*');

      if (teamsError) throw teamsError;

      // Calculate additional stats and group teams
      const teamsWithStats = teamsData.map((team) => ({
        ...team,
        matches_played: team.wins + team.draws + team.losses,
        points: team.wins * 3 + team.draws,
        goal_difference: team.goals_for - team.goals_against,
      }));

      // Group teams by group_name and sort within each group
      const grouped = teamsWithStats.reduce((acc, team) => {
        if (!acc[team.group_name]) {
          acc[team.group_name] = [];
        }
        acc[team.group_name].push(team);
        return acc;
      }, {} as Record<string, Team[]>);

      // Sort teams within each group by points, then goal difference
      Object.keys(grouped).forEach(groupName => {
        grouped[groupName].sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          return b.goal_difference - a.goal_difference;
        });
      });

      setGroupedTeams(grouped);

      // Fetch recent matches
      const { data: recentData, error: recentError } = await supabase
        .from('matches')
        .select(`
          *,
          home_team_data:teams!matches_home_team_fkey(name, logo_url),
          away_team_data:teams!matches_away_team_fkey(name, logo_url)
        `)
        .eq('played', true)
        .order('date', { ascending: false })
        .limit(3);

      if (recentError) throw recentError;
      setRecentMatches(recentData || []);

      // Fetch upcoming matches
      const { data: upcomingData, error: upcomingError } = await supabase
        .from('matches')
        .select(`
          *,
          home_team_data:teams!matches_home_team_fkey(name, logo_url),
          away_team_data:teams!matches_away_team_fkey(name, logo_url)
        `)
        .eq('played', false)
        .order('date', { ascending: true })
        .limit(3);

      if (upcomingError) throw upcomingError;
      setUpcomingMatches(upcomingData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Group Standings</h1>
        <p className="text-gray-600">Current group standings and recent results</p>
      </div>

      {/* Group Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {['A', 'B', 'C', 'D'].map((group) => (
              <button
                key={group}
                onClick={() => setActiveGroup(group)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeGroup === group
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Group {group}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Group Table */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Group {activeGroup}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  MP
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  W
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  D
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  L
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GF
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GA
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GD
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pts
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(groupedTeams[activeGroup] || []).map((team, index) => (
                <tr key={team.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img className="h-8 w-8 rounded-full" src={team.logo_url} alt={team.name} />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{team.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    {team.matches_played}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    {team.wins}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    {team.draws}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    {team.losses}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    {team.goals_for}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    {team.goals_against}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    <span className={team.goal_difference >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {team.goal_difference > 0 ? '+' : ''}{team.goal_difference}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900">
                    {team.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent and Upcoming Matches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Matches */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center mb-4">
            <Trophy className="h-6 w-6 text-emerald-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Recent Results</h2>
          </div>
          <div className="space-y-4">
            {recentMatches.map((match) => (
              <div key={match.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img src={match.home_team_data?.logo_url} alt="" className="h-8 w-8 rounded-full" />
                    <span className="font-medium">{match.home_team_data?.name}</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {match.home_score} - {match.away_score}
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="font-medium">{match.away_team_data?.name}</span>
                    <img src={match.away_team_data?.logo_url} alt="" className="h-8 w-8 rounded-full" />
                  </div>
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  {new Date(match.date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Matches */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center mb-4">
            <Calendar className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Upcoming Fixtures</h2>
          </div>
          <div className="space-y-4">
            {upcomingMatches.map((match) => (
              <div key={match.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img src={match.home_team_data?.logo_url} alt="" className="h-8 w-8 rounded-full" />
                    <span className="font-medium">{match.home_team_data?.name}</span>
                  </div>
                  <div className="text-lg font-bold text-gray-500">vs</div>
                  <div className="flex items-center space-x-3">
                    <span className="font-medium">{match.away_team_data?.name}</span>
                    <img src={match.away_team_data?.logo_url} alt="" className="h-8 w-8 rounded-full" />
                  </div>
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  {new Date(match.date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;