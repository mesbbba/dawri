export interface Team {
  id: string;
  name: string;
  logo_url: string;
  group_name: string;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  matches_played: number;
  points: number;
  goal_difference: number;
}

export interface Player {
  id: string;
  name: string;
  team_id: string;
  goals: number;
  assists: number;
  team?: Team;
}

export interface Match {
  id: string;
  date: string;
  time: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  played: boolean;
  home_team_data?: Team;
  away_team_data?: Team;
  events?: MatchEvent[];
}

export interface MatchEvent {
  id: string;
  match_id: string;
  player_id: string;
  event_type: 'goal' | 'red_card' | 'yellow_card';
  minute: number;
  assist_player_id?: string;
  created_at: string;
  player?: Player;
  assist_player?: Player;
}