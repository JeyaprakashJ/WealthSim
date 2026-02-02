
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { CURRENCIES, DEFAULT_CONFIG, THEMES } from './constants';
import { SimulationConfig, CurrencyConfig, CurrencyCode, YearOverride, ThemeId, Theme, LifeEvent } from './types';
import { runSimulation } from './utils/simulation';
import { formatCurrency } from './utils/formatters';
import Sidebar from './components/Sidebar';
import WealthChart from './components/WealthChart';
import WealthTable from './components/WealthTable';
import { GoogleGenAI, Type } from "@google/genai";
import { exportData } from './utils/exportHandler';
import JSZip from 'jszip';

import ConfigPanel from './components/ConfigPanel';

const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const StatCard = ({ title, value, sub, icon, theme, currency, inflation, duration, cagr }: any) => {
  const [isFlipped, setIsFlipped] = useState(false);

  // Calculate Real Value (Inflation Adjusted)
  const realValue = value / Math.pow(1 + (inflation / 100), duration);
  
  // Calculate Real Return (Approximation via subtraction as requested)
  const realReturn = cagr - inflation;

  const cardContent = (displayValue: number, displaySub: string, isBack: boolean) => (
    <div 
        className={`absolute inset-0 flex items-center gap-4 px-5 py-3 rounded-[20px] ${theme.tokens.surfaceContainer} border ${theme.tokens.outlineVariant} shadow-sm hover:shadow-md`}
        style={{ 
            backfaceVisibility: 'hidden', 
            WebkitBackfaceVisibility: 'hidden',
            transform: isBack ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
    >
        <div className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-2xl ${theme.tokens.primaryContainer} ${theme.tokens.onPrimaryContainer} shadow-inner`}>
            <MaterialIcon name={icon} className="text-[22px]" />
        </div>

        <div className="flex flex-1 items-center justify-between gap-4 min-w-0">
            <div className="flex flex-col min-w-0">
                <span className={`text-[10px] font-bold ${theme.tokens.onSurfaceVariant} mb-0.5 truncate`}>
                    {title}
                </span>
                <span className={`text-xl font-bold tracking-tight ${theme.tokens.onSurface} truncate`}>
                    {formatCurrency(displayValue, currency, true)}
                </span>
            </div>
            
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${theme.tokens.secondaryContainer} ${theme.isDark ? 'text-[#E8DEF8]' : 'text-[#1D192B]'} ring-1 ring-inset ${theme.tokens.outlineVariant}`}>
                    {displaySub}
                </span>
                {isBack && (
                    <span className={`text-[8px] font-medium ${theme.tokens.onSurfaceVariant} opacity-70`}>
                        CAGR - Inflation
                    </span>
                )}
            </div>
        </div>
    </div>
  );

  return (
    <div 
        className="group relative h-[88px] cursor-pointer"
        style={{ perspective: '1000px' }}
        onClick={() => setIsFlipped(!isFlipped)}
    >
        <div 
            className={`w-full h-full transition-all duration-500 relative`}
            style={{ 
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}
        >
            {/* FRONT FACE */}
            {cardContent(value, sub, false)}

            {/* BACK FACE */}
            {cardContent(realValue, `${Number(realReturn.toFixed(2))}% Real`, true)}

        </div>
    </div>
  );
};

const BentoCard = ({ title, subtitle, children, theme, className = "", action }: any) => (
  <div className={`p-4 rounded-3xl ${theme.tokens.surfaceContainerLow} border ${theme.tokens.outlineVariant} flex flex-col overflow-hidden ${className}`}>
    <div className="flex justify-between items-center min-h-[32px] mb-1">
      <div>
        <h3 className={`text-[14px] font-bold ${theme.tokens.onSurface} leading-tight`}>{title}</h3>
        {subtitle && <p className={`text-[10px] ${theme.tokens.onSurfaceVariant}`}>{subtitle}</p>}
      </div>
      {action}
    </div>
    <div className="flex-1 min-h-0 relative">
      {children}
    </div>
  </div>
);

const App: React.FC = () => {
  const [config, setConfig] = useState<SimulationConfig>({ ...DEFAULT_CONFIG, lifeEvents: [] });
  const [currency, setCurrency] = useState<CurrencyConfig>(CURRENCIES.INR);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [overrides, setOverrides] = useState<Record<number, YearOverride>>({});
  const [themeId, setThemeId] = useState<ThemeId>('light');
  
  const [chatOpen, setChatOpen] = useState(false);
  const [mobileConfigOpen, setMobileConfigOpen] = useState(false);
  const [eventInput, setEventInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [history, setHistory] = useState<YearData[]>([]);

  const theme = useMemo(() => THEMES.find(t => t.id === themeId) || THEMES[0], [themeId]);
  
  const simulationResults = useMemo(() => {
    const liveResults = runSimulation(config, overrides, currency.code);
    if (history.length === 0) return liveResults;

    // Merge History + Live
    // 1. Filter live results to start after history
    const lastHistoryYear = history[history.length - 1].year;
    const futureYears = liveResults.years.filter(y => y.year > lastHistoryYear);

    // 2. Combine
    const combinedYears = [...history, ...futureYears];

    // 3. Recalculate final wealth summary based on the NEW combined end state
    // Note: The 'liveResults.finalWealth' is correct for the projection, 
    // but we should ensure it reflects the end of the combined array.
    // Since 'futureYears' comes from 'liveResults', the final wealth *is* the end of liveResults.
    // Unless futureYears is empty (simulation ended), in which case we take history end.
    
    const finalYear = combinedYears[combinedYears.length - 1];
    const finalWealth = {
        conservative: finalYear.wealthConservative,
        moderate: finalYear.wealthModerate,
        aggressive: finalYear.wealthAggressive
    };

    return {
        years: combinedYears,
        finalWealth
    };
  }, [config, overrides, currency.code, history]);

  const handleConfigChange = (newConfig: SimulationConfig) => {
    // If we change config, we might invalidate the "continuity" if we change start year manually.
    // But generally, we want to keep history if it's set. 
    // However, if the user changes 'startYear' to be BEFORE history ends, we have a conflict.
    // For simplicity, if user manually changes config, we keep history unless they explicitly clear it (which we don't have a button for yet).
    // Actually, the prompt implies "user will be able to use the controls... to get refreshed simulation".
    // This implies history stays fixed, and controls affect the future.
    setConfig(newConfig);
  };

  const handleCurrencyChange = (code: CurrencyCode) => setCurrency(CURRENCIES[code]);

  const handleOverride = useCallback((year: number, field: keyof YearOverride, value: number) => {
    setOverrides(prev => ({ ...prev, [year]: { ...prev[year], [field]: value } }));
  }, []);

  const handleReset = () => {
    setOverrides({});
    setHistory([]); // Clear history on full reset
    setConfig(prev => ({ ...prev, lifeEvents: [] }));
  };

  const handleCopyTable = useCallback(async () => {
    const hasEvents = config.lifeEvents.length > 0;
    const headers = ['Year', 'Age', 'Base Salary', 'Bonus', 'Disposable Income', 'Investable Cash', 'RSU Grant', 'Total Wealth'];
    if (hasEvents) headers.splice(2, 0, 'Life Event');

    const rows = simulationResults.years.map(row => {
      const investableCashOnly = row.annualNetPay * (config.savingsRate / 100);
      const eventAmount = row.event?.type === 'windfall' ? row.event.amount : (row.event?.type === 'expense' ? -row.event.amount : 0);
      const totalInvestable = investableCashOnly + eventAmount;

      const line = [
        row.year.toString(),
        row.age.toString(),
        row.base.toFixed(2),
        row.bonus.toFixed(2),
        row.annualNetPay.toFixed(2),
        totalInvestable.toFixed(2),
        row.rsu.toFixed(2),
        row.wealthModerate.toFixed(2)
      ];
      
      if (hasEvents) {
        line.splice(2, 0, row.event ? `${row.event.description} (${row.event.amount})` : '-');
      }
      
      return line.join('\t');
    });

    const text = [headers.join('\t'), ...rows].join('\n');
    
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  }, [simulationResults, config.lifeEvents, config.savingsRate]);

  const handleProcessFile = async (file: File) => {
    try {
      let importedConfig: any = null;
      let importedCSV: string | null = null;

      // 1. Handle ZIP files
      if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
        const zip = new JSZip();
        const content = await zip.loadAsync(file);
        
        if (content.files['config.json']) {
          const configText = await content.files['config.json'].async('text');
          importedConfig = JSON.parse(configText);
        }
        if (content.files['simulation_data.csv']) {
            importedCSV = await content.files['simulation_data.csv'].async('text');
        }
      }
      // 2. Handle JSON files
      else if (file.type === 'application/json' || file.name.endsWith('.json')) {
        const text = await file.text();
        importedConfig = JSON.parse(text);
      }
      // 3. Handle CSV files
      else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        importedCSV = await file.text();
      }

      // Process Imported Data
      if (importedConfig || importedCSV) {
          const currentSystemYear = new Date().getFullYear();
          let newHistory: YearData[] = [];
          let lastHistoryRow: any = null;

          // Parse CSV for History
          if (importedCSV) {
              const lines = importedCSV.split('\n');
              const headers = lines[0].split(',');
              // Simple mapping based on known headers
              // Headers: Year, Age, Base Salary, Bonus, Disposable Income, Investable Cash, RSU Grant, Total Wealth, [Life Event]
              
              for (let i = 1; i < lines.length; i++) {
                  if (!lines[i].trim()) continue;
                  const cols = lines[i].split(',');
                  const year = parseInt(cols[0]);
                  
                  if (year < currentSystemYear) {
                      // This is a historical year
                      const age = parseInt(cols[1]);
                      const base = parseFloat(cols[2]);
                      const bonus = parseFloat(cols[3]);
                      const annualNetPay = parseFloat(cols[4]); // Disposable Income
                      // Investable Cash is cols[5]
                      const rsu = parseFloat(cols[6]);
                      const wealth = parseFloat(cols[7]);
                      
                      // Reconstruct YearData
                      // Note: We might miss some derived fields like 'taxRate' or 'grossIncome' if not in CSV.
                      // We'll fill essential ones for display.
                      newHistory.push({
                          year,
                          age,
                          base,
                          bonus,
                          annualNetPay,
                          rsu,
                          wealthModerate: wealth,
                          wealthConservative: wealth, // Assume converged history
                          wealthAggressive: wealth,   // Assume converged history
                          taxRate: 0, // Unknown from CSV
                          annualSpent: 0, // Unknown
                          grossIncome: 0, // Unknown
                          postTaxIncome: annualNetPay,
                          investable: parseFloat(cols[5]),
                          cashWealthMod: 0, // Unknown breakdown
                          stockWealthMod: 0, // Unknown breakdown
                          event: undefined // Could parse if needed, but complex
                      });
                  }
              }
              
              if (newHistory.length > 0) {
                  lastHistoryRow = newHistory[newHistory.length - 1];
              }
          }

          // Update Config
          if (importedConfig) {
              const baseConfig = importedConfig.config || importedConfig;
              
              if (lastHistoryRow) {
                  // Rolling Simulation Logic
                  const newStartYear = lastHistoryRow.year + 1;
                  const newInitialAge = lastHistoryRow.age + 1;
                  const originalEndYear = baseConfig.startYear + baseConfig.duration;
                  const newDuration = Math.max(1, originalEndYear - newStartYear);

                  setConfig(prev => ({
                      ...prev,
                      ...baseConfig,
                      startYear: newStartYear,
                      initialAge: newInitialAge,
                      initialAssets: lastHistoryRow.wealthModerate,
                      baseSalary: lastHistoryRow.base,
                      rsu: lastHistoryRow.rsu, 
                      duration: newDuration
                  }));
                  setHistory(newHistory);
              } else {
                  // Standard Import (No history or all future)
                  setConfig(prev => ({ ...prev, ...baseConfig }));
                  setHistory([]);
              }

              if (importedConfig.currency) {
                  setCurrency(CURRENCIES[importedConfig.currency as CurrencyCode] || CURRENCIES.INR);
              }
          } else if (lastHistoryRow) {
              // CSV Only Import (No Config JSON)
              // We infer state from the last historical row
              const newStartYear = lastHistoryRow.year + 1;
              const newInitialAge = lastHistoryRow.age + 1;
              // We keep existing duration/config but shift the start
              
              setConfig(prev => ({
                  ...prev,
                  startYear: newStartYear,
                  initialAge: newInitialAge,
                  initialAssets: lastHistoryRow.wealthModerate,
                  baseSalary: lastHistoryRow.base,
                  rsu: lastHistoryRow.rsu
              }));
              setHistory(newHistory);
          }
          return;
      }

      // 3. Fallback to AI extraction for Images/PDFs
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ 
            parts: [
                { inlineData: { data: base64Data, mimeType: file.type } }, 
                { text: `Extract annual 'baseSalary', 'rsu', 'initialAssets', 'bonusPercent'. JSON only.` }
            ] 
        }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              baseSalary: { type: Type.NUMBER },
              rsu: { type: Type.NUMBER },
              initialAssets: { type: Type.NUMBER },
              bonusPercent: { type: Type.NUMBER }
            }
          }
        }
      });

      const extracted = JSON.parse(response.text || '{}');
      if (extracted && typeof extracted === 'object') {
        setConfig(prev => ({ ...prev, ...extracted }));
        setHistory([]); // Clear history on new AI import
      }
    } catch (e) {
      console.error("File Processing Error:", e);
    }
  };

  const handleAddLifeEvent = async () => {
    if (!eventInput.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const currentSimYear = config.startYear;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Life event prompt: "${eventInput}". Current simulation start year is ${currentSimYear}. 
        Extract: 
        - year (number)
        - type (expense, income_jump, or windfall)
        - amount (number, flat addition/subtraction)
        - hikePercentage (optional number for one-time salary % growth override)
        - newRsuAmount (optional number for one-time RSU grant value override)
        - description (max 15 chars)
        - icon (Material Symbol name). 
        Return a JSON array of objects.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                year: { type: Type.NUMBER },
                type: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                hikePercentage: { type: Type.NUMBER },
                newRsuAmount: { type: Type.NUMBER },
                description: { type: Type.STRING },
                icon: { type: Type.STRING }
              },
              required: ["year", "type", "amount", "description", "icon"]
            }
          }
        }
      });

      const newEvents: any[] = JSON.parse(response.text || '[]');
      if (newEvents.length > 0) {
        setConfig(prev => ({
          ...prev,
          lifeEvents: [
            ...prev.lifeEvents,
            ...newEvents.map(e => ({ ...e, id: Math.random().toString(36).substr(2, 9) }))
          ]
        }));
        setEventInput('');
        setChatOpen(false); 
      }
    } catch (e) {
      console.error("AI Error:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`flex flex-col md:flex-row w-screen h-screen overflow-hidden ${theme.tokens.surface} ${theme.tokens.onSurface} transition-colors duration-300`}>
      <Sidebar
        config={config}
        onChange={handleConfigChange}
        currency={currency}
        onCurrencyChange={handleCurrencyChange}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        theme={theme}
        onThemeChange={setThemeId}
        onProcessFile={handleProcessFile}
      />

      <main className={`flex-1 h-full overflow-y-auto scrollbar-thin ${theme.tokens.surfaceContainerLow} relative`}>
        
        <div className="flex justify-between items-center h-20 px-4 flex-shrink-0">
          <div>
            <h2 className={`text-2xl font-bold tracking-tight ${theme.tokens.onSurface}`}>WealthFlow</h2>
            <p className={`text-xs mt-0.5 ${theme.tokens.onSurfaceVariant}`}>From today's investments to tomorrow's freedom: plan for early retirement and family growth.</p>
          </div>
          <button 
            type="button" 
            onClick={() => exportData(config, simulationResults, currency)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold transition-all ${theme.tokens.primary} ${theme.tokens.onPrimary} shadow-lg active:scale-95`}
          >
            <MaterialIcon name="download" className="text-lg" />
            <span>Export Data</span>
          </button>
        </div>

        <div className="px-4 pb-10 flex flex-col gap-8">
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="Conservative" value={simulationResults.finalWealth.conservative} sub={`${config.returnConservative}% CAGR`} icon="shield" theme={theme} currency={currency} inflation={config.inflation} duration={config.duration} cagr={config.returnConservative} />
            <StatCard title="Moderate" value={simulationResults.finalWealth.moderate} sub={`${config.returnModerate}% CAGR`} icon="bolt" theme={theme} currency={currency} inflation={config.inflation} duration={config.duration} cagr={config.returnModerate} />
            <StatCard title="Aggressive" value={simulationResults.finalWealth.aggressive} sub={`${config.returnAggressive}% CAGR`} icon="trending_up" theme={theme} currency={currency} inflation={config.inflation} duration={config.duration} cagr={config.returnAggressive} />
        </div>

        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left Column: Stacked Charts */}
            <div className="lg:col-span-5 flex flex-col gap-4">
                <BentoCard title="Wealth Trajectory" theme={theme} className="h-[260px] sm:h-[280px] lg:h-[320px]">
                  <div id="wealth-trajectory-chart" className="h-full w-full min-h-0">
                    <WealthChart data={simulationResults.years} currency={currency} theme={theme} mode="growth" rsuValue={config.rsu} />
                  </div>
                </BentoCard>

                <BentoCard title="Income Structure" theme={theme} className="h-[260px] sm:h-[280px] lg:h-[320px]">
                  <div id="income-structure-chart" className="h-full w-full min-h-0">
                    <WealthChart data={simulationResults.years} currency={currency} theme={theme} mode="composition" rsuValue={config.rsu} />
                  </div>
                </BentoCard>
            </div>

            {/* Right Column: Full Height Table */}
            <div className="lg:col-span-7 h-full">
                <BentoCard 
                  title="Yearly Breakdown" 
                  theme={theme} 
                  className="h-[656px]" // Matches 320 + 320 + gap(16)
                  action={
                    <div className="flex items-center gap-2">
                        <button 
                        type="button"
                        onClick={(e) => { e.preventDefault(); handleCopyTable(); }} 
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-full border ${theme.tokens.outline} ${theme.tokens.onSurfaceVariant} hover:bg-black/5 transition-all active:scale-95 flex items-center gap-1.5`}
                        >
                        <MaterialIcon name={isCopied ? "check" : "content_copy"} className="text-[14px]" />
                        {isCopied ? "Copied" : "Copy"}
                        </button>
                        <button 
                        type="button"
                        onClick={(e) => { e.preventDefault(); handleReset(); }} 
                        className={`text-[10px] font-bold px-4 py-1.5 rounded-full border ${theme.tokens.outline} ${theme.tokens.onSurfaceVariant} hover:bg-black/5 transition-all active:scale-95`}
                        >
                        Reset Overrides
                        </button>
                    </div>
                  }
                >
                  <div id="yearly-breakdown-table" className="h-full">
                    <WealthTable 
                      data={simulationResults.years}
                      config={config}
                      currency={currency} 
                      theme={theme} 
                      onOverride={handleOverride} 
                      onReset={handleReset} 
                      compact={true}
                    />
                  </div>
                </BentoCard>
            </div>
        </div>

        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
            {/* Mobile Config FAB */}
            <button 
                type="button"
                onClick={() => setMobileConfigOpen(true)}
                className={`md:hidden w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${theme.tokens.secondaryContainer} ${theme.tokens.onSecondaryContainer}`}
            >
                <MaterialIcon name="tune" className="text-2xl" />
            </button>

            {/* AI Chat FAB */}
            {chatOpen && (
                <div className={`w-80 rounded-3xl overflow-hidden shadow-2xl border ${theme.tokens.outlineVariant} ${theme.tokens.surfaceContainerHigh} animate-in slide-in-from-bottom-4 duration-300`}>
                    <div className="p-4 border-b border-white/10 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                             <div className={`p-1.5 rounded-lg ${theme.tokens.primaryContainer}`}>
                                <MaterialIcon name="bolt" className={`text-sm ${theme.tokens.onPrimaryContainer}`} />
                             </div>
                             <span className="text-xs font-bold">Magic Timeline</span>
                        </div>
                        <button type="button" onClick={() => setChatOpen(false)} className="opacity-60 hover:opacity-100">
                            <MaterialIcon name="close" className="text-sm" />
                        </button>
                    </div>
                    <div className="p-4 space-y-4">
                        <p className="text-[10px] opacity-60 leading-relaxed">
                            Describe changes like "25% hike in 2027" or "Buying 50L car in 2030".
                        </p>
                        <textarea
                            value={eventInput}
                            onChange={(e) => setEventInput(e.target.value)}
                            placeholder="e.g. 25% salary hike in 2027..."
                            className={`w-full h-20 p-3 text-[11px] font-medium rounded-2xl resize-none outline-none border-2 transition-all ${theme.tokens.surfaceContainerLow} ${theme.tokens.onSurface} ${theme.tokens.outlineVariant} focus:border-primary`}
                        />
                        <button 
                            type="button"
                            onClick={(e) => { e.preventDefault(); handleAddLifeEvent(); }}
                            disabled={!eventInput.trim() || isProcessing}
                            className={`w-full py-2.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 ${isProcessing ? 'opacity-50' : ''} ${theme.tokens.primary} ${theme.tokens.onPrimary}`}
                        >
                            {isProcessing ? (
                                <MaterialIcon name="sync" className="text-xs animate-spin" />
                            ) : (
                                <>
                                    <MaterialIcon name="add_task" className="text-xs" />
                                    <span>Apply Event</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
            <button 
                type="button"
                onClick={(e) => { e.preventDefault(); setChatOpen(!chatOpen); }}
                className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${theme.tokens.primary} ${theme.tokens.onPrimary}`}
            >
                <MaterialIcon name={chatOpen ? "close" : "bolt"} className="text-2xl" />
            </button>
        </div>

        {/* Mobile Config Modal */}
        {mobileConfigOpen && (
            <div className="fixed inset-0 z-[60] md:hidden flex flex-col bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className={`flex-1 mt-12 rounded-t-[32px] overflow-hidden flex flex-col shadow-2xl ${theme.tokens.surface} animate-in slide-in-from-bottom-full duration-300`}>
                    <div className="p-4 flex items-center justify-between border-b border-white/5">
                        <h2 className={`text-lg font-bold ${theme.tokens.onSurface} ml-2`}>Configuration</h2>
                        <button 
                            onClick={() => setMobileConfigOpen(false)}
                            className={`p-2 rounded-full hover:bg-black/5 ${theme.tokens.onSurfaceVariant}`}
                        >
                            <MaterialIcon name="close" className="text-xl" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <ConfigPanel 
                            config={config} 
                            onChange={handleConfigChange} 
                            currency={currency} 
                            onCurrencyChange={handleCurrencyChange} 
                            theme={theme} 
                            onThemeChange={setThemeId} 
                            onProcessFile={handleProcessFile} 
                        />
                    </div>
                </div>
            </div>
        )}
        </div>
      </main>
    </div>
  );
};

export default App;
