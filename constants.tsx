
import { Nomination, RankingPoint, Report, NewsItem } from './types';

export const COLORS = {
  primary: '#581c1c', // Deep Burgundy from the logo background/text
  secondary: '#f39200', // Authentic basketball orange from the logo
  white: '#ffffff',
  slate: '#f8fafc',
};

// We use a high-quality placeholder that matches the visual description of the ABL logo
// in case the actual file isn't uploaded to the server yet.
export const LOGO_URL = 'https://i.ibb.co/L6S1fPj/abl-logo-placeholder.png'; 

export const MOCK_NOMINATIONS: Nomination[] = [
  {
    id: '1',
    matchDate: '2024-05-15',
    matchTime: '19:00',
    teams: 'Sabah vs Ganja',
    venue: 'Sarhadchi Arena',
    role: 'Crew Chief',
    status: 'Pending'
  },
  {
    id: '2',
    matchDate: '2024-05-18',
    matchTime: '18:30',
    teams: 'Neftchi vs Khazri',
    venue: 'Olympic Complex',
    role: 'Umpire 1',
    status: 'Accepted'
  }
];

export const MOCK_RANKING: RankingPoint[] = [
  { date: 'Jan', rank: 12 },
  { date: 'Feb', rank: 10 },
  { date: 'Mar', rank: 8 },
  { date: 'Apr', rank: 5 },
  { date: 'May', rank: 4 }
];

export const MOCK_REPORTS: Report[] = [
  { 
    id: '101', 
    gameId: 'ABL-204', 
    date: '2024-05-10', 
    status: 'Reviewed', 
    feedbackScore: 92,
    threePO_IOT: 'Good positioning throughout the game.',
    criteria: 'Met all standard criteria.',
    teamwork: 'Excellent communication with partners.',
    generally: 'Solid performance.'
  },
  { 
    id: '102', 
    gameId: 'ABL-209', 
    date: '2024-05-12', 
    status: 'Submitted', 
    feedbackScore: 0,
    threePO_IOT: 'Some issues with IOT in the 3rd quarter.',
    criteria: 'Mostly met criteria.',
    teamwork: 'Good teamwork.',
    generally: 'Average game.'
  },
  { 
    id: '103', 
    gameId: 'ABL-215', 
    date: '2024-05-15', 
    status: 'Draft', 
    feedbackScore: 0,
    threePO_IOT: '',
    criteria: '',
    teamwork: '',
    generally: ''
  }
];

export const MOCK_NEWS: NewsItem[] = [
  {
    id: 'n1',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    commentary: 'Example news post.',
    createdAt: '2024-05-01T10:00:00Z',
    createdByName: 'Instructor'
  },
  {
    id: 'n2',
    youtubeUrl: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
    commentary: 'Another example news post.',
    createdAt: '2024-04-25T14:00:00Z',
    createdByName: 'Instructor'
  }
];
