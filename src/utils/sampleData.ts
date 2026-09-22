import { CustomerRecord } from '../types';

// Pseudo-random generator with fixed seed for determinism
class SeededRNG {
  private seed: number;
  constructor(seed: number = 42) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  normal(mean: number = 0, std: number = 1): number {
    const u1 = Math.max(1e-15, this.next());
    const u2 = this.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * std + mean;
  }

  integer(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

export function generateCustomerDataset(count: number = 10000, seed: number = 42): CustomerRecord[] {
  const rng = new SeededRNG(seed);
  const records: CustomerRecord[] = [];
  const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum'];

  const nQuarter = Math.floor(count / 4);

  for (let i = 0; i < count; i++) {
    const custId = `CUST-${100000 + i + 1}`;
    let income: number;
    let spending: number;
    let age: number;
    let freq: number;
    let recency: number;

    // 4 customer distribution groups
    if (i < nQuarter) {
      // Group 1: Affluent High Spenders
      income = Math.min(150000, Math.max(55000, Math.round(rng.normal(92000, 14000) / 500) * 500));
      spending = Math.min(99, Math.max(58, Math.round(rng.normal(83, 9))));
      age = rng.integer(25, 48);
      freq = rng.integer(18, 45);
      recency = rng.integer(2, 28);
    } else if (i < nQuarter * 2) {
      // Group 2: High Income, Low Spending (Savers / Potential)
      income = Math.min(145000, Math.max(56000, Math.round(rng.normal(89000, 13000) / 500) * 500));
      spending = Math.min(45, Math.max(5, Math.round(rng.normal(24, 8))));
      age = rng.integer(34, 62);
      freq = rng.integer(4, 15);
      recency = rng.integer(15, 70);
    } else if (i < nQuarter * 3) {
      // Group 3: Low Income, High Spending (Budget-Loyal)
      income = Math.min(48000, Math.max(16000, Math.round(rng.normal(31000, 7500) / 500) * 500));
      spending = Math.min(98, Math.max(55, Math.round(rng.normal(77, 10))));
      age = rng.integer(18, 36);
      freq = rng.integer(12, 32);
      recency = rng.integer(3, 30);
    } else {
      // Group 4: Low Income, Low Spending (At-Risk)
      income = Math.min(49000, Math.max(15000, Math.round(rng.normal(33000, 8000) / 500) * 500));
      spending = Math.min(46, Math.max(4, Math.round(rng.normal(22, 9))));
      age = rng.integer(30, 70);
      freq = rng.integer(1, 8);
      recency = rng.integer(40, 120);
    }

    const tier = rng.choice(tiers);

    const record: CustomerRecord = {
      CustomerID: custId,
      Age: age,
      'Annual Income ($)': income,
      'Spending Score (1-100)': spending,
      'Purchase Frequency': freq,
      'Recency (Days)': recency,
      'Member Tier': tier
    };

    records.push(record);
  }

  // Inject a small controlled set of missing values to test missing-value handling
  // Random missing values in ~1.5% of rows (median imputation)
  for (let i = 0; i < count; i += 70) {
    if (records[i]) {
      records[i]['Annual Income ($)'] = null;
    }
  }
  for (let i = 25; i < count; i += 90) {
    if (records[i]) {
      records[i]['Spending Score (1-100)'] = null;
    }
  }

  // Exactly 14 rows where > 50% fields are missing (testing drop & warning)
  const dropRowIndices = [12, 45, 128, 350, 789, 1204, 2500, 3890, 5100, 6420, 7800, 8910, 9340, 9820];
  for (const idx of dropRowIndices) {
    if (idx < count && records[idx]) {
      records[idx]['Age'] = null;
      records[idx]['Annual Income ($)'] = null;
      records[idx]['Spending Score (1-100)'] = null;
      records[idx]['Purchase Frequency'] = null;
    }
  }

  return records;
}
