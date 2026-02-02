import { SimulationConfig, YearData, SimulationResult, YearOverride } from '../types';

/**
 * Calculates tax based on localized regimes.
 */
const calculateLocalTax = (income: number, currencyCode: string): { tax: number; rate: number } => {
  if (income <= 0) return { tax: 0, rate: 0 };

  if (currencyCode === 'INR') {
    const stdDed = 75000;
    const taxable = Math.max(0, income - stdDed);
    let baseTax = 0;
    
    if (taxable > 400000) baseTax += (Math.min(taxable, 800000) - 400000) * 0.05;
    if (taxable > 800000) baseTax += (Math.min(taxable, 1200000) - 800000) * 0.10;
    if (taxable > 1200000) baseTax += (Math.min(taxable, 1600000) - 1200000) * 0.15;
    if (taxable > 1600000) baseTax += (Math.min(taxable, 2000000) - 1600000) * 0.20;
    if (taxable > 2000000) baseTax += (Math.min(taxable, 2400000) - 2000000) * 0.25;
    if (taxable > 2400000) baseTax += (taxable - 2400000) * 0.30;
    
    if (income <= 775000) baseTax = 0;
    
    let surcharge = 0;
    if (income > 5000000) {
        surcharge = baseTax * 0.10;
    }
    
    const finalTax = (baseTax + surcharge) * 1.04;
    return { tax: finalTax, rate: (finalTax / income) * 100 };
  } 
  
  if (currencyCode === 'USD') {
    const stdDed = 14600;
    const taxable = Math.max(0, income - stdDed);
    let tax = 0;
    
    if (taxable > 0) tax += Math.min(taxable, 11600) * 0.10;
    if (taxable > 11600) tax += (Math.min(taxable, 47150) - 11600) * 0.12;
    if (taxable > 47150) tax += (Math.min(taxable, 100525) - 47150) * 0.22;
    if (taxable > 100525) tax += (Math.min(taxable, 191950) - 100525) * 0.24;
    if (taxable > 191950) tax += (Math.min(taxable, 243725) - 191950) * 0.32;
    if (taxable > 243725) tax += (Math.min(taxable, 609350) - 243725) * 0.35;
    if (taxable > 609350) tax += (taxable - 609350) * 0.37;
    
    return { tax, rate: (tax / income) * 100 };
  }

  const fallbackRate = 0.25; 
  return { tax: income * fallbackRate, rate: fallbackRate * 100 };
};

export const runSimulation = (
  config: SimulationConfig,
  overrides: Record<number, YearOverride>,
  currencyCode: string
): SimulationResult => {
  const years: YearData[] = [];
  
  let cashCons = config.initialAssets;
  let stockCons = 0;

  let cashMod = config.initialAssets;
  let stockMod = 0;

  let cashAgg = config.initialAssets;
  let stockAgg = 0;
  
  // Track the previous year's base for compounding hikes correctly
  let lastYearBase = config.baseSalary;

  for (let i = 0; i <= config.duration; i++) {
    const currentYear = config.startYear + i;
    const currentAge = config.initialAge + i;
    const event = config.lifeEvents.find(e => e.year === currentYear);
    
    let base: number;
    let rsu: number;

    // 1. One-time Salary Hike Logic
    const effectiveHikeRate = event?.hikePercentage !== undefined ? event.hikePercentage : (i === 0 ? 0 : config.hikePercent);
    
    if (i === 0) {
      // First year: Use provided base, but allow override or hike from current config start
      base = overrides[currentYear]?.base ?? (config.baseSalary * (1 + (event?.hikePercentage || 0) / 100));
    } else {
      // Subsequent years: Compound based on last year's actual base
      base = overrides[currentYear]?.base ?? (lastYearBase * (1 + effectiveHikeRate / 100));
    }

    // Apply flat income jumps if any
    if (event?.type === 'income_jump') {
      base += event.amount;
    }

    // 2. One-time RSU Grant Override
    // Reverts to config.rsu in the next year if no new event
    // RSU Grant is now FIXED annually (flat), unless manually overridden for a specific year.
    rsu = overrides[currentYear]?.rsu ?? (event?.newRsuAmount ?? config.rsu);

    const bonus = overrides[currentYear]?.bonus ?? base * (config.bonusPercent / 100);
    const grossCash = base + bonus;
    
    const cashTaxData = calculateLocalTax(grossCash, currencyCode);
    const annualNetPay = grossCash - cashTaxData.tax;
    
    const rsuTaxData = calculateLocalTax(rsu, currencyCode);
    const postTaxRSU = rsu - rsuTaxData.tax;

    const savingsRate = config.savingsRate / 100;
    
    // Adjust expenses for inflation
    // We calculate "spent" based on savings rate first, then inflate it? 
    // Or we just assume savings rate holds true against inflation?
    // Let's assume savings rate is the primary driver, but we can track "real" value if needed.
    // For now, standard model: Investable = Net * SavingsRate.
    
    let investableCash = annualNetPay * savingsRate;
    
    // Apply life event impact directly to investable cash (which compounds into wealth)
    if (event) {
        if (event.type === 'expense') {
            // Expenses grow with inflation if they are future projections? 
            // For simplicity, assume user enters "today's value" and we inflate it
            const inflatedAmount = event.amount * Math.pow(1 + (config.inflation / 100), i);
            investableCash -= inflatedAmount;
        } else if (event.type === 'windfall') {
            investableCash += event.amount;
        }
    }

    const rateCons = config.returnConservative / 100;
    const rateMod = config.returnModerate / 100;
    const rateAgg = config.returnAggressive / 100;

    // Compound wealth
    cashCons = cashCons * (1 + rateCons) + investableCash * (1 + rateCons / 2);
    stockCons = stockCons * (1 + rateCons) + postTaxRSU * (1 + rateCons / 2);

    cashMod = cashMod * (1 + rateMod) + investableCash * (1 + rateMod / 2);
    stockMod = stockMod * (1 + rateMod) + postTaxRSU * (1 + rateMod / 2);

    cashAgg = cashAgg * (1 + rateAgg) + investableCash * (1 + rateAgg / 2);
    stockAgg = stockAgg * (1 + rateAgg) + postTaxRSU * (1 + rateAgg / 2);

    years.push({
      year: currentYear,
      age: currentAge,
      base,
      rsu,
      bonus,
      annualNetPay,
      taxRate: cashTaxData.rate,
      annualSpent: annualNetPay * (1 - savingsRate),
      grossIncome: base + rsu + bonus,
      postTaxIncome: annualNetPay + postTaxRSU,
      investable: investableCash + postTaxRSU, 
      wealthConservative: cashCons + stockCons,
      wealthModerate: cashMod + stockMod,
      wealthAggressive: cashAgg + stockAgg,
      cashWealthMod: cashMod,
      stockWealthMod: stockMod,
      event: event
    });

    lastYearBase = base;
  }

  return {
    years,
    finalWealth: {
      conservative: cashCons + stockCons,
      moderate: cashMod + stockMod,
      aggressive: cashAgg + stockAgg,
    },
  };
};