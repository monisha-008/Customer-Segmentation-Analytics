// Computes PCA projection and explained variance ratio from scaled data matrix

export interface PCAResult {
  transformed: number[][]; // N x nComponents
  explainedVarianceRatio: number[]; // e.g. [0.423, 0.217, 0.145]
}

// Multiply matrix transpose by matrix: (X^T * X) / (N - 1)
function computeCovarianceMatrix(X: number[][]): number[][] {
  const n = X.length;
  const d = X[0].length;
  const cov = Array.from({ length: d }, () => new Array(d).fill(0));

  for (let i = 0; i < d; i++) {
    for (let j = i; j < d; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += X[k][i] * X[k][j];
      }
      const val = sum / (n - 1 || 1);
      cov[i][j] = val;
      cov[j][i] = val;
    }
  }

  return cov;
}

// Power iteration with deflation to find top eigenvectors and eigenvalues
function powerIteration(A: number[][], numEigenvectors: number, maxIter: number = 100): {
  eigenvalues: number[];
  eigenvectors: number[][];
} {
  const d = A.length;
  const eigenvectors: number[][] = [];
  const eigenvalues: number[] = [];

  // Working copy of matrix
  const matrix = A.map(row => [...row]);

  for (let e = 0; e < numEigenvectors; e++) {
    // Initial random vector
    let v: number[] = new Array(d).fill(0).map((_, i) => (i === e ? 1 : 0.1));
    let norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    v = v.map(x => x / norm);

    let lambda = 0;

    for (let iter = 0; iter < maxIter; iter++) {
      // Multiply: w = matrix * v
      const w = new Array(d).fill(0);
      for (let i = 0; i < d; i++) {
        for (let j = 0; j < d; j++) {
          w[i] += matrix[i][j] * v[j];
        }
      }

      // Compute Rayleigh quotient (eigenvalue)
      lambda = v.reduce((s, vi, i) => s + vi * w[i], 0);

      // Normalize
      const wNorm = Math.sqrt(w.reduce((s, x) => s + x * x, 0));
      if (wNorm < 1e-9) break;

      const newV = w.map(x => x / wNorm);
      // Check convergence
      let diff = 0;
      for (let i = 0; i < d; i++) diff += Math.abs(newV[i] - v[i]);
      v = newV;
      if (diff < 1e-6) break;
    }

    eigenvalues.push(Math.max(0, lambda));
    eigenvectors.push(v);

    // Deflation: A' = A - lambda * (v * v^T)
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        matrix[i][j] -= lambda * v[i] * v[j];
      }
    }
  }

  return { eigenvalues, eigenvectors };
}

export function computePCA(X: number[][], nComponents: number = 3): PCAResult {
  const n = X.length;
  if (n === 0) return { transformed: [], explainedVarianceRatio: [] };
  const d = X[0].length;
  const k = Math.min(nComponents, d);

  const cov = computeCovarianceMatrix(X);
  const { eigenvalues, eigenvectors } = powerIteration(cov, k);

  // Total variance is the trace of the covariance matrix
  let totalVariance = 0;
  for (let i = 0; i < d; i++) {
    totalVariance += cov[i][i];
  }
  if (totalVariance <= 0) totalVariance = 1;

  const explainedVarianceRatio = eigenvalues.map(val => val / totalVariance);

  // Project points onto the top k eigenvectors: transformed = X * eigenvectors^T
  const transformed: number[][] = new Array(n);
  for (let i = 0; i < n; i++) {
    const proj = new Array(k);
    for (let c = 0; c < k; c++) {
      let sum = 0;
      const v = eigenvectors[c];
      for (let j = 0; j < d; j++) {
        sum += X[i][j] * v[j];
      }
      proj[c] = sum;
    }
    transformed[i] = proj;
  }

  return { transformed, explainedVarianceRatio };
}
