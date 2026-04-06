
export enum UserRole {
  PARTICIPANT = 'Participant',
  RECRUITER = 'Recruiter',
  ADMIN = 'Admin'
}

export enum UserStatus {
  ACTIVE = 'Active',
  IDLE = 'Idle',
  SUSPENDED = 'Suspended'
}

export interface Activity {
  id: string;
  type: 'post' | 'view' | 'update' | 'flag';
  description: string;
  timestamp: string;
}

export interface User {
  _id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  xp: number;
  level: number;
  status: string;
  isActive?: boolean;
  isOnline?: boolean;
  avatar: string;

  // Optional extended fields
  lastLogin?: string;
  rank?: number;
  gamification?: {
    points: number;
    rankedRating: number;
    level: number;
    rank: string;
    streak: number;
    badges: string[];
  };
  submissions?: number;
  languages?: string[];
  activities?: Activity[];
  flags?: string[];
  reports?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActivityLog {
  _id: string;
  user: {
    _id: string;
    name?: string;
    username?: string;
    email: string;
    avatar?: string;
  } | null; // User might be null if not logged in or deleted
  userId?: string;
  ip: string;
  browser: string;
  os: string;
  device: string;
  method: string;
  route: string;
  referrer?: string;
  userAgent: string;
  timestamp: string;
}
