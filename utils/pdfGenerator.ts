import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { SimulationConfig, CurrencyConfig, YearData } from '../types';
import { formatCurrency } from './formatters';

export const generateReport = async (
  config: SimulationConfig,
  simulationResults: { years: YearData[]; finalWealth: any },
  currency: CurrencyConfig,
  theme: any
) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // Helper for drawing a header
  const drawHeader = (title: string, pageNum: number) => {
    doc.setFillColor(theme.isDark ? 29 : 236, theme.isDark ? 27 : 230, theme.isDark ? 32 : 240);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(theme.isDark ? 230 : 29, theme.isDark ? 225 : 27, theme.isDark ? 229 : 32);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('WealthSim', margin, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(title, margin, 33);
    doc.text(`Page ${pageNum}`, pageWidth - margin - 15, 33);
  };

  // --- PAGE 1: CSV DATA ---
  drawHeader('Simulation Data (CSV Format)', 1);

  doc.setTextColor(theme.isDark ? 50 : 50, 50, 50);
  doc.setFontSize(10);
  doc.setFont('courier', 'normal');

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
  const splitCSV = doc.splitTextToSize(csvContent, pageWidth - 2 * margin);
  doc.text(splitCSV, margin, 55);

  // --- PAGE 2: JSON METADATA ---
  doc.addPage();
  drawHeader('Simulation Parameters (JSON)', 2);

  doc.setFontSize(10);
  doc.setFont('courier', 'normal');

  const metadata = {
    app: 'WealthSim',
    version: '1.0',
    exportDate: new Date().toISOString(),
    config: config,
    currency: currency.code
  };

  const metadataStr = JSON.stringify(metadata, null, 2);
  const splitMetadata = doc.splitTextToSize(metadataStr, pageWidth - 2 * margin);
  doc.text(splitMetadata, margin, 55);

  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`WealthSim_Export_${dateStr}.pdf`);
};
