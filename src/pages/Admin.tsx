import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { Team, Player, Match } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ImageUpload from '../components/ImageUpload';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

const Admin = () => {
  const { t, language } = useLanguage();
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [eliminationMatches, setEliminationMatches] = useState<EliminationMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'teams' | 'players' | 'matches' | 'eliminations'>('teams');

  // Form states
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editingEliminationMatch, setEditingEliminationMatch] = useState<EliminationMatch | null>(null);
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
      const [teamsResponse, playersResponse, matchesResponse, eliminationResponse] = await Promise.all([
        supabase.from('teams').select('*').order('name'),
        supabase.from('players').select(`
          *,
          team:teams(name, logo_url)
        `).order('name'),
        supabase.from('matches').select(`
          *,
          home_team_data:teams!matches_home_team_fkey(name, logo_url),
          away_team_data:teams!matches_away_team_fkey(name, logo_url)
        `).order('date', { ascending: false }).order('time', { ascending: true }),
        supabase.from('elimination_matches').select(`
          *,
          team1_data:teams!elimination_matches_team1_id_fkey(name, logo_url),
          team2_data:teams!elimination_matches_team2_id_fkey(name, logo_url),
          winner_data:teams!elimination_matches_winner_id_fkey(name, logo_url)
        `).order('stage', { ascending: false }).order('match_number')
      ]);

      if (teamsResponse.error) throw teamsResponse.error;
      if (playersResponse.error) throw playersResponse.error;
      if (matchesResponse.error) throw matchesResponse.error;
      if (eliminationResponse.error) throw eliminationResponse.error;

      setTeams(teamsResponse.data || []);
      setPlayers(playersResponse.data || []);
      setMatches(matchesResponse.data || []);
      setEliminationMatches(eliminationResponse.data || []);
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
            time: editingMatch.time,
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
            time: editingMatch.time,
            home_team: editingMatch.home_team,
            away_team: editingMatch.away_team,
            home_score: editingMatch.home_score,
            away_score: editingMatch.away_score,
            played: editingMatch.status === 'finished',
            status: editingMatch.status || 'scheduled',
            live_home_score: 0,
            live_away_score: 0,
            current_minute: 0,
          }]);

        if (error) throw error;
      }

      setEditingMatch(null);
      fetchData();
    } catch (error) {
      console.error('Error saving match:', error);
    }
  };

  const handleEliminationMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEliminationMatch) return;

    try {
      if (editingEliminationMatch.id) {
        // Update existing elimination match
        const { error } = await supabase
          .from('elimination_matches')
          .update({
            stage: editingEliminationMatch.stage,
            match_number: editingEliminationMatch.match_number,
            team1_id: editingEliminationMatch.team1_id,
            team2_id: editingEliminationMatch.team2_id,
            date: editingEliminationMatch.date,
            time: editingEliminationMatch.time,
            team1_score: editingEliminationMatch.team1_score,
            team2_score: editingEliminationMatch.team2_score,
            status: editingEliminationMatch.status,
          })
          .eq('id', editingEliminationMatch.id);

        if (error) throw error;
      } else {
        // Create new elimination match
        const { error } = await supabase
          .from('elimination_matches')
          .insert([{
            stage: editingEliminationMatch.stage,
            match_number: editingEliminationMatch.match_number,
            team1_id: editingEliminationMatch.team1_id,
            team2_id: editingEliminationMatch.team2_id,
            date: editingEliminationMatch.date,
            time: editingEliminationMatch.time,
            team1_score: editingEliminationMatch.team1_score,
            team2_score: editingEliminationMatch.team2_score,
            status: editingEliminationMatch.status || 'scheduled',
            live_team1_score: 0,
            live_team2_score: 0,
            current_minute: 0,
          }]);

        if (error) throw error;
      }

      setEditingEliminationMatch(null);
      fetchData();
    } catch (error) {
      console.error('Error saving elimination match:', error);
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

  const deleteEliminationMatch = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المباراة؟')) return;

    try {
      const { error } = await supabase.from('elimination_matches').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting elimination match:', error);
    }
  };

  const deleteAllPlayers = async () => {
    if (!confirm('هل أنت متأكد من حذف جميع اللاعبين؟ هذا الإجراء لا يمكن التراجع عنه.')) return;

    try {
      const { error } = await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      fetchData();
      alert('تم حذف جميع اللاعبين بنجاح');
    } catch (error) {
      console.error('Error deleting all players:', error);
      alert('حدث خطأ أثناء حذف اللاعبين');
    }
  };

  const deleteAllTeams = async () => {
    if (!confirm('هل أنت متأكد من حذف جميع الفرق؟ سيتم حذف جميع اللاعبين والمباريات المرتبطة أيضاً. هذا الإجراء لا يمكن التراجع عنه.')) return;

    try {
      // Delete all teams (this will cascade delete players and matches due to foreign key constraints)
      const { error } = await supabase.from('teams').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      fetchData();
      alert('تم حذف جميع الفرق واللاعبين والمباريات بنجاح');
    } catch (error) {
      console.error('Error deleting all teams:', error);
      alert('حدث خطأ أثناء حذف الفرق');
    }
  };

  const deleteAllMatches = async () => {
    if (!confirm('هل أنت متأكد من حذف جميع المباريات؟ هذا الإجراء لا يمكن التراجع عنه.')) return;

    try {
      const { error } = await supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      fetchData();
      alert('تم حذف جميع المباريات بنجاح');
    } catch (error) {
      console.error('Error deleting all matches:', error);
      alert('حدث خطأ أثناء حذف المباريات');
    }
  };
  if (authLoading) return <LoadingSpinner />;

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-8 px-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            {isSignUp ? 'إنشاء حساب إداري' : 'تسجيل دخول الإدارة'}
            </h2>
          </div>
          <form onSubmit={handleSignIn}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-semibold mb-3">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 bg-white/70 backdrop-blur-sm"
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-semibold mb-3">
                كلمة المرور
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 bg-white/70 backdrop-blur-sm"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 px-6 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {isSignUp ? 'إنشاء حساب' : 'تسجيل الدخول'}
            </button>
          </form>
          <div className="mt-4 text-center">
            
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 space-y-4 sm:space-y-0">
        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
          {t('admin.title')}
        </h1>
        <button
          onClick={signOut}
          className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          {t('admin.signOut')}
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-2 shadow-lg">
        <nav className="-mb-px flex space-x-2 sm:space-x-8 overflow-x-auto">
          {(['teams', 'players', 'matches', 'eliminations'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-4 sm:px-6 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all duration-300 hover:scale-105 ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-white/50 hover:text-gray-800'
              }`}
            >
              {tab === 'teams' && t('admin.teams')}
              {tab === 'players' && t('admin.players')}
              {tab === 'matches' && t('admin.matches')}
              {tab === 'eliminations' && (language === 'ar' ? 'مرحلة الإقصاء' : 'Éliminations')}
            </button>
          ))}
        </nav>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Teams Tab */}
          {activeTab === 'teams' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{t('admin.teams')}</h2>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <button
                    onClick={deleteAllTeams}
                    className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 sm:px-6 sm:py-3 text-sm rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>{t('admin.deleteAll')} {t('admin.teams')}</span>
                  </button>
                  <button
                    onClick={() => setEditingTeam({ id: '', name: '', logo_url: '', group_name: 'A', wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0, matches_played: 0, points: 0, goal_difference: 0 })}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 sm:px-6 sm:py-3 text-sm rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{t('admin.addTeam')}</span>
                  </button>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden overflow-x-auto border border-white/20">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gradient-to-r from-emerald-50 to-teal-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.team')}
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('form.group')}
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                        الإحصائيات
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/50 divide-y divide-gray-100">
                    {teams.map((team) => (
                      <tr key={team.id} className="hover:bg-white/70 transition-colors duration-200">
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {team.logo_url ? (
                              <img className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" src={team.logo_url} alt={team.name} />
                            ) : (
                              <DefaultAvatar type="team" name={team.name} size="md" className="h-8 w-8 sm:h-10 sm:w-10" />
                            )}
                            <div className={`${language === 'ar' ? 'mr-2 sm:mr-4' : 'ml-2 sm:ml-4'}`}>
                              <div className="text-xs sm:text-sm font-medium text-gray-900">{team.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {t('home.group')} {team.group_name}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden sm:table-cell">
                          {team.wins}ف {team.draws}ت {team.losses}خ | {team.goals_for}-{team.goals_against}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingTeam(team)}
                              className="text-indigo-600 hover:text-indigo-900 p-2 rounded-lg hover:bg-indigo-50 transition-colors duration-200"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteTeam(team.id)}
                              className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50 transition-colors duration-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
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
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">اللاعبون</h2>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <button
                    onClick={deleteAllPlayers}
                    className="bg-red-600 text-white px-3 py-2 sm:px-4 text-sm rounded-md hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>حذف جميع اللاعبين</span>
                  </button>
                  <button
                    onClick={() => setShowPlayerForm(true)}
                    className="bg-blue-600 text-white px-3 py-2 sm:px-4 text-sm rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>إضافة سريعة للاعب</span>
                  </button>
                  <button
                    onClick={() => setEditingPlayer({ id: '', name: '', team_id: '', goals: 0, assists: 0 })}
                    className="bg-emerald-600 text-white px-3 py-2 sm:px-4 text-sm rounded-md hover:bg-emerald-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>إضافة لاعب مع الإحصائيات</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        اللاعب
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        الفريق
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                        الإحصائيات
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {players.map((player) => (
                      <tr key={player.id}>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm font-medium text-gray-900">{player.name}</div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {player.team?.logo_url ? (
                              <img className="h-4 w-4 sm:h-6 sm:w-6 rounded-full" src={player.team.logo_url} alt="" />
                            ) : (
                              <DefaultAvatar type="team" name={player.team?.name} size="sm" />
                            )}
                            <span className="ml-1 sm:ml-2 text-xs sm:text-sm text-gray-900">{player.team?.name}</span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden sm:table-cell">
                          {player.goals} هدف، {player.assists} تمريرة حاسمة
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingPlayer(player)}
                              className="text-indigo-600 hover:text-indigo-900 p-1"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deletePlayer(player.id)}
                              className="text-red-600 hover:text-red-900 p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
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
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">المباريات</h2>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <button
                    onClick={deleteAllMatches}
                    className="bg-red-600 text-white px-3 py-2 sm:px-4 text-sm rounded-md hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>حذف جميع المباريات</span>
                  </button>
                  <button
                    onClick={() => setEditingMatch({ id: '', date: '', time: '15:00', home_team: '', away_team: '', home_score: null, away_score: null, played: false })}
                    className="bg-emerald-600 text-white px-3 py-2 sm:px-4 text-sm rounded-md hover:bg-emerald-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>إضافة مباراة</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        التاريخ
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                        {language === 'ar' ? 'الوقت' : 'Heure'}
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        المباراة
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                        النتيجة
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {matches.map((match) => (
                      <tr key={match.id}>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {new Date(match.date).toLocaleDateString()}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden sm:table-cell">
                          {match.time}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-900">
                            {match.home_team_data?.name} ضد {match.away_team_data?.name}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden sm:table-cell">
                          {match.status === 'live' ? (
                            <span className="text-red-600 font-medium">
                              مباشر: {match.live_home_score} - {match.live_away_score}
                            </span>
                          ) : match.status === 'finished' ? (
                            `${match.home_score} - ${match.away_score}`
                          ) : (
                            'لم تُلعب بعد'
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingMatch(match)}
                              className="text-indigo-600 hover:text-indigo-900 p-1"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteMatch(match.id)}
                              className="text-red-600 hover:text-red-900 p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Eliminations Tab */}
          {activeTab === 'eliminations' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                  {language === 'ar' ? 'مرحلة الإقصاء' : 'Phase Éliminatoire'}
                </h2>
                <button
                  onClick={() => setEditingEliminationMatch({ 
                    id: '', 
                    stage: 'quarter', 
                    match_number: 1, 
                    team1_id: null, 
                    team2_id: null, 
                    winner_id: null,
                    team1_score: null, 
                    team2_score: null, 
                    date: '', 
                    time: '15:00', 
                    status: 'scheduled',
                    live_team1_score: 0,
                    live_team2_score: 0,
                    current_minute: 0,
                    created_at: ''
                  })}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 sm:px-6 sm:py-3 text-sm rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Plus className="h-4 w-4" />
                  <span>{language === 'ar' ? 'إضافة مباراة إقصائية' : 'Ajouter Match Éliminatoire'}</span>
                </button>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden overflow-x-auto border border-white/20">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gradient-to-r from-yellow-50 to-orange-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {language === 'ar' ? 'المرحلة' : 'Phase'}
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {language === 'ar' ? 'المباراة' : 'Match'}
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                        {language === 'ar' ? 'التاريخ' : 'Date'}
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                        {language === 'ar' ? 'الحالة' : 'Statut'}
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/50 divide-y divide-gray-100">
                    {eliminationMatches.map((match) => (
                      <tr key={match.id} className="hover:bg-white/70 transition-colors duration-200">
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {match.stage === 'quarter' && (language === 'ar' ? 'ربع النهائي' : 'Quart')}
                          {match.stage === 'semi' && (language === 'ar' ? 'نصف النهائي' : 'Demi')}
                          {match.stage === 'final' && (language === 'ar' ? 'النهائي' : 'Finale')}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          <div className="space-y-1">
                            <div>{match.team1_data?.name || (language === 'ar' ? 'غير محدد' : 'Non défini')}</div>
                            <div className="text-gray-500">ضد</div>
                            <div>{match.team2_data?.name || (language === 'ar' ? 'غير محدد' : 'Non défini')}</div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden sm:table-cell">
                          {new Date(match.date).toLocaleDateString()}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            match.status === 'live' 
                              ? 'bg-red-100 text-red-800' 
                              : match.status === 'finished'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {match.status === 'live' && (language === 'ar' ? 'مباشر' : 'Live')}
                            {match.status === 'finished' && (language === 'ar' ? 'انتهت' : 'Terminé')}
                            {match.status === 'scheduled' && (language === 'ar' ? 'مجدولة' : 'Programmé')}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingEliminationMatch(match)}
                              className="text-indigo-600 hover:text-indigo-900 p-2 rounded-lg hover:bg-indigo-50 transition-colors duration-200"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteEliminationMatch(match.id)}
                              className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50 transition-colors duration-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50" dir="rtl">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">إضافة سريعة للاعب</h3>
            <form onSubmit={handleAddPlayer}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم اللاعب
                </label>
                <input
                  type="text"
                  value={newPlayer.name}
                  onChange={(e) => setNewPlayer({...newPlayer, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                  placeholder="أدخل اسم اللاعب"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الفريق
                </label>
                <select
                  value={newPlayer.team_id}
                  onChange={(e) => setNewPlayer({...newPlayer, team_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">اختر فريق</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} (المجموعة {team.group_name})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPlayerForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 text-center"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>إضافة لاعب</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {editingTeam && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50" dir="rtl">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingTeam.id ? 'تعديل الفريق' : 'إضافة فريق'}
            </h3>
            <form onSubmit={handleTeamSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم الفريق
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
                  المجموعة
                </label>
                <select
                  value={editingTeam.group_name}
                  onChange={(e) => setEditingTeam({...editingTeam, group_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="A">المجموعة A</option>
                  <option value="B">المجموعة B</option>
                  <option value="C">المجموعة C</option>
                  <option value="D">المجموعة D</option>
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  شعار الفريق (اختياري)
                </label>
                <ImageUpload
                  currentImage={editingTeam.logo_url}
                  onImageChange={(imageUrl) => setEditingTeam({...editingTeam, logo_url: imageUrl})}
                  placeholder="اختر شعار الفريق أو اتركه فارغاً"
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 text-center"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>حفظ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Player Modal */}
      {editingPlayer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50" dir="rtl">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingPlayer.id ? 'تعديل اللاعب' : 'إضافة لاعب'}
            </h3>
            <form onSubmit={handlePlayerSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم اللاعب
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
                  الفريق
                </label>
                <select
                  value={editingPlayer.team_id}
                  onChange={(e) => setEditingPlayer({...editingPlayer, team_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">اختر فريق</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الأهداف
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
                  التمريرات الحاسمة
                </label>
                <input
                  type="number"
                  value={editingPlayer.assists}
                  onChange={(e) => setEditingPlayer({...editingPlayer, assists: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  min="0"
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingPlayer(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 text-center"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>حفظ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Match Modal */}
      {editingMatch && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50" dir="rtl">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingMatch.id ? 'تعديل المباراة' : 'إضافة مباراة'}
            </h3>
            <form onSubmit={handleMatchSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  التاريخ
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
                  {language === 'ar' ? 'الوقت' : 'Heure'}
                </label>
                <input
                  type="time"
                  value={editingMatch.time}
                  onChange={(e) => setEditingMatch({...editingMatch, time: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الفريق المضيف
                </label>
                <select
                  value={editingMatch.home_team}
                  onChange={(e) => setEditingMatch({...editingMatch, home_team: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">اختر الفريق المضيف</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الفريق الضيف
                </label>
                <select
                  value={editingMatch.away_team}
                  onChange={(e) => setEditingMatch({...editingMatch, away_team: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">اختر الفريق الضيف</option>
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
                  <span className="text-sm font-medium text-gray-700">المباراة مُلعبة</span>
                </label>
              </div>
              {editingMatch.played && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      نتيجة المضيف
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
                      نتيجة الضيف
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
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingMatch(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 text-center"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>حفظ</span>
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