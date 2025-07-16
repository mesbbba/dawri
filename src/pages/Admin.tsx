import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Team, Player, Match } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

const Admin = () => {
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'teams' | 'players' | 'matches'>('teams');

  // Form states
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    team_id: '',
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [teamsResponse, playersResponse, matchesResponse] = await Promise.all([
        supabase.from('teams').select('*').order('name'),
        supabase.from('players').select(`
          *,
          team:teams(name, logo_url)
        `).order('name'),
        supabase.from('matches').select(`
          *,
          home_team_data:teams!matches_home_team_fkey(name, logo_url),
          away_team_data:teams!matches_away_team_fkey(name, logo_url)
        `).order('date', { ascending: false })
      ]);

      if (teamsResponse.error) throw teamsResponse.error;
      if (playersResponse.error) throw playersResponse.error;
      if (matchesResponse.error) throw matchesResponse.error;

      setTeams(teamsResponse.data || []);
      setPlayers(playersResponse.data || []);
      setMatches(matchesResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let error;
    if (isSignUp) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      error = signUpError;
      if (!error) {
        alert('Account created successfully! You can now sign in.');
        setIsSignUp(false);
      }
    } else {
      const result = await signIn(email, password);
      error = result.error;
    }
    
    if (error) {
      alert(`Error ${isSignUp ? 'signing up' : 'signing in'}: ` + error.message);
    }
  };

  const handleTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;

    try {
      if (editingTeam.id) {
        // Update existing team
        const { error } = await supabase
          .from('teams')
          .update({
            name: editingTeam.name,
            logo_url: editingTeam.logo_url,
            group_name: editingTeam.group_name,
          })
          .eq('id', editingTeam.id);

        if (error) throw error;
      } else {
        // Create new team
        const { error } = await supabase
          .from('teams')
          .insert([{
            name: editingTeam.name,
            logo_url: editingTeam.logo_url,
            group_name: editingTeam.group_name,
            wins: 0,
            draws: 0,
            losses: 0,
            goals_for: 0,
            goals_against: 0,
          }]);

        if (error) throw error;
      }

      setEditingTeam(null);
      fetchData();
    } catch (error) {
      console.error('Error saving team:', error);
    }
  };

  const handlePlayerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;

    try {
      if (editingPlayer.id) {
        // Update existing player
        const { error } = await supabase
          .from('players')
          .update({
            name: editingPlayer.name,
            team_id: editingPlayer.team_id,
            goals: editingPlayer.goals,
            assists: editingPlayer.assists,
          })
          .eq('id', editingPlayer.id);

        if (error) throw error;
      } else {
        // Create new player
        const { error } = await supabase
          .from('players')
          .insert([{
            name: editingPlayer.name,
            team_id: editingPlayer.team_id,
            goals: editingPlayer.goals || 0,
            assists: editingPlayer.assists || 0,
          }]);

        if (error) throw error;
      }

      setEditingPlayer(null);
      fetchData();
    } catch (error) {
      console.error('Error saving player:', error);
    }
  };

  const handleMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch) return;

    try {
      if (editingMatch.id) {
        // Update existing match
        const { error } = await supabase
          .from('matches')
          .update({
            date: editingMatch.date,
            home_team: editingMatch.home_team,
            away_team: editingMatch.away_team,
            home_score: editingMatch.home_score,
            away_score: editingMatch.away_score,
            played: editingMatch.played,
          })
          .eq('id', editingMatch.id);

        if (error) throw error;

        // If match result was entered, update team stats
        if (editingMatch.played && editingMatch.home_score !== null && editingMatch.away_score !== null) {
          await updateTeamStats(editingMatch);
        }
      } else {
        // Create new match
        const { error } = await supabase
          .from('matches')
          .insert([{
            date: editingMatch.date,
            home_team: editingMatch.home_team,
            away_team: editingMatch.away_team,
            home_score: editingMatch.home_score,
            away_score: editingMatch.away_score,
            played: editingMatch.played || false,
          }]);

        if (error) throw error;
      }

      setEditingMatch(null);
      fetchData();
    } catch (error) {
      console.error('Error saving match:', error);
    }
  };

  const updateTeamStats = async (match: Match) => {
    if (!match.played || match.home_score === null || match.away_score === null) return;

    try {
      const homeTeam = teams.find(t => t.id === match.home_team);
      const awayTeam = teams.find(t => t.id === match.away_team);

      if (!homeTeam || !awayTeam) return;

      let homeWins = homeTeam.wins;
      let homeDraws = homeTeam.draws;
      let homeLosses = homeTeam.losses;
      let awayWins = awayTeam.wins;
      let awayDraws = awayTeam.draws;
      let awayLosses = awayTeam.losses;

      if (match.home_score > match.away_score) {
        homeWins++;
        awayLosses++;
      } else if (match.home_score < match.away_score) {
        homeLosses++;
        awayWins++;
      } else {
        homeDraws++;
        awayDraws++;
      }

      // Update home team
      await supabase
        .from('teams')
        .update({
          wins: homeWins,
          draws: homeDraws,
          losses: homeLosses,
          goals_for: homeTeam.goals_for + match.home_score,
          goals_against: homeTeam.goals_against + match.away_score,
        })
        .eq('id', match.home_team);

      // Update away team
      await supabase
        .from('teams')
        .update({
          wins: awayWins,
          draws: awayDraws,
          losses: awayLosses,
          goals_for: awayTeam.goals_for + match.away_score,
          goals_against: awayTeam.goals_against + match.home_score,
        })
        .eq('id', match.away_team);
    } catch (error) {
      console.error('Error updating team stats:', error);
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('players')
        .insert([{
          name: newPlayer.name,
          team_id: newPlayer.team_id,
          goals: 0,
          assists: 0,
        }]);

      if (error) throw error;

      setNewPlayer({ name: '', team_id: '' });
      setShowPlayerForm(false);
      fetchData();
    } catch (error) {
      console.error('Error adding player:', error);
    }
  };

  const deleteTeam = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;

    try {
      const { error } = await supabase.from('teams').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting team:', error);
    }
  };

  const deletePlayer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this player?')) return;

    try {
      const { error } = await supabase.from('players').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting player:', error);
    }
  };

  const deleteMatch = async (id: string) => {
    if (!confirm('Are you sure you want to delete this match?')) return;

    try {
      const { error } = await supabase.from('matches').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting match:', error);
    }
  };

  if (authLoading) return <LoadingSpinner />;

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-8 px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-center mb-6">
            {isSignUp ? 'Create Admin Account' : 'Admin Login'}
          </h2>
          <form onSubmit={handleSignIn}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 transition-colors"
            >
              {isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>
          <div className="mt-4 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-emerald-600 hover:text-emerald-700 text-sm"
            >
              {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        <button
          onClick={signOut}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
        >
          Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {(['teams', 'players', 'matches'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Teams Tab */}
          {activeTab === 'teams' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">Teams</h2>
                <button
                  onClick={() => setEditingTeam({ id: '', name: '', logo_url: '', group_name: 'A', wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0, matches_played: 0, points: 0, goal_difference: 0 })}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Team</span>
                </button>
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Team
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Group
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stats
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {teams.map((team) => (
                      <tr key={team.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <img className="h-10 w-10 rounded-full" src={team.logo_url} alt={team.name} />
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{team.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          Group {team.group_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {team.wins}W {team.draws}D {team.losses}L | {team.goals_for}-{team.goals_against}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => setEditingTeam(team)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteTeam(team.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Players Tab */}
          {activeTab === 'players' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">Players</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowPlayerForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Quick Add Player</span>
                  </button>
                  <button
                    onClick={() => setEditingPlayer({ id: '', name: '', team_id: '', goals: 0, assists: 0 })}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Player with Stats</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Player
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Team
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stats
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {players.map((player) => (
                      <tr key={player.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{player.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <img className="h-6 w-6 rounded-full" src={player.team?.logo_url} alt="" />
                            <span className="ml-2 text-sm text-gray-900">{player.team?.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {player.goals} goals, {player.assists} assists
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => setEditingPlayer(player)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deletePlayer(player.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Matches Tab */}
          {activeTab === 'matches' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">Matches</h2>
                <button
                  onClick={() => setEditingMatch({ id: '', date: '', home_team: '', away_team: '', home_score: null, away_score: null, played: false })}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Match</span>
                </button>
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Match
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Result
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {matches.map((match) => (
                      <tr key={match.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(match.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {match.home_team_data?.name} vs {match.away_team_data?.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {match.played ? `${match.home_score} - ${match.away_score}` : 'Not played'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => setEditingMatch(match)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteMatch(match.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Quick Add Player Form */}
      {showPlayerForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Quick Add Player</h3>
            <form onSubmit={handleAddPlayer}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Player Name
                </label>
                <input
                  type="text"
                  value={newPlayer.name}
                  onChange={(e) => setNewPlayer({...newPlayer, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                  placeholder="Enter player name"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team
                </label>
                <select
                  value={newPlayer.team_id}
                  onChange={(e) => setNewPlayer({...newPlayer, team_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">Select a team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} (Group {team.group_name})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPlayerForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Add Player</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {editingTeam && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingTeam.id ? 'Edit Team' : 'Add Team'}
            </h3>
            <form onSubmit={handleTeamSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  value={editingTeam.name}
                  onChange={(e) => setEditingTeam({...editingTeam, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group
                </label>
                <select
                  value={editingTeam.group_name}
                  onChange={(e) => setEditingTeam({...editingTeam, group_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="A">Group A</option>
                  <option value="B">Group B</option>
                  <option value="C">Group C</option>
                  <option value="D">Group D</option>
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo URL
                </label>
                <input
                  type="url"
                  value={editingTeam.logo_url}
                  onChange={(e) => setEditingTeam({...editingTeam, logo_url: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Player Modal */}
      {editingPlayer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingPlayer.id ? 'Edit Player' : 'Add Player'}
            </h3>
            <form onSubmit={handlePlayerSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Player Name
                </label>
                <input
                  type="text"
                  value={editingPlayer.name}
                  onChange={(e) => setEditingPlayer({...editingPlayer, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team
                </label>
                <select
                  value={editingPlayer.team_id}
                  onChange={(e) => setEditingPlayer({...editingPlayer, team_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">Select a team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Goals
                </label>
                <input
                  type="number"
                  value={editingPlayer.goals}
                  onChange={(e) => setEditingPlayer({...editingPlayer, goals: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  min="0"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assists
                </label>
                <input
                  type="number"
                  value={editingPlayer.assists}
                  onChange={(e) => setEditingPlayer({...editingPlayer, assists: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  min="0"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingPlayer(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Match Modal */}
      {editingMatch && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingMatch.id ? 'Edit Match' : 'Add Match'}
            </h3>
            <form onSubmit={handleMatchSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={editingMatch.date}
                  onChange={(e) => setEditingMatch({...editingMatch, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Home Team
                </label>
                <select
                  value={editingMatch.home_team}
                  onChange={(e) => setEditingMatch({...editingMatch, home_team: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">Select home team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Away Team
                </label>
                <select
                  value={editingMatch.away_team}
                  onChange={(e) => setEditingMatch({...editingMatch, away_team: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">Select away team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingMatch.played}
                    onChange={(e) => setEditingMatch({...editingMatch, played: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Match played</span>
                </label>
              </div>
              {editingMatch.played && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Home Score
                    </label>
                    <input
                      type="number"
                      value={editingMatch.home_score || ''}
                      onChange={(e) => setEditingMatch({...editingMatch, home_score: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Away Score
                    </label>
                    <input
                      type="number"
                      value={editingMatch.away_score || ''}
                      onChange={(e) => setEditingMatch({...editingMatch, away_score: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      min="0"
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingMatch(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;