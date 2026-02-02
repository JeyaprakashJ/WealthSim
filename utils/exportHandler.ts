import JSZip from 'jszip';
import { SimulationConfig, CurrencyConfig, YearData } from '../types';

export const exportData = async (
  config: SimulationConfig,
  simulationResults: { years: YearData[] },
  currency: CurrencyConfig
) => {
  const zip = new JSZip();

  // 1. Create CSV Content
  const headers = ['Year', 'Age', 'Base Salary', 'Bonus', 'Disposable Income', 'Investable Cash', 'RSU Grant', 'Total Wealth'];
  if (config.lifeEvents.length > 0) headers.splice(2, 0, 'Life Event');

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

    if (config.lifeEvents.length > 0) {
      line.splice(2, 0, row.event ? `${row.event.description} (${row.event.amount})` : '-');
    }

    return line.join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  zip.file("simulation_data.csv", csvContent);

  // 2. Create JSON Config Content
  const metadata = {
    app: 'WealthSim',
    version: '1.0',
    exportDate: new Date().toISOString(),
    config: config,
    currency: currency.code
  };
  zip.file("config.json", JSON.stringify(metadata, null, 2));

  // 3. Generate and Save ZIP
  const blob = await zip.generateAsync({ type: "blob" });
  const dateStr = new Date().toISOString().split('T')[0];

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `WealthSim_Export_${dateStr}.zip`;
  a.click();
  window.URL.revokeObjectURL(url);
};
