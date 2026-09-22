import { ElbowPoint } from '../types';

class SeededRandom {
  private seed: number;
  constructor(seed: number = 42) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
}

function euclideanDistanceSq(p1: number[], p2: number[]): number {
  let sum = 0;
  for (let i = 0; i < p1.length; i++) {
    const diff = p1[i] - p2[i];
    sum += diff * diff;
  }
  return sum;
}

// Single run of K-Means with deterministic initialization
function runKMeansSingle(
  data: number[][],
  k: number,
  rng: SeededRandom,
  maxIter: number = 100
): { labels: number[]; centroids: number[][]; inertia: number } {
  const n = data.length;
  const d = data[0].length;

  // K-Means++ deterministic initialization
  const centroids: number[][] = [];
  const firstIdx = Math.floor(rng.next() * n);
  centroids.push([...data[firstIdx]]);

  for (let c = 1; c < k; c++) {
    const dists: number[] = new Array(n);
    let totalDist = 0;
    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      for (const cent of centroids) {
        const dsq = euclideanDistanceSq(data[i], cent);
        if (dsq < minDist) minDist = dsq;
      }
      dists[i] = minDist;
      totalDist += minDist;
    }

    // Weighted random selection
    const target = rng.next() * totalDist;
    let accum = 0;
    let selectedIdx = n - 1;
    for (let i = 0; i < n; i++) {
      accum += dists[i];
      if (accum >= target) {
        selectedIdx = i;
        break;
      }
    }
    centroids.push([...data[selectedIdx]]);
  }

  let labels = new Array(n).fill(0);
  let changed = true;
  let iter = 0;

  while (changed && iter < maxIter) {
    changed = false;
    iter++;

    // Assignment step
    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      let closestCentroid = 0;
      for (let c = 0; c < k; c++) {
        const dsq = euclideanDistanceSq(data[i], centroids[c]);
        if (dsq < minDist) {
          minDist = dsq;
          closestCentroid = c;
        }
      }
      if (labels[i] !== closestCentroid) {
        labels[i] = closestCentroid;
        changed = true;
      }
    }

    // Update centroids
    const counts = new Array(k).fill(0);
    const newCentroids = Array.from({ length: k }, () => new Array(d).fill(0));

    for (let i = 0; i < n; i++) {
      const c = labels[i];
      counts[c]++;
      for (let j = 0; j < d; j++) {
        newCentroids[c][j] += data[i][j];
      }
    }

    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        for (let j = 0; j < d; j++) {
          centroids[c][j] = newCentroids[c][j] / counts[c];
        }
      }
    }
  }

  // Calculate inertia (Sum of squared distances from samples to closest centroid)
  let inertia = 0;
  for (let i = 0; i < n; i++) {
    inertia += euclideanDistanceSq(data[i], centroids[labels[i]]);
  }

  return { labels, centroids, inertia };
}

export function fitDeterministicKMeans(
  data: number[][],
  k: number,
  randomState: number = 42,
  nInit: number = 10
): { labels: number[]; centroids: number[][]; inertia: number } {
  if (!data || data.length === 0 || k <= 0) {
    return { labels: [], centroids: [], inertia: 0 };
  }

  let bestResult: { labels: number[]; centroids: number[][]; inertia: number } | null = null;
  const rng = new SeededRandom(randomState);

  for (let init = 0; init < nInit; init++) {
    const result = runKMeansSingle(data, k, rng);
    if (!bestResult || result.inertia < bestResult.inertia) {
      bestResult = result;
    }
  }

  return bestResult!;
}

// Compute silhouette score (approximate sampling if N > 2000 for responsiveness)
export function computeSilhouetteScore(
  data: number[][],
  labels: number[],
  k: number
): number | null {
  const n = data.length;
  if (n < 2 || k < 2 || k >= n) return null;

  const maxSamples = Math.min(n, 2000);
  const sampleIndices: number[] = [];
  
  if (n <= maxSamples) {
    for (let i = 0; i < n; i++) sampleIndices.push(i);
  } else {
    const step = Math.floor(n / maxSamples);
    for (let i = 0; i < n && sampleIndices.length < maxSamples; i += step) {
      sampleIndices.push(i);
    }
  }

  const sampleCount = sampleIndices.length;
  let totalSilhouette = 0;

  for (let idx = 0; idx < sampleCount; idx++) {
    const i = sampleIndices[idx];
    const myCluster = labels[i];

    // Compute a(i)
    let aDistSum = 0;
    let aCount = 0;

    // Cluster distance sums for b(i)
    const bDistSums = new Array(k).fill(0);
    const bCounts = new Array(k).fill(0);

    for (let jdx = 0; jdx < sampleCount; jdx++) {
      const j = sampleIndices[jdx];
      if (i === j) continue;
      const d = Math.sqrt(euclideanDistanceSq(data[i], data[j]));
      const otherCluster = labels[j];

      if (otherCluster === myCluster) {
        aDistSum += d;
        aCount++;
      } else {
        bDistSums[otherCluster] += d;
        bCounts[otherCluster]++;
      }
    }

    const a = aCount > 0 ? aDistSum / aCount : 0;
    let b = Infinity;

    for (let c = 0; c < k; c++) {
      if (c === myCluster) continue;
      if (bCounts[c] > 0) {
        const meanDist = bDistSums[c] / bCounts[c];
        if (meanDist < b) b = meanDist;
      }
    }

    if (b === Infinity) b = 0;

    const maxDenom = Math.max(a, b);
    const s = maxDenom === 0 ? 0 : (b - a) / maxDenom;
    totalSilhouette += s;
  }

  return totalSilhouette / sampleCount;
}

export function computeElbowCurve(
  data: number[][],
  minK: number = 2,
  maxK: number = 8,
  randomState: number = 42
): ElbowPoint[] {
  const points: ElbowPoint[] = [];

  for (let k = minK; k <= maxK; k++) {
    const { labels, inertia } = fitDeterministicKMeans(data, k, randomState, 5);
    const silhouette = computeSilhouetteScore(data, labels, k) || 0;
    points.push({ k, inertia, silhouette });
  }

  return points;
}
