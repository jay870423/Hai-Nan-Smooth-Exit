
export type Tab = 'home' | 'scanner' | 'quota' | 'blacklist';

export type PortStatus = 'GREEN' | 'YELLOW' | 'RED';

export type AIModelProvider = 'gemini' | 'qwen' | 'deepseek' | 'doubao';

export interface PortData {
  id: string;
  name: string;
  location: string;
  status: PortStatus; // Overall status (merged) or Customs status
  waitTimeMinutes: number;
  strictnessScore: number; // 1-10 (From Supabase/User Reports)
  lastUpdated: string;
  reportCount: number;
  lat?: number;
  lng?: number;
  // New fields for Real-time Traffic (Baidu Map)
  trafficStatus?: PortStatus; 
  trafficDescription?: string; // e.g., "道路畅通", "严重拥堵"
}

export interface ScanResult {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  funnyMessage: string;
  detectedItems: string[];
  estimatedValue: number;
  isDaigouSuspect: boolean;
}

export interface BlacklistItem {
  id: string; // Added ID for DB updates
  rank: number;
  name: string;
  category: string;
  reason: string;
  confiscatedCountToday: number;
}