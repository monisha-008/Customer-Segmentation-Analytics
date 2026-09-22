import { CustomerRecord, Thresholds, ClusterAudit } from '../types';

export function deriveClusterProfilesAndNames(
  data: CustomerRecord[],
  labels: number[],
  k: number,
  thresholds: Thresholds
): Record<number, ClusterAudit> {
  const audit: Record<number, ClusterAudit> = {};
  const totalCount = data.length;

  const {
    incomeCol,
    spendingCol,
    freqCol,
    recencyCol,
    incomeMedian,
    spendingMedian,
    freqMedian,
    recencyMedian
  } = thresholds;

  for (let c = 0; c < k; c++) {
    // Collect all records in this cluster
    const clusterRows: CustomerRecord[] = [];
    for (let i = 0; i < totalCount; i++) {
      if (labels[i] === c) {
        clusterRows.push(data[i]);
      }
    }

    const count = clusterRows.length;
    const sharePct = totalCount > 0 ? (count / totalCount) * 100 : 0;

    // Averages
    let meanIncome: number | undefined;
    let meanSpending: number | undefined;
    let meanFreq: number | undefined;
    let meanRecency: number | undefined;

    if (incomeCol) {
      const sum = clusterRows.reduce((acc, r) => acc + Number(r[incomeCol] || 0), 0);
      meanIncome = count > 0 ? sum / count : 0;
    }
    if (spendingCol) {
      const sum = clusterRows.reduce((acc, r) => acc + Number(r[spendingCol] || 0), 0);
      meanSpending = count > 0 ? sum / count : 0;
    }
    if (freqCol) {
      const sum = clusterRows.reduce((acc, r) => acc + Number(r[freqCol] || 0), 0);
      meanFreq = count > 0 ? sum / count : 0;
    }
    if (recencyCol) {
      const sum = clusterRows.reduce((acc, r) => acc + Number(r[recencyCol] || 0), 0);
      meanRecency = count > 0 ? sum / count : 0;
    }

    // Evaluate conditions against dataset-wide medians
    const isHighIncome = (meanIncome !== undefined && incomeMedian !== undefined)
      ? meanIncome >= incomeMedian
      : false;
    const isLowIncome = (meanIncome !== undefined && incomeMedian !== undefined)
      ? meanIncome < incomeMedian
      : false;

    const isHighSpending = (meanSpending !== undefined && spendingMedian !== undefined)
      ? meanSpending >= spendingMedian
      : false;
    const isLowSpending = (meanSpending !== undefined && spendingMedian !== undefined)
      ? meanSpending < spendingMedian
      : false;

    // Moderate is explicitly defined as within 15% range of median: [0.85 * median, 1.15 * median]
    const isModIncome = (meanIncome !== undefined && incomeMedian !== undefined)
      ? meanIncome >= 0.85 * incomeMedian && meanIncome <= 1.15 * incomeMedian
      : false;
    const isModSpending = (meanSpending !== undefined && spendingMedian !== undefined)
      ? meanSpending >= 0.85 * spendingMedian && meanSpending <= 1.15 * spendingMedian
      : false;

    const isHighFreq = (meanFreq !== undefined && freqMedian !== undefined)
      ? meanFreq >= freqMedian
      : false;
    const isHighRecency = (meanRecency !== undefined && recencyMedian !== undefined)
      ? meanRecency >= recencyMedian
      : false;

    let segmentName = '';
    let matchedRule = '';
    const characteristics: string[] = [];

    if (meanIncome !== undefined) {
      characteristics.push(
        `${isModIncome ? 'Moderate' : isHighIncome ? 'High' : 'Low'} Income (${meanIncome ? '$' + Math.round(meanIncome).toLocaleString() : 'N/A'})`
      );
    }
    if (meanSpending !== undefined) {
      characteristics.push(
        `${isModSpending ? 'Moderate' : isHighSpending ? 'High' : 'Low'} Spending (${meanSpending ? meanSpending.toFixed(1) : 'N/A'})`
      );
    }
    if (meanFreq !== undefined) {
      characteristics.push(`${isHighFreq ? 'High' : 'Low'} Freq (${meanFreq.toFixed(1)} orders)`);
    }
    if (meanRecency !== undefined) {
      characteristics.push(`${isHighRecency ? 'High' : 'Low'} Recency (${meanRecency.toFixed(1)} days)`);
    }

    // Deterministic Rule evaluation:
    // Rule 5: Moderate income + moderate spending + high purchase frequency -> "Loyal Customers"
    if (isModIncome && isModSpending && isHighFreq) {
      segmentName = 'Loyal Customers';
      matchedRule = 'Rule 5: Moderate Income + Moderate Spending + High Frequency';
    }
    // Rule 1: High income + high spending -> "High-Value Customers"
    else if (isHighIncome && isHighSpending) {
      segmentName = 'High-Value Customers';
      matchedRule = 'Rule 1: High Income (>= median) + High Spending (>= median)';
    }
    // Rule 2: High income + low spending -> "Potential Customers"
    else if (isHighIncome && isLowSpending) {
      segmentName = 'Potential Customers';
      matchedRule = 'Rule 2: High Income (>= median) + Low Spending (< median)';
    }
    // Rule 3: Low income + high spending -> "Budget-Loyal Customers"
    else if (isLowIncome && isHighSpending) {
      segmentName = 'Budget-Loyal Customers';
      matchedRule = 'Rule 3: Low Income (< median) + High Spending (>= median)';
    }
    // Rule 4: Low income + low spending + high recency -> "At-Risk Customers"
    else if (isLowIncome && isLowSpending && isHighRecency) {
      segmentName = 'At-Risk Customers';
      matchedRule = 'Rule 4: Low Income + Low Spending + High Recency (>= median)';
    }
    // Rule 4 variant: Low income + low spending (if recency not present)
    else if (isLowIncome && isLowSpending) {
      segmentName = 'At-Risk Customers';
      matchedRule = 'Rule 4: Low Income (< median) + Low Spending (< median)';
    }
    // Fallback: If not satisfied, assign deterministic fallback name "Segment 1", "Segment 2", etc.
    else {
      segmentName = `Segment ${c + 1}`;
      matchedRule = 'Fallback: Condition boundaries not satisfied (no business assumption)';
    }

    audit[c] = {
      clusterId: c,
      segmentName,
      matchedRule,
      count,
      sharePct,
      meanIncome,
      meanSpending,
      meanFreq,
      meanRecency,
      characteristics
    };
  }

  return audit;
}
