// Web Worker for parsing CSV using papaparse
import Papa from 'papaparse';

self.onmessage = function (e) {
  const { csvText } = e.data;
  try {
    const result = Papa.parse(csvText, { skipEmptyLines: true });
    if (result.errors && result.errors.length > 0) {
      self.postMessage({ error: result.errors[0].message });
      return;
    }
    // Convert parsed data back to CSV string (normalized)
    const rows = result.data as string[][];
    const csvString = rows.map(row => row.map(cell => `"${(cell ?? '').replace(/"/g, '""')}` ).join(",")).join("\n");
    self.postMessage({ csv: csvString });
  } catch (err) {
    self.postMessage({ error: err instanceof Error ? err.message : String(err) });
  }
};
