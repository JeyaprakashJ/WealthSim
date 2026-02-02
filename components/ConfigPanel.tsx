import React, { useRef, useState } from 'react';
import { SimulationConfig, CurrencyConfig, CurrencyCode, Theme, ThemeId } from '../types';
import { CURRENCIES, THEMES } from '../constants';

const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

interface InputFieldProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  isInteger?: boolean;
  theme: Theme;
  icon?: string;
  iconClass?: string;
}

const InputField: React.FC<InputFieldProps> = ({ label, value, onChange, min, max, step = 1, suffix, isInteger, theme, icon, iconClass }) => {
  const [localValue, setLocalValue] = useState(value?.toString() || '0');

  React.useEffect(() => {
    setLocalValue(value?.toString() || '0');
  }, [value]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = parseFloat(e.target.value);
    setLocalValue(newVal.toString());
    onChange(newVal);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
    const parsed = parseFloat(e.target.value);
    if (!isNaN(parsed)) {
      onChange(Math.min(Math.max(parsed, min), max));
    }
  };

  const sliderId = `slider-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="mb-5 last:mb-0">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          {icon && (
            <div className={`w-5 h-5 rounded-md flex items-center justify-center ${iconClass || theme.tokens.primaryContainer}`}>
              <MaterialIcon name={icon} className={`text-[14px] ${theme.tokens.onPrimaryContainer}`} />
            </div>
          )}
          <label className={`text-[11px] font-bold ${theme.tokens.onSurfaceVariant} tracking-wide uppercase`}>{label}</label>
        </div>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={min}
            max={max}
            step={isInteger ? "1" : "0.1"}
            value={localValue}
            onChange={handleTextChange}
            className={`w-20 text-right bg-transparent text-xs font-bold focus:outline-none ${theme.tokens.onSurface}`}
          />
          {suffix && <span className={`text-[10px] font-bold w-4 text-center ${theme.tokens.onSurfaceVariant}`}>{suffix.trim()}</span>}
        </div>
      </div>
      <div className="relative px-1">
        <style dangerouslySetInnerHTML={{
          __html: `
            #${sliderId} {
                --md-sys-color-primary: ${theme.isDark ? '#D0BCFF' : '#6750A4'};
                --md-sys-color-surface-variant: ${theme.isDark ? '#49454F' : '#E7E0EC'};
            }
            #${sliderId}::-webkit-slider-thumb {
                border: none !important;
                outline: none !important;
            }
            #${sliderId}::-moz-range-thumb {
                border: none !important;
                outline: none !important;
            }
        `}} />
        <input
          id={sliderId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSliderChange}
          className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-[var(--md-sys-color-primary)]"
        />
      </div>
    </div>
  );
};

const NavigationDrawerSection = ({ icon, title, children, theme, isOpen, onToggle }: any) => (
  <div className={`mb-2 mx-2 rounded-2xl overflow-hidden transition-all duration-300 ${isOpen ? 'bg-black/5 dark:bg-white/5' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); onToggle(); }}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isOpen ? theme.tokens.onSurface : theme.tokens.onSurfaceVariant}`}
    >
      <MaterialIcon name={icon} className="text-[20px]" />
      <span className="text-sm font-bold flex-1">{title}</span>
      <MaterialIcon name="expand_more" className={`text-[20px] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[800px] opacity-100 pb-4' : 'max-h-0 opacity-0'}`}>
      <div className="px-4 pt-2">
        {children}
      </div>
    </div>
  </div>
);

interface ConfigPanelProps {
  config: SimulationConfig;
  onChange: (config: SimulationConfig) => void;
  currency: CurrencyConfig;
  onCurrencyChange: (code: CurrencyCode) => void;
  theme: Theme;
  onThemeChange: (id: ThemeId) => void;
  onProcessFile: (file: File) => Promise<void>;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onChange, currency, onCurrencyChange, theme, onThemeChange, onProcessFile }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>('Current State');

  const toggleSection = (title: string) => {
    setActiveSection(activeSection === title ? null : title);
  };

  const handleChange = (key: keyof SimulationConfig, value: number) => {
    let finalValue = value;
    if (key === 'initialAge' || key === 'duration') {
      finalValue = Math.round(value);
    } else {
      finalValue = Math.round(value * 100) / 100;
    }
    onChange({ ...config, [key]: finalValue });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProcessing(true);
      await onProcessFile(file);
      setProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className={`flex-1 overflow-y-auto overflow-x-hidden px-3 scrollbar-none`}>

        <div className="mb-8">
          <label className={`text-[11px] font-bold ml-4 mb-3 block ${theme.tokens.onSurfaceVariant}`}>Wealth Intelligence</label>


          <NavigationDrawerSection
            icon="auto_awesome"
            title="Parse Document"
            theme={theme}
            isOpen={activeSection === 'Parse Document'}
            onToggle={() => toggleSection('Parse Document')}
          >
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`
                        relative group cursor-pointer border-2 border-dashed rounded-2xl p-6 text-center transition-all
                        ${theme.tokens.outlineVariant} hover:border-primary hover:bg-black/5 dark:hover:bg-white/5
                    `}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".zip,.json,.csv,.pdf,image/*"
                onChange={handleFileChange}
              />
              <div className="flex flex-col items-center gap-2">
                <div className={`p-3 rounded-full ${theme.tokens.primaryContainer} ${theme.tokens.onPrimaryContainer} mb-1`}>
                  <MaterialIcon name={processing ? "sync" : "upload_file"} className={processing ? "animate-spin" : ""} />
                </div>
                <span className={`text-xs font-bold ${theme.tokens.onSurface}`}>
                  {processing ? "Analyzing..." : "Import Data / Upload Docs"}
                </span>
                <span className={`text-[10px] ${theme.tokens.onSurfaceVariant}`}>
                  Supports ZIP, JSON, CSV, PDF, Images
                </span>
              </div>
            </div>
          </NavigationDrawerSection>
        </div>

        <div className="mb-8">
          <label className={`text-[11px] font-bold ml-4 mb-3 block ${theme.tokens.onSurfaceVariant}`}>Configuration</label>

          <NavigationDrawerSection
            icon="person"
            title="Current State"
            theme={theme}
            isOpen={activeSection === 'Current State'}
            onToggle={() => toggleSection('Current State')}
          >
            <InputField
              label="Current Age"
              value={config.initialAge}
              onChange={(v) => handleChange('initialAge', v)}
              min={18} max={80} suffix="yrs" isInteger={true} theme={theme}
            />
            <InputField
              label="Base Salary"
              value={config.baseSalary}
              onChange={(v) => handleChange('baseSalary', v)}
              min={0} max={10000000} step={10000} suffix={currency.symbol} isInteger={true} theme={theme}
            />
            <InputField
              label="Annual RSU"
              value={config.rsu}
              onChange={(v) => handleChange('rsu', v)}
              min={0} max={10000000} step={5000} suffix={currency.symbol} isInteger={true} theme={theme}
            />
            <InputField
              label="Performance Bonus"
              value={config.bonusPercent}
              onChange={(v) => handleChange('bonusPercent', v)}
              min={0} max={100} suffix="%" theme={theme}
            />
            <InputField
              label="Net Worth Till Date"
              value={config.initialAssets}
              onChange={(v) => handleChange('initialAssets', v)}
              min={0} max={100000000} step={10000} suffix={currency.symbol} isInteger={true} theme={theme}
            />
          </NavigationDrawerSection>

          <NavigationDrawerSection
            icon="trending_up"
            title="Growth & Savings"
            theme={theme}
            isOpen={activeSection === 'Growth & Savings'}
            onToggle={() => toggleSection('Growth & Savings')}
          >
            <InputField
              label="Salary Hike"
              value={config.hikePercent}
              onChange={(v) => handleChange('hikePercent', v)}
              min={0} max={50} step={0.5} suffix="%" theme={theme}
            />
            <InputField
              label="Savings Ratio"
              value={config.savingsRate}
              onChange={(v) => handleChange('savingsRate', v)}
              min={0} max={100} suffix="%" theme={theme}
            />
          </NavigationDrawerSection>

          <NavigationDrawerSection
            icon="show_chart"
            title="Market Returns"
            theme={theme}
            isOpen={activeSection === 'Market Returns'}
            onToggle={() => toggleSection('Market Returns')}
          >
            <div className="space-y-6">
              <InputField
                label="Conservative"
                icon="shield"
                iconClass={theme.isDark ? 'bg-[#2D3142]' : 'bg-[#E0E5F5]'}
                value={config.returnConservative}
                onChange={(v) => handleChange('returnConservative', v)}
                min={0} max={30} step={0.01} suffix="%" theme={theme}
              />

              <InputField
                label="Moderate"
                icon="bolt"
                iconClass={theme.isDark ? 'bg-[#3E3547]' : 'bg-[#F2EBF7]'}
                value={config.returnModerate}
                onChange={(v) => handleChange('returnModerate', v)}
                min={0} max={30} step={0.01} suffix="%" theme={theme}
              />

              <InputField
                label="Aggressive"
                icon="trending_up"
                iconClass={theme.isDark ? 'bg-[#492532]' : 'bg-[#FFD8E4]'}
                value={config.returnAggressive}
                onChange={(v) => handleChange('returnAggressive', v)}
                min={0} max={30} step={0.01} suffix="%" theme={theme}
              />
            </div>
          </NavigationDrawerSection>

          <div className="px-4 py-2 mt-4 bg-black/5 dark:bg-white/5 rounded-2xl mx-1">
            <InputField
              label="Simulation Span"
              value={config.duration}
              onChange={(v) => handleChange('duration', v)}
              min={5}
              max={50}
              suffix="yrs"
              isInteger={true}
              theme={theme}
            />
          </div>
        </div>
      </div>

      <div className={`p-4 border-t transition-opacity duration-300 flex-shrink-0 ${theme.tokens.outlineVariant}`}>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {THEMES.map(t => {
            const isActive = theme.id === t.id;
            const iconMap: Record<string, string> = { light: 'light_mode', midnight: 'dark_mode', neutral: 'contrast' };
            return (
              <button
                type="button"
                key={t.id}
                onClick={(e) => { e.preventDefault(); onThemeChange(t.id); }}
                className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl transition-all border-2 ${isActive ? 'border-primary ' + theme.tokens.primaryContainer : 'border-transparent ' + theme.tokens.surfaceContainerHigh} hover:opacity-100 active:scale-95`}
              >
                <MaterialIcon
                  name={iconMap[t.id] || 'palette'}
                  className={`text-[20px] ${isActive ? theme.tokens.onPrimaryContainer : theme.tokens.onSurfaceVariant}`}
                />
              </button>
            );
          })}
        </div>

        <div className="relative group">
          <select
            value={currency.code}
            onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
            className={`w-full text-xs font-bold rounded-2xl px-4 py-3.5 outline-none border-2 transition-all appearance-none cursor-pointer ${theme.tokens.surfaceContainerHigh} ${theme.tokens.onSurface} ${theme.tokens.outlineVariant} focus:border-primary`}
          >
            {Object.values(CURRENCIES).map((curr) => (
              <option key={curr.code} value={curr.code}>
                {curr.code} ({curr.symbol})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default ConfigPanel;
