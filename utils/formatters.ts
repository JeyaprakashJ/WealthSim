
import { CurrencyConfig } from '../types';

export const formatCurrency = (value: number, config: CurrencyConfig, compact = false): string => {
  const formatter = new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    notation: compact ? 'compact' : 'standard',
    // Set both min and max to 2 for standard currency, 
    // but for compact we allow up to 2 for cleaner visuals.
    minimumFractionDigits: compact ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(value);
};

export const formatNumber = (value: number, locale: string): string => {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  }).format(value);
};
