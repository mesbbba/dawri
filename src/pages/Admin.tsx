import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Team, Player, Match, EliminationMatch } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import DefaultAvatar from '../components/DefaultAvatar';
import ImageUpload from '../components/ImageUpload';
import { 
  Users, 
  User, 
  Calendar, 
  Trophy, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  LogOut,
  Menu,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';

const Admin = () => {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'teams' | 'players' | 'matches' | 'eliminations'>('teams');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  
  // Data states
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [eliminationMatches, setEliminationMatches] = useState<EliminationMatch[]>([]);
  
  // Form states
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [showAddElimination, setShowAddElimination] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editingElimination, setEditingElimination] = useState<EliminationMatch | null>(null);
  
  // Form data
  const [teamForm, setTeamForm] = useState({ name: '', logo_url: '', group_name: 'A' });
  const [playerForm, setPlayerForm] = useState({ name: '', team_id: '', goals: 0, assists: 0 });
  const [matchForm, setMatchForm] = useState({ 
    date: '', 
    time: '15:00', 
    home_team: '', 
    away_team: '', 
    home_score: 0, 
    away_score: 0, 
    played: false 
  });
  const [eliminationForm, setEliminationForm] = useState({
    stage: 'quarter' as 'quarter' | 'semi' | 'final',
    match_number: 1,
    team1_id: '',
    team2_id: '',
    date: '',
    time: '15:00'
  });

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
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

  // Team operations
  const saveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTeam) {
        const { error } = await supabase
          .from('teams')
          .update(teamForm)
          .eq('id', editingTeam.id);
        if (error) throw error;
        setEditingTeam(null);
      } else {
        const { error } = await supabase
          .from('teams')
          .insert([teamForm]);
        if (error) throw error;
        setShowAddTeam(false);
      }
      setTeamForm({ name: '', logo_url: '', group_name: 'A' });
      fetchAllData();
    } catch (error) {
      console.error('Error saving team:', error);
    }
  };

  const deleteTeam = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الفريق؟')) return;
    try {
      const { error } = await supabase.from('teams').delete().eq('id', id);
      if (error) throw error;
      fetchAllData();
    } catch (error) {
      console.error('Error deleting team:', error);
    }
  };

  // Player operations
  const savePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPlayer) {
        const { error } = await supabase
          .from('players')
          .update(playerForm)
          .eq('id', editingPlayer.id);
        if (error) throw error;
        setEditingPlayer(null);
      } else {
        const { error } = await supabase
          .from('players')
          .insert([playerForm]);
        if (error) throw error;
        setShowAddPlayer(false);
      }
      setPlayerForm({ name: '', team_id: '', goals: 0, assists: 0 });
      fetchAllData();
    } catch (error) {
      console.error('Error saving player:', error);
    }
  };

  const deletePlayer = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا اللاعب؟')) return;
    try {
      const { error } = await supabase.from('players').delete().eq('id', id);
      if (error) throw error;
      fetchAllData();
    } catch (error) {
      console.error('Error deleting player:', error);
    }
  };

  // Match operations
  const saveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMatch) {
        const { error } = await supabase
          .from('matches')
          .update(matchForm)
          .eq('id', editingMatch.id);
        if (error) throw error;
        setEditingMatch(null);
      } else {
        const { error } = await supabase
          .from('matches')
          .insert([matchForm]);
        if (error) throw error;
        setShowAddMatch(false);
      }
      setMatchForm({ 
        date: '', 
        time: '15:00', 
        home_team: '', 
        away_team: '', 
        home_score: 0, 
        away_score: 0, 
        played: false 
      });
      fetchAllData();
    } catch (error) {
      console.error('Error saving match:', error);
    }
  };

  const deleteMatch = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المباراة؟')) return;
    try {
      const { error } = await supabase.from('matches').delete().eq('id', id);
      if (error) throw error;
      fetchAllData();
    } catch (error) {
      console.error('Error deleting match:', error);
    }
  };

  // Elimination match operations
  const saveEliminationMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingElimination) {
        const { error } = await supabase
          .from('elimination_matches')
          .update(eliminationForm)
          .eq('id', editingElimination.id);
        if (error) throw error;
        setEditingElimination(null);
      } else {
        const { error } = await supabase
          .from('elimination_matches')
          .insert([eliminationForm]);
        if (error) throw error;
        setShowAddElimination(false);
      }
      setEliminationForm({
        stage: 'quarter',
        match_number: 1,
        team1_id: '',
        team2_id: '',
        date: '',
        time: '15:00'
      });
      fetchAllData();
    } catch (error) {
      console.error('Error saving elimination match:', error);
    }
  };

  const deleteEliminationMatch = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف مباراة الإقصاء هذه؟')) return;
    try {
      const { error } = await supabase.from('elimination_matches').delete().eq('id', id);
      if (error) throw error;
      fetchAllData();
    } catch (error) {
      console.error('Error deleting elimination match:', error);
    }
  };

  // Filter functions
  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = selectedGroup === 'all' || team.group_name === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.team?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = selectedGroup === 'all' || player.team?.group_name === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  const filteredMatches = matches.filter(match => {
    const matchesSearch = match.home_team_data?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         match.away_team_data?.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">تسجيل الدخول للإدارة</h2>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <p className="text-gray-600 text-center">يرجى تسجيل الدخول للوصول إلى لوحة الإدارة</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingSpinner />;

  const tabs = [
    { id: 'teams', name: 'الفرق', icon: Users, count: teams.length },
    { id: 'players', name: 'اللاعبون', icon: User, count: players.length },
    { id: 'matches', name: 'المباريات', icon: Calendar, count: matches.length },
    { id: 'eliminations', name: 'الإقصاءيات', icon: Trophy, count: eliminationMatches.length },
  ];

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-sm border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">لوحة الإدارة</h1>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => signOut()}
                className="text-red-600 hover:text-red-800 p-2"
              >
                <LogOut className="h-5 w-5" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-600 hover:text-gray-900 p-2"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="border-t bg-white">
            <div className="px-4 py-2 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-4 w-4" />
                      <span>{tab.name}</span>
                    </div>
                    <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          <div className="flex flex-col w-64">
            <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <h1 className="text-2xl font-bold text-gray-900">لوحة الإدارة</h1>
              </div>
              <div className="mt-5 flex-grow flex flex-col">
                <nav className="flex-1 px-2 space-y-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                          activeTab === tab.id
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <Icon className="ml-3 h-5 w-5" />
                        {tab.name}
                        <span className="mr-auto bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </nav>
                <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
                  <button
                    onClick={() => signOut()}
                    className="flex-shrink-0 w-full group block"
                  >
                    <div className="flex items-center">
                      <LogOut className="inline-block h-5 w-5 text-red-600 group-hover:text-red-800" />
                      <div className="mr-3">
                        <p className="text-sm font-medium text-red-600 group-hover:text-red-800">
                          تسجيل الخروج
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="p-4 lg:p-8">
            {/* Search and Filter Bar */}
            <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="البحث..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                
                {/* Group Filter (for teams and players) */}
                {(activeTab === 'teams' || activeTab === 'players') && (
                  <div className="sm:w-48">
                    <select
                      value={selectedGroup}
                      onChange={(e) => setSelectedGroup(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="all">جميع المجموعات</option>
                      <option value="A">المجموعة A</option>
                      <option value="B">المجموعة B</option>
                      <option value="C">المجموعة C</option>
                      <option value="D">المجموعة D</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Teams Tab */}
            {activeTab === 'teams' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <h2 className="text-2xl font-bold text-gray-900">إدارة الفرق</h2>
                  <button
                    onClick={() => setShowAddTeam(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة فريق
                  </button>
                </div>

                {/* Teams Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                  {filteredTeams.map((team) => (
                    <div key={team.id} className="bg-white rounded-lg shadow p-4 lg:p-6">
                      <div className="flex items-center space-x-4 mb-4">
                        {team.logo_url ? (
                          <img src={team.logo_url} alt="" className="h-12 w-12 rounded-full" />
                        ) : (
                          <DefaultAvatar type="team" name={team.name} size="lg" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">{team.name}</h3>
                          <p className="text-sm text-gray-600">المجموعة {team.group_name}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <span className="text-gray-600">النقاط:</span>
                          <span className="font-medium mr-1">{team.wins * 3 + team.draws}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">المباريات:</span>
                          <span className="font-medium mr-1">{team.wins + team.draws + team.losses}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">الأهداف:</span>
                          <span className="font-medium mr-1">{team.goals_for}-{team.goals_against}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">الفارق:</span>
                          <span className={`font-medium mr-1 ${team.goals_for - team.goals_against >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {team.goals_for - team.goals_against > 0 ? '+' : ''}{team.goals_for - team.goals_against}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditingTeam(team);
                            setTeamForm({
                              name: team.name,
                              logo_url: team.logo_url,
                              group_name: team.group_name
                            });
                          }}
                          className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Edit className="h-4 w-4 ml-1" />
                          تعديل
                        </button>
                        <button
                          onClick={() => deleteTeam(team.id)}
                          className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                        >
                          <Trash2 className="h-4 w-4 ml-1" />
                          حذف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Players Tab */}
            {activeTab === 'players' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <h2 className="text-2xl font-bold text-gray-900">إدارة اللاعبين</h2>
                  <button
                    onClick={() => setShowAddPlayer(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة لاعب
                  </button>
                </div>

                {/* Players Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredPlayers.map((player) => (
                    <div key={player.id} className="bg-white rounded-lg shadow p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <DefaultAvatar type="player" name={player.name} size="md" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{player.name}</h3>
                          <p className="text-sm text-gray-600 truncate">{player.team?.name}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600">الأهداف:</span>
                          <span className="font-medium text-emerald-600">{player.goals}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">التمريرات:</span>
                          <span className="font-medium text-blue-600">{player.assists}</span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditingPlayer(player);
                            setPlayerForm({
                              name: player.name,
                              team_id: player.team_id || '',
                              goals: player.goals,
                              assists: player.assists
                            });
                          }}
                          className="flex-1 inline-flex justify-center items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Edit className="h-3 w-3 ml-1" />
                          تعديل
                        </button>
                        <button
                          onClick={() => deletePlayer(player.id)}
                          className="flex-1 inline-flex justify-center items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700"
                        >
                          <Trash2 className="h-3 w-3 ml-1" />
                          حذف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Matches Tab */}
            {activeTab === 'matches' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <h2 className="text-2xl font-bold text-gray-900">إدارة المباريات</h2>
                  <button
                    onClick={() => setShowAddMatch(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة مباراة
                  </button>
                </div>

                {/* Matches List */}
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {filteredMatches.map((match) => (
                      <li key={match.id} className="px-4 py-4 sm:px-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                              <div className="flex items-center space-x-3">
                                {match.home_team_data?.logo_url ? (
                                  <img src={match.home_team_data.logo_url} alt="" className="h-8 w-8 rounded-full" />
                                ) : (
                                  <DefaultAvatar type="team" name={match.home_team_data?.name} size="md" />
                                )}
                                <span className="font-medium text-gray-900">{match.home_team_data?.name}</span>
                              </div>
                              
                              <div className="text-center">
                                {match.played ? (
                                  <span className="text-lg font-bold text-gray-900">
                                    {match.home_score} - {match.away_score}
                                  </span>
                                ) : (
                                  <span className="text-gray-500">ضد</span>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-3">
                                <span className="font-medium text-gray-900">{match.away_team_data?.name}</span>
                                {match.away_team_data?.logo_url ? (
                                  <img src={match.away_team_data.logo_url} alt="" className="h-8 w-8 rounded-full" />
                                ) : (
                                  <DefaultAvatar type="team" name={match.away_team_data?.name} size="md" />
                                )}
                              </div>
                            </div>
                            
                            <div className="mt-2 text-sm text-gray-600">
                              {new Date(match.date).toLocaleDateString()} - {match.time}
                              <span className={`mr-2 inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                match.played ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {match.played ? 'انتهت' : 'قادمة'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setEditingMatch(match);
                                setMatchForm({
                                  date: match.date,
                                  time: match.time,
                                  home_team: match.home_team,
                                  away_team: match.away_team,
                                  home_score: match.home_score || 0,
                                  away_score: match.away_score || 0,
                                  played: match.played
                                });
                              }}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                              <Edit className="h-4 w-4 ml-1" />
                              تعديل
                            </button>
                            <button
                              onClick={() => deleteMatch(match.id)}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                            >
                              <Trash2 className="h-4 w-4 ml-1" />
                              حذف
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Eliminations Tab */}
            {activeTab === 'eliminations' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <h2 className="text-2xl font-bold text-gray-900">إدارة مباريات الإقصاء</h2>
                  <button
                    onClick={() => setShowAddElimination(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة مباراة إقصاء
                  </button>
                </div>

                {/* Elimination Matches List */}
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {eliminationMatches.map((match) => (
                      <li key={match.id} className="px-4 py-4 sm:px-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Trophy className="h-4 w-4 text-yellow-600" />
                              <span className="font-medium text-gray-900">
                                {match.stage === 'final' ? 'النهائي' : 
                                 match.stage === 'semi' ? 'نصف النهائي' : 'ربع النهائي'} 
                                {match.stage !== 'final' && ` ${match.match_number}`}
                              </span>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                              <div className="flex items-center space-x-3">
                                {match.team1_data?.logo_url ? (
                                  <img src={match.team1_data.logo_url} alt="" className="h-8 w-8 rounded-full" />
                                ) : (
                                  <DefaultAvatar type="team" name={match.team1_data?.name} size="md" />
                                )}
                                <span className="font-medium text-gray-900">
                                  {match.team1_data?.name || 'فريق غير محدد'}
                                </span>
                              </div>
                              
                              <div className="text-center">
                                {match.status === 'finished' ? (
                                  <span className="text-lg font-bold text-gray-900">
                                    {match.team1_score} - {match.team2_score}
                                  </span>
                                ) : (
                                  <span className="text-gray-500">ضد</span>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-3">
                                <span className="font-medium text-gray-900">
                                  {match.team2_data?.name || 'فريق غير محدد'}
                                </span>
                                {match.team2_data?.logo_url ? (
                                  <img src={match.team2_data.logo_url} alt="" className="h-8 w-8 rounded-full" />
                                ) : (
                                  <DefaultAvatar type="team" name={match.team2_data?.name} size="md" />
                                )}
                              </div>
                            </div>
                            
                            <div className="mt-2 text-sm text-gray-600">
                              {new Date(match.date).toLocaleDateString()} - {match.time}
                              <span className={`mr-2 inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                match.status === 'finished' ? 'bg-green-100 text-green-800' : 
                                match.status === 'live' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {match.status === 'finished' ? 'انتهت' : 
                                 match.status === 'live' ? 'مباشر' : 'مجدولة'}
                              </span>
                              {match.winner_data && (
                                <span className="mr-2 text-yellow-600 font-medium">
                                  الفائز: {match.winner_data.name}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setEditingElimination(match);
                                setEliminationForm({
                                  stage: match.stage,
                                  match_number: match.match_number,
                                  team1_id: match.team1_id || '',
                                  team2_id: match.team2_id || '',
                                  date: match.date,
                                  time: match.time
                                });
                              }}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                              <Edit className="h-4 w-4 ml-1" />
                              تعديل
                            </button>
                            <button
                              onClick={() => deleteEliminationMatch(match.id)}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                            >
                              <Trash2 className="h-4 w-4 ml-1" />
                              حذف
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Team Modal */}
      {(showAddTeam || editingTeam) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingTeam ? 'تعديل الفريق' : 'إضافة فريق جديد'}
              </h3>
              <form onSubmit={saveTeam} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    اسم الفريق
                  </label>
                  <input
                    type="text"
                    value={teamForm.name}
                    onChange={(e) => setTeamForm({...teamForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    المجموعة
                  </label>
                  <select
                    value={teamForm.group_name}
                    onChange={(e) => setTeamForm({...teamForm, group_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="A">المجموعة A</option>
                    <option value="B">المجموعة B</option>
                    <option value="C">المجموعة C</option>
                    <option value="D">المجموعة D</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    شعار الفريق
                  </label>
                  <ImageUpload
                    currentImage={teamForm.logo_url}
                    onImageChange={(url) => setTeamForm({...teamForm, logo_url: url})}
                    placeholder="اختر شعار الفريق"
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <Save className="h-4 w-4 inline ml-1" />
                    حفظ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddTeam(false);
                      setEditingTeam(null);
                      setTeamForm({ name: '', logo_url: '', group_name: 'A' });
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    <X className="h-4 w-4 inline ml-1" />
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Player Modal */}
      {(showAddPlayer || editingPlayer) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingPlayer ? 'تعديل اللاعب' : 'إضافة لاعب جديد'}
              </h3>
              <form onSubmit={savePlayer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    اسم اللاعب
                  </label>
                  <input
                    type="text"
                    value={playerForm.name}
                    onChange={(e) => setPlayerForm({...playerForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الفريق
                  </label>
                  <select
                    value={playerForm.team_id}
                    onChange={(e) => setPlayerForm({...playerForm, team_id: e.target.value})}
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
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الأهداف
                    </label>
                    <input
                      type="number"
                      value={playerForm.goals}
                      onChange={(e) => setPlayerForm({...playerForm, goals: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      التمريرات الحاسمة
                    </label>
                    <input
                      type="number"
                      value={playerForm.assists}
                      onChange={(e) => setPlayerForm({...playerForm, assists: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      min="0"
                    />
                  </div>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <Save className="h-4 w-4 inline ml-1" />
                    حفظ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddPlayer(false);
                      setEditingPlayer(null);
                      setPlayerForm({ name: '', team_id: '', goals: 0, assists: 0 });
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    <X className="h-4 w-4 inline ml-1" />
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Match Modal */}
      {(showAddMatch || editingMatch) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingMatch ? 'تعديل المباراة' : 'إضافة مباراة جديدة'}
              </h3>
              <form onSubmit={saveMatch} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      التاريخ
                    </label>
                    <input
                      type="date"
                      value={matchForm.date}
                      onChange={(e) => setMatchForm({...matchForm, date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الوقت
                    </label>
                    <input
                      type="time"
                      value={matchForm.time}
                      onChange={(e) => setMatchForm({...matchForm, time: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الفريق المضيف
                  </label>
                  <select
                    value={matchForm.home_team}
                    onChange={(e) => setMatchForm({...matchForm, home_team: e.target.value})}
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
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الفريق الضيف
                  </label>
                  <select
                    value={matchForm.away_team}
                    onChange={(e) => setMatchForm({...matchForm, away_team: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  >
                    <option value="">اختر الفريق الضيف</option>
                    {teams.filter(team => team.id !== matchForm.home_team).map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="played"
                    checked={matchForm.played}
                    onChange={(e) => setMatchForm({...matchForm, played: e.target.checked})}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                  <label htmlFor="played" className="text-sm font-medium text-gray-700">
                    المباراة انتهت
                  </label>
                </div>
                
                {matchForm.played && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        أهداف المضيف
                      </label>
                      <input
                        type="number"
                        value={matchForm.home_score}
                        onChange={(e) => setMatchForm({...matchForm, home_score: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        أهداف الضيف
                      </label>
                      <input
                        type="number"
                        value={matchForm.away_score}
                        onChange={(e) => setMatchForm({...matchForm, away_score: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        min="0"
                      />
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <Save className="h-4 w-4 inline ml-1" />
                    حفظ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMatch(false);
                      setEditingMatch(null);
                      setMatchForm({ 
                        date: '', 
                        time: '15:00', 
                        home_team: '', 
                        away_team: '', 
                        home_score: 0, 
                        away_score: 0, 
                        played: false 
                      });
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    <X className="h-4 w-4 inline ml-1" />
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Elimination Match Modal */}
      {(showAddElimination || editingElimination) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingElimination ? 'تعديل مباراة الإقصاء' : 'إضافة مباراة إقصاء جديدة'}
              </h3>
              <form onSubmit={saveEliminationMatch} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      المرحلة
                    </label>
                    <select
                      value={eliminationForm.stage}
                      onChange={(e) => setEliminationForm({...eliminationForm, stage: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    >
                      <option value="quarter">ربع النهائي</option>
                      <option value="semi">نصف النهائي</option>
                      <option value="final">النهائي</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      رقم المباراة
                    </label>
                    <input
                      type="number"
                      value={eliminationForm.match_number}
                      onChange={(e) => setEliminationForm({...eliminationForm, match_number: parseInt(e.target.value) || 1})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      min="1"
                      max="4"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      التاريخ
                    </label>
                    <input
                      type="date"
                      value={eliminationForm.date}
                      onChange={(e) => setEliminationForm({...eliminationForm, date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الوقت
                    </label>
                    <input
                      type="time"
                      value={eliminationForm.time}
                      onChange={(e) => setEliminationForm({...eliminationForm, time: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الفريق الأول
                  </label>
                  <select
                    value={eliminationForm.team1_id}
                    onChange={(e) => setEliminationForm({...eliminationForm, team1_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">اختر الفريق الأول</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الفريق الثاني
                  </label>
                  <select
                    value={eliminationForm.team2_id}
                    onChange={(e) => setEliminationForm({...eliminationForm, team2_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">اختر الفريق الثاني</option>
                    {teams.filter(team => team.id !== eliminationForm.team1_id).map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <Save className="h-4 w-4 inline ml-1" />
                    حفظ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddElimination(false);
                      setEditingElimination(null);
                      setEliminationForm({
                        stage: 'quarter',
                        match_number: 1,
                        team1_id: '',
                        team2_id: '',
                        date: '',
                        time: '15:00'
                      });
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    <X className="h-4 w-4 inline ml-1" />
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;