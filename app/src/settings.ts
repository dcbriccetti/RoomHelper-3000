export interface Period {
    periodNum: number;
    startTime: string;
    endTime: string;
}

export interface Settings {  // Update this when the corresponding settings.py dict changes
  teacherName: string;
  missingSeatIndexes: number[];
  chatEnabled: boolean;
  sharesEnabled: boolean;
  checksEnabled: boolean;
  shares: any[];
  statuses: {
    name: string;
    symbol: string;
  }[];
  chatDelayMs: number;
  chatMessageMaxLen: number;
  allowedSharesDomains: string[];
  normalColor: [number, number, number];
  warningColor: [number, number, number];
  periods: Period[];
  columns: number;
  rows: number;
  aisleAfterColumn: number;
}
