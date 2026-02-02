import React from 'react';
import { SimulationConfig, CurrencyConfig, CurrencyCode, Theme, ThemeId } from '../types';
import ConfigPanel from './ConfigPanel';

const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

interface SidebarProps {
  config: SimulationConfig;
  onChange: (config: SimulationConfig) => void;
  currency: CurrencyConfig;
  onCurrencyChange: (code: CurrencyCode) => void;
  isOpen: boolean;
  onToggle: () => void;
  theme: Theme;
  onThemeChange: (id: ThemeId) => void;
  onProcessFile: (file: File) => Promise<void>;
  apiKey: string;
  onApiKeyChange: (val: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ config, onChange, currency, onCurrencyChange, isOpen, onToggle, theme, onThemeChange, onProcessFile, apiKey, onApiKeyChange }) => {
  return (
    <div className={`
      relative transition-all duration-300 z-20 flex flex-col 
      w-full md:h-full md:border-r
      ${isOpen ? 'h-full md:w-80' : 'h-16 md:w-20'} 
      ${theme.tokens.surfaceContainerLow} ${theme.tokens.outlineVariant}
      hidden md:flex
    `}>
      <div className="p-4 flex items-center h-20 flex-shrink-0">
        <button
          type="button"
          onClick={onToggle}
          className={`p-2 rounded-full hover:bg-black/5 ${theme.tokens.onSurface}`}
        >
          <MaterialIcon name="menu" />
        </button>
        {isOpen && (
          <h1 className={`ml-4 text-xl font-bold tracking-tight ${theme.tokens.onSurface}`}>Simulation Controls</h1>
        )}
      </div>

      <div className={`flex-1 overflow-hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <ConfigPanel
          config={config}
          onChange={onChange}
          currency={currency}
          onCurrencyChange={onCurrencyChange}
          apiKey={apiKey}
          onApiKeyChange={onApiKeyChange}
          theme={theme}
          onThemeChange={onThemeChange}
          onProcessFile={onProcessFile}
        />
      </div>
    </div>
  );
};

export default Sidebar;