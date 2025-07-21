import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Player, Team } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import DefaultAvatar from '../components/DefaultAvatar';
import { User, Target, Users, Search, Filter } from 'lucide-react';

const Players = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterPlayers();
  }, [players, selectedTeam, searchTerm]);

  const fetchData = async () => {
    try {
      const [playersResponse, teamsResponse] = await Promise.all([
        supabase
          .from('players')
          .select(`
            *,
            team:teams(name, logo_url)
          `)
          .order('goals', { ascending: false }),
        supabase
          .from('teams')
          .select('*')
          .order('name')
      ]);

      if (playersResponse.error) throw playersResponse.error;
      if (teamsResponse.error) throw teamsResponse.error;

      setPlayers(playersResponse.data || []);
      setTeams(teamsResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPlayers = () => {
    let filtered = players;
    
    // Filter by team
    if (selectedTeam !== 'all') {
      filtered = players.filter(player => player.team_id === selectedTeam);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(player => 
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.team?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPlayers(filtered);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">اللاعبون</h1>
        <p className="text-gray-600">جميع لاعبي الدوري</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="البحث عن اللاعبين..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          
          {/* Team Filter */}
          <div className="sm:w-48 flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">جميع الفرق</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Players Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredPlayers.map((player) => (
          <div key={player.id} className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center space-x-4 mb-4">
              <DefaultAvatar type="player" name={player.name} size="lg" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{player.name}</h3>
                <div className="flex items-center space-x-2">
                  {player.team?.logo_url ? (
                    <img 
                      src={player.team.logo_url} 
                      alt="" 
                      className="h-4 w-4 rounded-full"
                    />
                  ) : (
                    <DefaultAvatar type="team" name={player.team?.name} size="sm" />
                  )}
                  <span className="text-sm text-gray-600">{player.team?.name}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm text-gray-600">الأهداف</span>
                </div>
                <span className="text-lg font-bold text-emerald-600">{player.goals}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-gray-600">التمريرات الحاسمة</span>
                </div>
                <span className="text-lg font-bold text-blue-600">{player.assists}</span>
              </div>
              
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">إجمالي المساهمات</span>
                  <span className="text-lg font-bold text-gray-900">
                    {player.goals + player.assists}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Players;