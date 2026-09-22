import { CustomerRecord, CleanedDataResult, Thresholds } from '../types';

export function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function calculateMode(values: any[]): string {
  if (values.length === 0) return 'Unknown';
  const freqMap: Record<string, number> = {};
  let maxFreq = 0;
  let modeVal = String(values[0]);

  for (const v of values) {
    if (v === null || v === undefined || v === '') continue;
    const str = String(v);
    freqMap[str] = (freqMap[str] || 0) + 1;
    if (freqMap[str] > maxFreq) {
      maxFreq = freqMap[str];
      modeVal = str;
    }
  }
  return modeVal;
}

export function cleanAndImputeDataset(rawData: CustomerRecord[]): CleanedDataResult {
  if (!rawData || rawData.length === 0) {
    return {
      cleanedData: [],
      rawRowCount: 0,
      cleanedRowCount: 0,
      droppedRowCount: 0,
      imputationLog: {},
      numericColumns: [],
      categoricalColumns: []
    };
  }

  const rawRowCount = rawData.length;
  // Identify all unique columns
  const allColumns = Array.from(
    new Set(rawData.flatMap(row => Object.keys(row)))
  );
  const totalColCount = allColumns.length;

  // Step 1: Calculate missing % in each row and drop rows where > 50% fields are missing
  const retainedRows: CustomerRecord[] = [];
  let droppedRowCount = 0;

  for (const row of rawData) {
    let missingCount = 0;
    for (const col of allColumns) {
      const val = row[col];
      if (val === null || val === undefined || val === '' || Number.isNaN(val)) {
        missingCount++;
      }
    }

    const missingPct = totalColCount > 0 ? missingCount / totalColCount : 0;
    if (missingPct > 0.50) {
      droppedRowCount++;
    } else {
      // Safe deep copy of the row to avoid mutating original uploaded dataset
      retainedRows.push({ ...row });
    }
  }

  // Detect column types on retained rows
  const numericColumns: string[] = [];
  const categoricalColumns: string[] = [];

  for (const col of allColumns) {
    let isNumeric = true;
    let hasValues = false;

    for (const row of retainedRows) {
      const val = row[col];
      if (val !== null && val !== undefined && val !== '') {
        hasValues = true;
        if (typeof val !== 'number' && isNaN(Number(val))) {
          isNumeric = false;
          break;
        }
      }
    }

    if (hasValues && isNumeric) {
      numericColumns.push(col);
    } else if (hasValues) {
      categoricalColumns.push(col);
    }
  }

  // Step 2: Compute medians for numeric and modes for categorical
  const imputationLog: Record<string, string> = {};

  for (const col of numericColumns) {
    const validNumbers: number[] = [];
    let hasMissing = false;

    for (const row of retainedRows) {
      const val = row[col];
      if (val === null || val === undefined || val === '' || Number.isNaN(val)) {
        hasMissing = true;
      } else {
        validNumbers.push(Number(val));
      }
    }

    if (hasMissing && validNumbers.length > 0) {
      const median = calculateMedian(validNumbers);
      imputationLog[col] = `Median (${median.toLocaleString(undefined, { maximumFractionDigits: 2 })})`;
      for (const row of retainedRows) {
        const val = row[col];
        if (val === null || val === undefined || val === '' || Number.isNaN(val)) {
          row[col] = median;
        } else {
          row[col] = Number(val);
        }
      }
    } else {
      // Ensure numeric type
      for (const row of retainedRows) {
        if (row[col] !== null && row[col] !== undefined && row[col] !== '') {
          row[col] = Number(row[col]);
        }
      }
    }
  }

  for (const col of categoricalColumns) {
    const validCategoricals: any[] = [];
    let hasMissing = false;

    for (const row of retainedRows) {
      const val = row[col];
      if (val === null || val === undefined || val === '') {
        hasMissing = true;
      } else {
        validCategoricals.push(val);
      }
    }

    if (hasMissing && validCategoricals.length > 0) {
      const mode = calculateMode(validCategoricals);
      imputationLog[col] = `Mode ("${mode}")`;
      for (const row of retainedRows) {
        const val = row[col];
        if (val === null || val === undefined || val === '') {
          row[col] = mode;
        }
      }
    }
  }

  return {
    cleanedData: retainedRows,
    rawRowCount,
    cleanedRowCount: retainedRows.length,
    droppedRowCount,
    imputationLog,
    numericColumns,
    categoricalColumns
  };
}

export function computeDatasetThresholds(data: CustomerRecord[]): Thresholds {
  if (data.length === 0) return {};

  const cols = Object.keys(data[0]);

  // Find target columns
  const incomeCol = cols.find(c => /income/i.test(c));
  const spendingCol = cols.find(c => /spend|purchase.*amount/i.test(c));
  const freqCol = cols.find(c => /freq|orders|visits/i.test(c));
  const recencyCol = cols.find(c => /recency|days.*since/i.test(c));

  const thresholds: Thresholds = {
    incomeCol,
    spendingCol,
    freqCol,
    recencyCol
  };

  if (incomeCol) {
    const vals = data.map(d => Number(d[incomeCol])).filter(v => !isNaN(v));
    thresholds.incomeMedian = calculateMedian(vals);
  }

  if (spendingCol) {
    const vals = data.map(d => Number(d[spendingCol])).filter(v => !isNaN(v));
    thresholds.spendingMedian = calculateMedian(vals);
  }

  if (freqCol) {
    const vals = data.map(d => Number(d[freqCol])).filter(v => !isNaN(v));
    thresholds.freqMedian = calculateMedian(vals);
  }

  if (recencyCol) {
    const vals = data.map(d => Number(d[recencyCol])).filter(v => !isNaN(v));
    thresholds.recencyMedian = calculateMedian(vals);
  }

  return thresholds;
}

export function standardizeFeatures(data: CustomerRecord[], features: string[]): {
  scaled: number[][];
  means: number[];
  stds: number[];
} {
  const n = data.length;
  const d = features.length;
  const means = new Array(d).fill(0);
  const stds = new Array(d).fill(0);

  // Calculate means
  for (let j = 0; j < d; j++) {
    const feat = features[j];
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += Number(data[i][feat] || 0);
    }
    means[j] = sum / n;
  }

  // Calculate standard deviations
  for (let j = 0; j < d; j++) {
    const feat = features[j];
    const mean = means[j];
    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      const diff = Number(data[i][feat] || 0) - mean;
      sumSq += diff * diff;
    }
    stds[j] = Math.sqrt(sumSq / n) || 1e-9;
  }

  // Scale matrix
  const scaled: number[][] = new Array(n);
  for (let i = 0; i < n; i++) {
    const row = new Array(d);
    for (let j = 0; j < d; j++) {
      row[j] = (Number(data[i][features[j]] || 0) - means[j]) / stds[j];
    }
    scaled[i] = row;
  }

  return { scaled, means, stds };
}
