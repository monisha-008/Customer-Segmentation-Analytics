export interface CustomerRecord {
  CustomerID: string;
  [key: string]: any;
}

export interface CleanedDataResult {
  cleanedData: CustomerRecord[];
  rawRowCount: number;
  cleanedRowCount: number;
  droppedRowCount: number;
  imputationLog: Record<string, string>;
  numericColumns: string[];
  categoricalColumns: string[];
}

export interface Thresholds {
  incomeMedian?: number;
  spendingMedian?: number;
  freqMedian?: number;
  recencyMedian?: number;
  incomeCol?: string;
  spendingCol?: string;
  freqCol?: string;
  recencyCol?: string;
}

export interface ClusterAudit {
  clusterId: number;
  segmentName: string;
  matchedRule: string;
  count: number;
  sharePct: number;
  meanIncome?: number;
  meanSpending?: number;
  meanFreq?: number;
  meanRecency?: number;
  characteristics: string[];
}

export interface ClusteringResult {
  clusterLabels: number[];
  inertia: number;
  silhouetteScore: number | null;
  clusterAudit: Record<number, ClusterAudit>;
  thresholds: Thresholds;
  scaledData: number[][];
  pcaData?: number[][];
  pcaVariance?: number[];
  selectedFeatures: string[];
  k: number;
}

export interface ElbowPoint {
  k: number;
  inertia: number;
  silhouette: number;
}
