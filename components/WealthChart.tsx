
import React, { useMemo, useState, useRef } from 'react';
import { YearData, CurrencyConfig, Theme } from '../types';
import { formatCurrency } from '../utils/formatters';

export type ChartMode = 'growth' | 'composition';

const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

interface WealthChartProps {
  data: YearData[];
  currency: CurrencyConfig;
  theme: Theme;
  mode: ChartMode;
  rsuValue: number;
}

const WealthChart: React.FC<WealthChartProps> = ({ data, currency, theme, mode, rsuValue }) => {
  const margin = { top: 10, right: 20, bottom: 30, left: 75 };
  const width = 800; 
  const height = 320; 
  
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const showRSU = rsuValue > 0;

  const visibleData = data;

  const colors = useMemo(() => {
    switch (theme.id) {
      case 'neutral':
        return {
          conservative: '#71717A',
          moderate: '#F4F4F5',
          aggressive: '#A1A1AA',
          base: '#F4F4F5',
          bonus: '#A1A1AA',
          rsu: '#52525B',
          areaP: '#18181b',
          areaS: '#09090b',
          areaT: '#27272a'
        };
      case 'midnight':
        return {
          conservative: '#CCC2DC', 
          moderate: '#D0BCFF',     
          aggressive: '#EFB8C8',   
          base: '#D0BCFF',         
          bonus: '#B69DF8',        
          rsu: '#9A82E3',       
          areaP: '#262130',
          areaS: '#1F1E25',
          areaT: '#2D1F24'
        };
      case 'light':
      default:
        return {
          conservative: '#625B71', 
          moderate: '#6750A4',     
          aggressive: '#7D5260',   
          base: '#6750A4',         
          bonus: '#8573BC',        
          rsu: '#A294D1',       
          areaP: '#F3EDF7',
          areaS: '#F7F2FA',
          areaT: '#FFF1F4'
        };
    }
  }, [theme.id]);

  const chartData = useMemo(() => {
    if (visibleData.length === 0) return null;

    const innerPadding = 40; 
    const chartAreaWidth = width - margin.left - margin.right;
    const drawableWidth = chartAreaWidth - (innerPadding * 2);
    
    const xStep = visibleData.length > 1 ? drawableWidth / (visibleData.length - 1) : 0;
    const getX = (i: number) => margin.left + innerPadding + i * xStep;

    if (mode === 'growth') {
        // Dynamic Y Scaling: Max value is derived ONLY from visible subset
        const maxWealth = Math.max(...visibleData.map(d => d.wealthAggressive), 1000);
        const yScale = (height - margin.top - margin.bottom) / maxWealth;
        const getY = (val: number) => height - margin.bottom - val * yScale;

        const createPath = (key: 'wealthConservative' | 'wealthModerate' | 'wealthAggressive') => {
            return visibleData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d[key])}`).join(' ');
        };

        const createArea = (key: 'wealthConservative' | 'wealthModerate' | 'wealthAggressive') => {
            const points = visibleData.map((d, i) => ({ x: getX(i), y: getY(d[key]) }));
            const bottom = height - margin.bottom;
            
            let path = `M ${points[0].x} ${bottom}`;
            points.forEach(p => {
                path += ` L ${p.x} ${p.y}`;
            });
            path += ` L ${points[points.length - 1].x} ${bottom} Z`;
            return path;
        };

        return {
            type: 'growth',
            maxVal: maxWealth,
            xStep,
            getX,
            getY,
            paths: {
                conservative: createPath('wealthConservative'),
                moderate: createPath('wealthModerate'),
                aggressive: createPath('wealthAggressive'),
            },
            areas: {
                conservative: createArea('wealthConservative'),
                moderate: createArea('wealthModerate'),
                aggressive: createArea('wealthAggressive'),
            }
        };
    } else {
        // Dynamic Y Scaling for Composition: Max from visible subset
        const maxIncome = Math.max(...visibleData.map(d => d.base + d.bonus + d.rsu), 1000);
        const yScale = (height - margin.top - margin.bottom) / maxIncome;
        const getY = (val: number) => height - margin.bottom - val * yScale;
        
        const barWidth = Math.min(Math.max(xStep * 0.6, 6), 30);

        const bars = visibleData.map((d, i) => {
            const x = getX(i) - barWidth / 2;
            const yBase = getY(d.base);
            const hBase = (height - margin.bottom) - yBase;
            const yBonus = getY(d.base + d.bonus);
            const hBonus = yBase - yBonus;
            const yRSU = getY(d.base + d.bonus + d.rsu);
            const hRSU = yBonus - yRSU;
            
            return {
                index: i,
                year: d.year,
                x,
                width: barWidth,
                base: { y: yBase, h: hBase },
                bonus: { y: yBonus, h: hBonus },
                rsu: { y: yRSU, h: hRSU },
                total: d.base + d.bonus + d.rsu
            };
        });

        return {
            type: 'composition',
            maxVal: maxIncome,
            xStep,
            getX,
            getY,
            bars
        };
    }
  }, [visibleData, width, height, mode]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current || !chartData) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * width;
    
    const innerPadding = 40;
    const relX = svgX - margin.left - innerPadding;
    const index = Math.round(relX / chartData.xStep);
    
    if (index >= 0 && index < visibleData.length) {
      setActiveIndex(index);
      const tipX = rect.left + (chartData.getX(index) / width) * rect.width;
      const tipY = e.clientY;
      const offset = 20;
      const tooltipWidth = 220;
      setTooltipPos({ 
        x: index > visibleData.length / 2 ? tipX - tooltipWidth - offset : tipX + offset, 
        y: tipY 
      });
    } else {
      setActiveIndex(null);
    }
  };

  if (!chartData) return null;

  const gridColor = theme.isDark ? '#2B2930' : '#ECE6F0';
  const textColor = theme.isDark ? '#CAC4D0' : '#49454F';

  const activeYearData = activeIndex !== null ? visibleData[activeIndex] : null;

  const axisFormatter = useMemo(() => new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: currency.code,
    notation: 'compact',
    maximumFractionDigits: 0,
  }), [currency]);

  return (
    <div className="w-full h-full relative flex">
      <div className="flex-1 min-w-0 flex flex-col h-full relative">
        <div className="flex-1 min-h-0 relative">
          <svg 
              ref={svgRef}
              viewBox={`0 0 ${width} ${height}`} 
              className="w-full h-full cursor-crosshair"
              preserveAspectRatio="xMidYMid meet"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setActiveIndex(null)}
          >
            {[0, 0.33, 0.66, 1].map((p) => {
              const y = height - margin.bottom - (height - margin.top - margin.bottom) * p;
              const val = chartData.maxVal * p;
              return (
                <g key={p}>
                  <line x1={margin.left} y1={y} x2={width - margin.right} y2={y} stroke={gridColor} strokeWidth="1" />
                  <text x={margin.left - 15} y={y + 4} textAnchor="end" className="text-[14px] font-bold" fill={textColor}>
                    {axisFormatter.format(val)}
                  </text>
                </g>
              );
            })}

            {visibleData.filter((_, i) => i % Math.max(1, Math.ceil(visibleData.length / 6)) === 0).map((d) => (
              <text key={d.year} x={chartData.getX(visibleData.indexOf(d))} y={height - margin.bottom + 20} textAnchor="middle" className="text-[14px] font-bold" fill={textColor}>
                {d.year}
              </text>
            ))}

            {chartData.type === 'growth' && (
                <>
                  <path d={chartData.areas?.aggressive} fill={colors.areaT} />
                  <path d={chartData.areas?.moderate} fill={colors.areaP} />
                  <path d={chartData.areas?.conservative} fill={colors.areaS} />
                  <path d={chartData.paths?.aggressive} fill="none" stroke={colors.aggressive} strokeWidth="3" strokeLinecap="round" />
                  <path d={chartData.paths?.moderate} fill="none" stroke={colors.moderate} strokeWidth="3" strokeLinecap="round" />
                  <path d={chartData.paths?.conservative} fill="none" stroke={colors.conservative} strokeWidth="3" strokeLinecap="round" />

                  {visibleData.map((d, i) => {
                    if (!d.event) return null;
                    const x = chartData.getX(i);
                    const y = chartData.getY(d.wealthModerate);
                    return (
                      <g key={`event-${d.year}`}>
                        <line x1={x} y1={margin.top} x2={x} y2={height - margin.bottom} stroke={colors.moderate} strokeWidth="1.5" strokeDasharray="4,4" opacity="0.4" />
                        <circle cx={x} cy={margin.top} r="12" fill={theme.isDark ? '#4F378B' : '#EADDFF'} stroke={colors.moderate} strokeWidth="1" />
                        <text x={x} y={margin.top + 5} textAnchor="middle" className="material-symbols-outlined text-[15px]" fill={colors.moderate}>{d.event.icon}</text>
                      </g>
                    );
                  })}

                  {activeIndex !== null && activeYearData && (
                      <g>
                          <line x1={chartData.getX(activeIndex)} y1={margin.top} x2={chartData.getX(activeIndex)} y2={height - margin.bottom} stroke={textColor} strokeWidth="1.5" />
                          <circle cx={chartData.getX(activeIndex)} cy={chartData.getY(activeYearData.wealthAggressive)} r="6" fill={colors.aggressive} stroke={theme.isDark ? '#141218' : '#FCF8FF'} strokeWidth="2" />
                          <circle cx={chartData.getX(activeIndex)} cy={chartData.getY(activeYearData.wealthModerate)} r="6" fill={colors.moderate} stroke={theme.isDark ? '#141218' : '#FCF8FF'} strokeWidth="2" />
                          <circle cx={chartData.getX(activeIndex)} cy={chartData.getY(activeYearData.wealthConservative)} r="6" fill={colors.conservative} stroke={theme.isDark ? '#141218' : '#FCF8FF'} strokeWidth="2" />
                      </g>
                  )}
                </>
            )}

            {chartData.type === 'composition' && chartData.bars && (
              <g>
                  {chartData.bars.map((bar) => (
                      <g key={bar.year} opacity={activeIndex === null || activeIndex === bar.index ? 1 : 0.4} className="transition-opacity duration-200">
                          <rect x={bar.x} y={bar.base.y} width={bar.width} height={bar.base.h} fill={colors.base} />
                          <rect x={bar.x} y={bar.bonus.y} width={bar.width} height={bar.bonus.h} fill={colors.bonus} />
                          {showRSU && <rect x={bar.x} y={bar.rsu.y} width={bar.width} height={bar.rsu.h} fill={colors.rsu} />}
                      </g>
                  ))}
              </g>
            )}
          </svg>

          {activeIndex !== null && activeYearData && (
              <div 
                  className={`fixed pointer-events-none z-[60] p-4 rounded-2xl shadow-2xl border w-[220px] animate-in fade-in zoom-in-95 duration-200 backdrop-blur-md`}
                  style={{ 
                    left: tooltipPos.x, 
                    top: Math.max(tooltipPos.y - 120, 10),
                    backgroundColor: theme.isDark ? 'rgba(29, 27, 32, 0.95)' : 'rgba(236, 230, 240, 0.95)',
                    borderColor: theme.isDark ? '#49454F' : '#CAC4D0',
                    color: theme.isDark ? '#E6E1E5' : '#1D1B20'
                  }}
              >
                  <div className="flex justify-between items-center mb-3">
                      <span className={`text-[11px] font-bold`}>{activeYearData.year}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${theme.tokens.surfaceContainer}`}>Age {activeYearData.age}</span>
                  </div>
                  <div className="space-y-3">
                      {activeYearData.event && (
                          <div className={`p-2 rounded-xl mb-2 ${theme.tokens.primaryContainer} ${theme.tokens.onPrimaryContainer} flex items-center gap-3`}>
                              <MaterialIcon name={activeYearData.event.icon} className="text-sm" />
                              <span className="text-[10px] font-bold truncate tracking-tight">{activeYearData.event.description}</span>
                          </div>
                      )}
                      {mode === 'growth' ? (
                          <>
                              <div className={`flex flex-col gap-2 border-b ${theme.tokens.outlineVariant} pb-3 mb-3`}>
                                  <div className="flex justify-between text-[11px]"><span className="opacity-70">Total Net Worth</span><span className="font-bold">{formatCurrency(activeYearData.wealthModerate, currency, true)}</span></div>
                                  <div className="flex justify-between text-[10px]"><span className="opacity-70">Cash Savings</span><span className="font-bold" style={{ color: colors.moderate }}>{formatCurrency(activeYearData.cashWealthMod, currency, true)}</span></div>
                                  {showRSU && <div className="flex justify-between text-[10px]"><span className="opacity-70">RSU Portfolio</span><span className="font-bold" style={{ color: colors.aggressive }}>{formatCurrency(activeYearData.stockWealthMod, currency, true)}</span></div>}
                              </div>
                              <div className="flex justify-between text-[10px] font-bold"><span className="opacity-70">Aggressive Outlook</span><span className="font-bold">{formatCurrency(activeYearData.wealthAggressive, currency, true)}</span></div>
                          </>
                      ) : (
                          <>
                              <div className={`flex flex-col gap-2 border-b ${theme.tokens.outlineVariant} pb-3 mb-3`}>
                                  <div className="flex justify-between text-[11px] font-bold"><span>Total Gross</span><span>{formatCurrency(activeYearData.grossIncome, currency, true)}</span></div>
                                  <div className="flex justify-between text-[10px]"><span className="opacity-70">Base Salary</span><span className="font-bold" style={{ color: colors.base }}>{formatCurrency(activeYearData.base, currency, true)}</span></div>
                                  <div className="flex justify-between text-[10px]"><span className="opacity-70">Performance Bonus</span><span className="font-bold" style={{ color: colors.bonus }}>{formatCurrency(activeYearData.bonus, currency, true)}</span></div>
                                  {showRSU && <div className="flex justify-between text-[10px]"><span className="opacity-70">RSU Grants</span><span className="font-bold" style={{ color: colors.rsu }}>{formatCurrency(activeYearData.rsu, currency, true)}</span></div>}
                              </div>
                              <div className="flex justify-between text-[10px] font-bold italic"><span className="opacity-70">Post-Tax Investable</span><span className="font-bold text-emerald-500">{formatCurrency(activeYearData.investable, currency, true)}</span></div>
                          </>
                      )}
                  </div>
              </div>
          )}
        </div>

        <div className="flex justify-center gap-6 py-1 text-[11px] font-bold px-2 scrollbar-none shrink-0">
          {mode === 'growth' ? (
            <>
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.conservative }}></span><span>Conservative</span></div>
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.moderate }}></span><span>Moderate</span></div>
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.aggressive }}></span><span>Aggressive</span></div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.base }}></span><span>Base</span></div>
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.bonus }}></span><span>Bonus</span></div>
              {showRSU && <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.rsu }}></span><span>RSU Portfolio</span></div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WealthChart;
