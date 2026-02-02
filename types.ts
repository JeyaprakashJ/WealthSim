
export type CurrencyCode = 'USD' | 'INR' | 'EUR' | 'GBP';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  locale: string;
}

export type ThemeId = 'midnight' | 'light' | 'neutral';

export interface Theme {
  id: ThemeId;
  label: string;
  isDark: boolean;
  tokens: {
    primary: string;
    onPrimary: string;
    primaryContainer: string;
    onPrimaryContainer: string;
    secondary: string;
    secondaryContainer: string;
    surface: string;
    onSurface: string;
    onSurfaceVariant: string;
    surfaceContainer: string;
    surfaceContainerLow: string;
    surfaceContainerHigh: string;
    outline: string;
    outlineVariant: string;
  }
}

export interface LifeEvent {
  id: string;
  year: number;
  type: 'expense' | 'income_jump' | 'windfall';
  amount: number;
  hikePercentage?: number; // One-time override for salary growth %
  newRsuAmount?: number;   // One-time override for RSU grant value
  description: string;
  icon: string;
}

export interface SimulationConfig {
  initialAge: number;
  startYear: number;
  duration: number;
  baseSalary: number;
  rsu: number; 
  initialAssets: number;
  bonusPercent: number;
  hikePercent: number; // Renamed from baseHike for consistency with ConfigPanel
  baseHike?: number; // Deprecated, kept for compatibility if needed
  inflation: number;
  stockGrowth: number; // Renamed from rsuGrowth
  rsuGrowth?: number; // Deprecated
  taxRate: number;
  savingsRate: number;
  returnConservative: number;
  returnModerate: number;
  returnAggressive: number;
  lifeEvents: LifeEvent[];
}

export interface YearOverride {
  base?: number;
  rsu?: number;
  bonus?: number;
}

export interface YearData {
  year: number;
  age: number;
  base: number;
  rsu: number;
  bonus: number;
  annualNetPay: number; // Base + Bonus - Tax (Annual Cash Take-home)
  taxRate: number; // Effective tax rate for this year
  annualSpent: number; // Portion of net pay used for living expenses
  grossIncome: number;
  postTaxIncome: number;
  investable: number;
  wealthConservative: number;
  wealthModerate: number;
  wealthAggressive: number;
  cashWealthMod: number;
  stockWealthMod: number;
  event?: LifeEvent;
}

export interface SimulationResult {
  years: YearData[];
  finalWealth: {
    conservative: number;
    moderate: number;
    aggressive: number;
  };
}
