
import { CurrencyConfig, SimulationConfig, Theme } from './types';

export const CURRENCIES: Record<string, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', locale: 'en-US' },
  INR: { code: 'INR', symbol: '₹', locale: 'en-IN' },
  EUR: { code: 'EUR', symbol: '€', locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', locale: 'en-GB' },
};

export const DEFAULT_CONFIG: SimulationConfig = {
  initialAge: 25,
  startYear: new Date().getFullYear(),
  duration: 15,
  baseSalary: 1000000, 
  rsu: 1000000, 
  initialAssets: 5000000,
  bonusPercent: 15,
  hikePercent: 10,
  baseHike: 10, // Legacy
  inflation: 6,
  stockGrowth: 10,
  rsuGrowth: 10, // Legacy
  taxRate: 30,
  savingsRate: 60,
  returnConservative: 10,
  returnModerate: 12,
  returnAggressive: 15,
  lifeEvents: [],
};

export const THEMES: Theme[] = [
  {
    id: 'light',
    label: 'Lumina',
    isDark: false,
    tokens: {
      primary: 'bg-[#6750A4]',
      onPrimary: 'text-white',
      primaryContainer: 'bg-[#EADDFF]',
      onPrimaryContainer: 'text-[#21005D]',
      secondary: 'bg-[#625B71]',
      secondaryContainer: 'bg-[#E8DEF8]',
      surface: 'bg-[#FCF8FF]', 
      onSurface: 'text-[#1D1B20]',
      onSurfaceVariant: 'text-[#49454F]',
      surfaceContainer: 'bg-[#F3EDF7]',
      surfaceContainerLow: 'bg-[#F7F2FA]',
      surfaceContainerHigh: 'bg-[#ECE6F0]',
      outline: 'border-[#79747E]',
      outlineVariant: 'border-[#CAC4D0]',
    }
  },
  {
    id: 'midnight',
    label: 'Obsidian',
    isDark: true,
    tokens: {
      primary: 'bg-[#D0BCFF]',
      onPrimary: 'text-[#381E72]',
      primaryContainer: 'bg-[#4F378B]',
      onPrimaryContainer: 'text-[#EADDFF]',
      secondary: 'bg-[#CCC2DC]',
      secondaryContainer: 'bg-[#4A4458]',
      surface: 'bg-[#141218]', 
      onSurface: 'text-[#E6E1E5]',
      onSurfaceVariant: 'text-[#CAC4D0]',
      surfaceContainer: 'bg-[#211F26]',
      surfaceContainerLow: 'bg-[#1D1B20]',
      surfaceContainerHigh: 'bg-[#2B2930]',
      outline: 'border-[#938F99]',
      outlineVariant: 'border-[#49454F]',
    }
  },
  {
    id: 'neutral',
    label: 'Zinc',
    isDark: true,
    tokens: {
      primary: 'bg-zinc-100',
      onPrimary: 'text-zinc-900',
      primaryContainer: 'bg-zinc-800',
      onPrimaryContainer: 'text-zinc-100',
      secondary: 'bg-zinc-400',
      secondaryContainer: 'bg-zinc-700',
      surface: 'bg-[#09090b]', 
      onSurface: 'text-zinc-200',
      onSurfaceVariant: 'text-zinc-400',
      surfaceContainer: 'bg-zinc-900',
      surfaceContainerLow: 'bg-[#0c0c0e]',
      surfaceContainerHigh: 'bg-zinc-800',
      outline: 'border-zinc-600',
      outlineVariant: 'border-zinc-800',
    }
  }
];
