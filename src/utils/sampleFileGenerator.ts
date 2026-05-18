import * as XLSX from 'xlsx';

/**
 * Generates and downloads a properly formatted .xlsx sample file for trade imports.
 * Includes example columns and 2–3 realistic example rows.
 */
export function downloadSampleExcel() {
  const headers = ['Date', 'Symbol', 'Direction', 'Entry Price', 'Exit Price', 'Quantity', 'PnL', 'Fees', 'Setup', 'Notes'];
  const rows = [
    ['2025-01-15', 'AAPL', 'BUY', 178.50, 182.30, 100, 380, 15.20, 'Breakout', 'Clean breakout above 180 resistance with strong volume'],
    ['2025-01-16', 'TSLA', 'SELL', 245.00, 241.80, 50, 160, 12.80, 'Pullback', 'Short on pullback from overbought RSI at 72'],
    ['2025-01-17', 'MSFT', 'BUY', 402.10, 399.50, 75, -195, 14.10, 'Reversal', 'Failed reversal attempt, stopped out'],
  ];

  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, // Date
    { wch: 10 }, // Symbol
    { wch: 10 }, // Direction
    { wch: 12 }, // Entry Price
    { wch: 12 }, // Exit Price
    { wch: 10 }, // Quantity
    { wch: 10 }, // PnL
    { wch: 10 }, // Fees
    { wch: 14 }, // Setup
    { wch: 55 }, // Notes
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sample Trades');

  // Add instructions sheet
  const instrData = [
    ['TradeFlow Pro — Import Template'],
    [''],
    ['Instructions:'],
    ['1. Fill in your trade data following the column format above.'],
    ['2. Date format: YYYY-MM-DD (e.g., 2025-01-15)'],
    ['3. Direction: BUY or SELL'],
    ['4. Prices: Use decimal numbers (e.g., 178.50)'],
    ['5. Quantity: Whole number of shares or contracts'],
    ['6. PnL: Can be positive or negative'],
    ['7. Fees: Total charges/commissions for the trade'],
    ['8. Setup: Your trade setup (e.g., Breakout, Pullback, FVG, Support/Resistance)'],
    ['9. Notes: Optional — any additional context about the trade'],
    [''],
    ['Supported column aliases:'],
    ['Date → Trade Date, Order Date'],
    ['Symbol → Ticker, Instrument'],
    ['Direction → Type, Side, Buy/Sell'],
    ['Entry Price → Buy Price, Avg Entry'],
    ['Exit Price → Sell Price, Avg Exit'],
    ['Quantity → Qty, Size, Filled Qty'],
  ];
  const wsInstr = XLSX.utils.aoa_to_sheet(instrData);
  wsInstr['!cols'] = [{ wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Instructions');

  XLSX.writeFile(wb, 'TradeFlowPro_Sample.xlsx');
}
