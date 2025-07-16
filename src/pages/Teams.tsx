import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Team } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { Users, Trophy, Target, Filter } from 'lucide-react';

const Teams = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    filterTeams();
  }, [teams, selectedGroup]);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('group_name', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      
      const teamsWithStats = data.map(team => ({
        ...team,
        matches_played: team.wins + team.draws + team.losses,
        points: team.wins * 3 + team.draws,
        goal_difference: team.goals_for - team.goals_against,
      }));

      setTeams(teamsWithStats);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTeams = () => {
    let filtered = teams;
    
    if (selectedGroup !== 'all') {
      filtered = teams.filter(team => team.group_name === selectedGroup);
    }

    setFilteredTeams(filtered);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Teams</h1>
        <p className="text-gray-600">All teams in the tournament</p>
      </div>

      {/* Group Filter */}
      <div className="mb-6 flex items-center space-x-4">
        <Filter className="h-5 w-5 text-gray-500" />
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Groups</option>
          <option value="A">Group A</option>
          <option value="B">Group B</option>
          <option value="C">Group C</option>
          <option value="D">Group D</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map((team) => (
          <Link
            key={team.id}
            to={`/teams/${team.id}`}
            className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow p-6 block"
          >
            <div className="flex items-center space-x-4 mb-4">
              <img 
                src={team.logo_url} 
                alt={team.name} 
                className="h-16 w-16 rounded-full"
              />
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{team.name}</h3>
                <p className="text-gray-600">Group {team.group_name} • {team.points} points</p>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Matches Played:</span>
                <span className="font-medium">{team.matches_played}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Wins:</span>
                <span className="font-medium text-green-600">{team.wins}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Draws:</span>
                <span className="font-medium text-yellow-600">{team.draws}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Losses:</span>
                <span className="font-medium text-red-600">{team.losses}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Goals For:</span>
                <span className="font-medium">{team.goals_for}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Goals Against:</span>
                <span className="font-medium">{team.goals_against}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Goal Difference:</span>
                <span className={`font-medium ${
                  team.goal_difference >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {team.goal_difference > 0 ? '+' : ''}{team.goal_difference}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Teams;