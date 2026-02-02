import React, { useState, useRef, useMemo } from 'react';
import { YearData, CurrencyConfig, YearOverride, Theme, SimulationConfig } from '../types';
import { formatCurrency } from '../utils/formatters';

const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

interface EditableCellProps {
  year: number;
  field: keyof YearOverride;
  value: number;
  editing: { year: number; field: keyof YearOverride } | null;
  editValue: string;
  currency: CurrencyConfig;
  theme: Theme;
  onStartEdit: (year: number, field: keyof YearOverride, value: number) => void;
  onSave: () => void;
  onCancel: () => void;
  onEditValueChange: (val: string) => void;
}

const EditableCell: React.FC<EditableCellProps> = ({
  year, field, value, editing, editValue, currency, theme,
  onStartEdit, onSave, onCancel, onEditValueChange
}) => {
  const isEditing = editing?.year === year && editing?.field === field;

  if (isEditing) {
    return (
      <div className="flex flex-col items-center">
        <input
          autoFocus
          type="number"
          step="0.01"
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          className={`w-24 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary shadow-sm ${theme.tokens.surfaceContainerHigh} ${theme.tokens.onSurface} border-none`}
          onKeyDown={(e) => e.key === 'Enter' && onSave()}
        />
      </div>
    );
  }

  const hoverBg = theme.isDark ? 'hover:bg-[#2B2930]' : 'hover:bg-[#E7E0EC]';

  return (
    <div
      className={`group flex items-center justify-center cursor-pointer rounded-md px-2 py-1 transition-colors ${hoverBg}`}
      onClick={(e) => {
        e.stopPropagation();
        onStartEdit(year, field, value);
      }}
    >
      <span className={`text-[11px] font-bold ${theme.tokens.onSurface}`}>{formatCurrency(value, currency, true)}</span>
      <MaterialIcon name="edit" className={`text-[10px] ml-1 opacity-0 group-hover:opacity-100 transition-opacity ${theme.tokens.onSurfaceVariant}`} />
    </div>
  );
};

interface WealthTableProps {
  data: YearData[];
  config: SimulationConfig;
  currency: CurrencyConfig;
  theme: Theme;
  onOverride: (year: number, field: keyof YearOverride, value: number) => void;
  onReset: () => void;
  compact?: boolean;
}

type ColumnType = 'time' | 'base' | 'bonus' | 'disposableIncome' | 'investableCash' | 'grant' | 'total' | 'event' | null;

const WealthTable: React.FC<WealthTableProps> = ({ data, config, currency, theme, onOverride, onReset, compact = false }) => {
  const [editing, setEditing] = useState<{ year: number; field: keyof YearOverride } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<ColumnType>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const showRSU = config.rsu > 0;

  const colors = useMemo(() => {
    if (theme.id === 'neutral') {
      return { moderate: '#F4F4F5', aggressive: '#A1A1AA' };
    }
    if (theme.isDark) {
      return { moderate: '#D0BCFF', aggressive: '#EFB8C8' };
    } else {
      return { moderate: '#6750A4', aggressive: '#7D5260' };
    }
  }, [theme.id, theme.isDark]);

  const hasEvents = config.lifeEvents.length > 0;

  const handleStartEdit = (year: number, field: keyof YearOverride, value: number) => {
    setEditing({ year, field });
    setEditValue(value.toFixed(2));
  };

  const handleSave = () => {
    if (editing) {
      const val = parseFloat(editValue);
      if (!isNaN(val)) onOverride(editing.year, editing.field, val);
      setEditing(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent, year: number, col: ColumnType) => {
    const TOOLTIP_WIDTH = 260;
    const TOOLTIP_HEIGHT = col === 'total' ? 220 : 160;
    const OFFSET_X = 24;

    let x = e.clientX + OFFSET_X;
    let y = e.clientY - (TOOLTIP_HEIGHT / 2);

    if (x + TOOLTIP_WIDTH > window.innerWidth) {
      x = e.clientX - TOOLTIP_WIDTH - OFFSET_X;
    }

    if (y < 20) y = 20;
    if (y + TOOLTIP_HEIGHT > window.innerHeight) {
      y = window.innerHeight - TOOLTIP_HEIGHT - 20;
    }

    setTooltipPos({ x, y });
    setHoveredRow(year);
    setHoveredCol(col);
  };

  const activeRowData = hoveredRow !== null ? data.find(d => d.year === hoveredRow) : null;
  const activeRowIndex = hoveredRow !== null ? data.findIndex(d => d.year === hoveredRow) : -1;
  const prevRowData = activeRowIndex > 0 ? data[activeRowIndex - 1] : null;

  const renderTooltipContent = () => {
    if (!activeRowData) return null;

    const savingsFactor = (config.savingsRate / 100);

    switch (hoveredCol) {
      case 'base': {
        const hike = prevRowData ? ((activeRowData.base / prevRowData.base) - 1) * 100 : 0;
        return (
          <div className="space-y-2">
            <p className="text-[12px] font-bold">Salary Growth</p>
            <div className="space-y-1.5 text-[11px] border-b border-white/10 pb-2.5">
              <div className="flex justify-between"><span>Previous Base</span><span className="font-bold">{formatCurrency(prevRowData?.base || config.baseSalary, currency, true)}</span></div>
              <div className="flex justify-between text-emerald-500"><span>Annual Hike ({hike.toFixed(1)}%)</span><span className="font-bold">+{formatCurrency(activeRowData.base - (prevRowData?.base || config.baseSalary), currency, true)}</span></div>
            </div>
            <div className="flex justify-between text-[12px] font-bold pt-1">
              <span className="opacity-70">Current Base</span>
              <span>{formatCurrency(activeRowData.base, currency, true)}</span>
            </div>
          </div>
        );
      }
      case 'bonus':
        return (
          <div className="space-y-2">
            <p className="text-[12px] font-bold">Performance Bonus</p>
            <div className="space-y-1.5 text-[11px] border-b border-white/10 pb-2.5">
              <div className="flex justify-between"><span>Base Salary</span><span className="font-bold">{formatCurrency(activeRowData.base, currency, true)}</span></div>
              <div className="flex justify-between text-emerald-500"><span>Bonus Multiplier</span><span className="font-bold">× {config.bonusPercent}%</span></div>
            </div>
            <div className="flex justify-between text-[12px] font-bold pt-1">
              <span className="opacity-70">Gross Bonus</span>
              <span>{formatCurrency(activeRowData?.bonus || 0, currency, true)}</span>
            </div>
          </div>
        );
      case 'disposableIncome': {
        const grossCash = activeRowData.base + activeRowData.bonus;
        const taxAmount = Math.max(0, grossCash - activeRowData.annualNetPay);
        return (
          <div className="space-y-2">
            <p className="text-[12px] font-bold">Disposable Income</p>
            <p className="text-[10px] opacity-60">Cash take-home after graduated tax slabs</p>
            <div className="space-y-1.5 text-[11px] border-b border-white/10 pb-2.5 pt-1">
              <div className="flex justify-between"><span>Gross Cash</span><span className="font-bold">{formatCurrency(grossCash, currency, true)}</span></div>
              <div className="flex justify-between text-rose-500"><span>Income Tax ({activeRowData.taxRate.toFixed(1)}%)</span><span className="font-bold">-{formatCurrency(taxAmount, currency, true)}</span></div>
            </div>
            <div className="flex justify-between text-[12px] font-bold pt-1">
              <span className="opacity-70">Net Amount</span>
              <span>{formatCurrency(activeRowData.annualNetPay, currency, true)}</span>
            </div>
          </div>
        );
      }
      case 'investableCash': {
        const cashSaved = activeRowData.annualNetPay * savingsFactor;

        // FIX 1: Use amount directly (it is already signed correctly)
        const eventAmount = activeRowData.event ? activeRowData.event.amount : 0;

        const totalCashAdded = cashSaved + eventAmount;
        return (
          <div className="space-y-2">
            <p className="text-[12px] font-bold">Investable Cash</p>
            <p className="text-[10px] opacity-60">Cash surplus for monthly/yearly SIPs</p>
            <div className="space-y-1.5 text-[11px] border-b border-white/10 pb-2.5 pt-1">
              <div className="flex justify-between">
                <span>Cash Savings ({config.savingsRate}%)</span>
                <span className="font-bold text-emerald-500">+{formatCurrency(cashSaved, currency, true)}</span>
              </div>
              {eventAmount !== 0 && (
                <div className="flex justify-between">
                  <span>One-time Impact</span>
                  <span className={`font-bold ${eventAmount > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {eventAmount > 0 ? '+' : ''}{formatCurrency(eventAmount, currency, true)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex justify-between text-[12px] font-bold pt-1">
              <span className="opacity-70">Total Cash Added</span>
              <span className={`font-bold ${totalCashAdded < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {formatCurrency(totalCashAdded, currency, true)}
              </span>
            </div>
          </div>
        );
      }
      case 'grant':
        const rsuTaxedValue = activeRowData.rsu * (1 - activeRowData.taxRate / 100);
        return (
          <div className="space-y-2">
            <p className="text-[12px] font-bold">Annual RSU Grant</p>
            <div className="space-y-1.5 text-[11px] border-b border-white/10 pb-2.5">
              <div className="flex justify-between"><span>Grant Value</span><span className="font-bold">{formatCurrency(activeRowData.rsu, currency, true)}</span></div>
              <div className="flex justify-between text-rose-500"><span>Est. Tax (Held)</span><span className="font-bold">-{formatCurrency(activeRowData.rsu - rsuTaxedValue, currency, true)}</span></div>
            </div>
            <div className="flex justify-between text-[12px] font-bold pt-1">
              <span className="opacity-70">Net RSU Assets</span>
              <span className="text-emerald-500">{formatCurrency(rsuTaxedValue, currency, true)}</span>
            </div>
          </div>
        );
      case 'total': {
        const isInitialYear = activeRowIndex === 0;
        const openingBalance = isInitialYear ? config.initialAssets : prevRowData!.wealthModerate;
        const totalContributions = activeRowData.investable; // Investable cash + Post-tax RSU
        const closingWealth = activeRowData.wealthModerate;
        const totalInterest = closingWealth - (openingBalance + totalContributions);

        return (
          <div className="space-y-3">
            <div className="pb-1 border-b border-white/10">
              <p className="text-[12px] font-bold">Net Worth Accounting</p>
              <p className="text-[10px] opacity-60">Wealth transition for {activeRowData.year}</p>
            </div>
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="opacity-70">Opening Balance</span>
                <span className="font-medium">{formatCurrency(openingBalance, currency, true)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="opacity-70">Investable Cash + RSU</span>
                <span className={`font-bold ${totalContributions >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {totalContributions >= 0 ? '+' : ''}{formatCurrency(totalContributions, currency, true)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="opacity-70">Interest (Market Returns: {config.returnModerate}%)</span>
                <span className="font-bold text-emerald-500">+{formatCurrency(totalInterest, currency, true)}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-white/10">
              <div className="flex justify-between text-[12px] font-bold">
                <span className="opacity-90">Closing Wealth</span>
                <span style={{ color: colors.moderate }}>{formatCurrency(closingWealth, currency, true)}</span>
              </div>
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  const hoverRowBg = theme.isDark ? 'bg-[#2B2930]' : 'bg-[#F3EDF7]';

  return (
    <div className="relative" ref={containerRef} onMouseLeave={() => { setHoveredRow(null); setHoveredCol(null); }}>
      <div className="overflow-y-auto pr-1 scrollbar-thin max-h-[580px]">
        <table className="w-full text-center border-separate border-spacing-0">
          <thead className={`sticky top-0 z-20 text-[12px] font-bold ${theme.tokens.onSurfaceVariant}`}>
            <tr className="leading-none">
              <th className={`py-4 px-4 text-left border-b ${theme.tokens.outlineVariant} ${theme.tokens.surfaceContainerLow}`}>Year (Age)</th>
              {hasEvents && <th className={`py-4 px-4 border-b ${theme.tokens.outlineVariant} ${theme.tokens.surfaceContainerLow}`}>Life Event</th>}
              <th className={`py-4 px-4 border-b ${theme.tokens.outlineVariant} ${theme.tokens.surfaceContainerLow}`}>Base Salary</th>
              <th className={`py-4 px-4 border-b ${theme.tokens.outlineVariant} ${theme.tokens.surfaceContainerLow}`}>Annual Bonus</th>
              <th className={`py-4 px-4 border-b ${theme.tokens.outlineVariant} ${theme.tokens.surfaceContainerLow}`}>Disposable Income</th>
              <th className={`py-4 px-4 border-b ${theme.tokens.outlineVariant} ${theme.tokens.surfaceContainerLow}`}>Investable Cash</th>
              {showRSU && <th className={`py-4 px-4 border-b ${theme.tokens.outlineVariant} ${theme.tokens.surfaceContainerLow}`}>Annual RSU Grant</th>}
              <th className={`py-4 px-4 border-b ${theme.tokens.outlineVariant} ${theme.tokens.surfaceContainerLow} leading-tight`}>
                Total Wealth<br /><span className="text-[10px] font-normal opacity-70">EOY</span>
              </th>
            </tr>
          </thead>
          <tbody className={`divide-y ${theme.tokens.outlineVariant}`}>
            {data.map((row, idx) => {
              const investableCashOnly = row.annualNetPay * (config.savingsRate / 100);

              // FIX 2: Use amount directly (no manual type check needed for calculation)
              const eventAmount = row.event ? row.event.amount : 0;

              const totalInvestable = investableCashOnly + eventAmount;
              const isHistory = row.year < new Date().getFullYear();

              return (
                <tr
                  key={row.year}
                  className={`group ${isHistory ? (theme.isDark ? 'bg-white/5' : 'bg-black/5') : (idx % 2 === 0 ? theme.tokens.surfaceContainerLow : theme.tokens.surfaceContainer)} transition-colors cursor-default`}
                >
                  <td className={`py-3 px-4 text-left transition-colors ${hoveredRow === row.year && hoveredCol === 'time' ? hoverRowBg : ''}`} onMouseMove={(e) => handleMouseMove(e, row.year, 'time')}>
                    <div className="flex flex-col">
                      <span className={`text-[11px] font-bold ${theme.tokens.onSurface}`}>
                        {row.year} <span className={`text-[10px] font-bold opacity-60`}>({row.age})</span>
                      </span>
                      {isHistory && (
                        <span className={`text-[8px] font-bold uppercase tracking-wider ${theme.tokens.primaryContainer} ${theme.tokens.onPrimaryContainer} px-1.5 py-0.5 rounded-sm mt-1`}>Actual</span>
                      )}
                    </div>
                  </td>

                  {hasEvents && (
                    <td className="py-3 px-4">
                      {row.event ? (
                        <div className="flex flex-col items-center group/event relative">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${theme.tokens.primaryContainer} ${theme.tokens.onPrimaryContainer} shadow-sm border border-white/10`}>
                            <MaterialIcon name={row.event.icon} className="text-[16px]" />
                          </div>
                          <span className={`text-[8px] font-bold mt-1 ${theme.tokens.onSurfaceVariant} max-w-[50px] truncate`}>
                            {row.event.description}
                          </span>
                        </div>
                      ) : (
                        <span className="opacity-10">—</span>
                      )}
                    </td>
                  )}

                  <td className={`py-3 px-4 transition-colors ${hoveredRow === row.year && hoveredCol === 'base' ? hoverRowBg : ''}`} onMouseMove={(e) => handleMouseMove(e, row.year, 'base')}>
                    {isHistory ? (
                      <span className={`text-[11px] font-bold ${theme.tokens.onSurface} opacity-70`}>{formatCurrency(row.base, currency, true)}</span>
                    ) : (
                      <EditableCell year={row.year} field="base" value={row.base} editing={editing} editValue={editValue} currency={currency} theme={theme} onStartEdit={handleStartEdit} onSave={handleSave} onCancel={() => setEditing(null)} onEditValueChange={setEditValue} />
                    )}
                  </td>

                  <td className={`py-3 px-4 transition-colors ${hoveredRow === row.year && hoveredCol === 'bonus' ? hoverRowBg : ''}`} onMouseMove={(e) => handleMouseMove(e, row.year, 'bonus')}>
                    {isHistory ? (
                      <span className={`text-[11px] font-bold ${theme.tokens.onSurface} opacity-70`}>{formatCurrency(row.bonus, currency, true)}</span>
                    ) : (
                      <EditableCell year={row.year} field="bonus" value={row.bonus} editing={editing} editValue={editValue} currency={currency} theme={theme} onStartEdit={handleStartEdit} onSave={handleSave} onCancel={() => setEditing(null)} onEditValueChange={setEditValue} />
                    )}
                  </td>

                  <td className={`py-3 px-4 transition-colors ${hoveredRow === row.year && hoveredCol === 'disposableIncome' ? hoverRowBg : ''} bg-black/5 dark:bg-white/5`} onMouseMove={(e) => handleMouseMove(e, row.year, 'disposableIncome')}>
                    <div className="flex items-center justify-center">
                      <span className={`text-[11px] font-bold ${theme.tokens.onSurface} ${isHistory ? 'opacity-70' : ''}`}>
                        {formatCurrency(row.annualNetPay, currency, true)}
                      </span>
                    </div>
                  </td>

                  <td className={`py-3 px-4 transition-colors ${hoveredRow === row.year && hoveredCol === 'investableCash' ? hoverRowBg : ''}`} onMouseMove={(e) => handleMouseMove(e, row.year, 'investableCash')}>
                    <span className={`text-[11px] font-bold ${totalInvestable < 0 ? 'text-rose-500' : 'text-emerald-500'} ${isHistory ? 'opacity-70' : ''}`}>
                      {formatCurrency(totalInvestable, currency, true)}
                    </span>
                  </td>

                  {showRSU && (
                    <td className={`py-3 px-4 transition-colors ${hoveredRow === row.year && hoveredCol === 'grant' ? hoverRowBg : ''}`} onMouseMove={(e) => handleMouseMove(e, row.year, 'grant')}>
                      {isHistory ? (
                        <span className={`text-[11px] font-bold ${theme.tokens.onSurface} opacity-70`}>{formatCurrency(row.rsu, currency, true)}</span>
                      ) : (
                        <EditableCell year={row.year} field="rsu" value={row.rsu} editing={editing} editValue={editValue} currency={currency} theme={theme} onStartEdit={handleStartEdit} onSave={handleSave} onCancel={() => setEditing(null)} onEditValueChange={setEditValue} />
                      )}
                    </td>
                  )}

                  <td className={`py-3 px-4 transition-colors ${hoveredRow === row.year && hoveredCol === 'total' ? hoverRowBg : ''}`} onMouseMove={(e) => handleMouseMove(e, row.year, 'total')}>
                    <div className="flex justify-center">
                      <div className={`${isHistory ? (theme.isDark ? 'bg-white/10' : 'bg-black/10') : theme.tokens.primaryContainer} px-3 py-0.5 rounded-md shadow-sm`}>
                        <span className={`text-[11px] font-bold ${isHistory ? theme.tokens.onSurface : theme.tokens.onPrimaryContainer}`}>{formatCurrency(row.wealthModerate, currency, true)}</span>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hoveredRow !== null && hoveredCol !== null && !['time', 'event'].includes(hoveredCol) && activeRowData && (
        <div
          className={`fixed pointer-events-none z-[9999] p-4 rounded-2xl shadow-2xl border w-[260px] animate-in fade-in zoom-in-95 duration-150 backdrop-blur-lg`}
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            backgroundColor: theme.isDark ? 'rgba(29, 27, 32, 0.95)' : 'rgba(236, 230, 240, 0.95)',
            borderColor: theme.isDark ? '#49454F' : '#CAC4D0',
            color: theme.isDark ? '#E6E1E5' : '#1D1B20'
          }}
        >
          {renderTooltipContent()}
        </div>
      )}
    </div>
  );
};

export default WealthTable;