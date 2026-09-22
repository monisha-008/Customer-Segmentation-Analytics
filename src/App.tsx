import React, { useState, useMemo, useEffect } from 'react';
import { CustomerRecord } from './types';
import { generateCustomerDataset } from './utils/sampleData';
import { cleanAndImputeDataset, computeDatasetThresholds, standardizeFeatures } from './utils/dataProcessing';
import { fitDeterministicKMeans, computeSilhouetteScore, computeElbowCurve } from './utils/kmeans';
import { computePCA } from './utils/pca';
import { deriveClusterProfilesAndNames } from './utils/clusterNaming';

import { Header } from './components/Header';
import { DataInputSection } from './components/DataInputSection';
import { ModelConfigSection } from './components/ModelConfigSection';
import { ModelEvaluationSection } from './components/ModelEvaluationSection';
import { ClusterVisualizationSection } from './components/ClusterVisualizationSection';
import { ClusterStabilitySection } from './components/ClusterStabilitySection';
import { CustomerExplorerSection } from './components/CustomerExplorerSection';
import { PythonCodeSection } from './components/PythonCodeSection';

export default function App() {
  // Initialize with the 10,000 customers scale benchmark
  const [rawData, setRawData] = useState<CustomerRecord[]>(() => generateCustomerDataset(10000, 42));
  const [currentSource, setCurrentSource] = useState<string>('Pre-loaded 10,000 Customers Dataset');
  const [k, setK] = useState<number>(4);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Step 1: Clean and impute dataset using safe non-destructive strategy
  const cleaningResult = useMemo(() => {
    return cleanAndImputeDataset(rawData);
  }, [rawData]);

  const cleanedData = cleaningResult.cleanedData;

  // Numeric features available for clustering (ignoring ID columns)
  const availableFeatures = useMemo(() => {
    return cleaningResult.numericColumns.filter(col => !col.toLowerCase().startsWith('id'));
  }, [cleaningResult.numericColumns]);

  // Selected features for K-Means (default to 4 core features)
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    'Annual Income ($)',
    'Spending Score (1-100)',
    'Age',
    'Purchase Frequency'
  ]);

  // Ensure selected features are present in current dataset
  useEffect(() => {
    if (availableFeatures.length > 0) {
      const validSelected = selectedFeatures.filter(f => availableFeatures.includes(f));
      if (validSelected.length === 0) {
        setSelectedFeatures(availableFeatures.slice(0, Math.min(4, availableFeatures.length)));
      }
    }
  }, [availableFeatures]);

  const activeFeatures = useMemo(() => {
    const valid = selectedFeatures.filter(f => availableFeatures.includes(f));
    return valid.length > 0 ? valid : availableFeatures.slice(0, Math.min(4, availableFeatures.length));
  }, [selectedFeatures, availableFeatures]);

  // Toggle feature selection with validation
  const handleToggleFeature = (feat: string) => {
    if (selectedFeatures.includes(feat)) {
      if (selectedFeatures.length <= 1) return; // Must keep at least 1
      setSelectedFeatures(selectedFeatures.filter(f => f !== feat));
    } else {
      setSelectedFeatures([...selectedFeatures, feat]);
    }
  };

  // Step 2: Calculate dataset-wide medians for traceable naming
  const thresholds = useMemo(() => {
    return computeDatasetThresholds(cleanedData);
  }, [cleanedData]);

  // Step 3: Standardize features using StandardScaler
  const standardized = useMemo(() => {
    if (cleanedData.length === 0 || activeFeatures.length === 0) {
      return { scaled: [], means: [], stds: [] };
    }
    return standardizeFeatures(cleanedData, activeFeatures);
  }, [cleanedData, activeFeatures]);

  // Step 4: Fit deterministic K-Means (random_state=42, n_init=10)
  const kmeansResult = useMemo(() => {
    if (standardized.scaled.length === 0) {
      return { labels: [], centroids: [], inertia: 0 };
    }
    return fitDeterministicKMeans(standardized.scaled, k, 42, 10);
  }, [standardized.scaled, k]);

  // Step 5: Compute Silhouette Score for current model
  const silhouetteScore = useMemo(() => {
    if (standardized.scaled.length === 0 || kmeansResult.labels.length === 0) return null;
    return computeSilhouetteScore(standardized.scaled, kmeansResult.labels, k);
  }, [standardized.scaled, kmeansResult.labels, k]);

  // Step 6: Compute Elbow Curve across K=2..8
  const elbowPoints = useMemo(() => {
    if (standardized.scaled.length === 0) return [];
    return computeElbowCurve(standardized.scaled, 2, 8, 42);
  }, [standardized.scaled]);

  // Step 7: PCA for visualization only (when >3 features selected)
  const pcaResult = useMemo(() => {
    if (activeFeatures.length > 3 && standardized.scaled.length > 0) {
      return computePCA(standardized.scaled, 3);
    }
    return undefined;
  }, [activeFeatures.length, standardized.scaled]);

  // Step 8: Traceable rule-based cluster profiling and stability naming
  const clusterAudit = useMemo(() => {
    if (cleanedData.length === 0 || kmeansResult.labels.length === 0) return {};
    return deriveClusterProfilesAndNames(cleanedData, kmeansResult.labels, k, thresholds);
  }, [cleanedData, kmeansResult.labels, k, thresholds]);

  // Dataset preset switchers
  const handleSelectPreset = (preset: '10k' | '200') => {
    setIsProcessing(true);
    setTimeout(() => {
      if (preset === '10k') {
        setRawData(generateCustomerDataset(10000, 42));
        setCurrentSource('Pre-loaded 10,000 Customers Dataset');
      } else {
        setRawData(generateCustomerDataset(200, 42));
        setCurrentSource('Standard Mall Customers (200 rows)');
      }
      setIsProcessing(false);
    }, 50);
  };

  const handleCustomUpload = (data: CustomerRecord[], filename: string) => {
    setIsProcessing(true);
    setTimeout(() => {
      setRawData(data);
      setCurrentSource(`Uploaded: ${filename}`);
      setIsProcessing(false);
    }, 50);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans">
      {/* Top Application Header */}
      <Header
        totalRows={cleanedData.length}
        k={k}
        featureCount={activeFeatures.length}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Section 1: Data Ingestion & Missing Value Strategy */}
        <DataInputSection
          cleaningResult={cleaningResult}
          currentSource={currentSource}
          onSelectPreset={handleSelectPreset}
          onCustomUpload={handleCustomUpload}
          isProcessing={isProcessing}
        />

        {/* Section 2: Model Configuration & Feature Selector */}
        <ModelConfigSection
          availableFeatures={availableFeatures}
          selectedFeatures={activeFeatures}
          onToggleFeature={handleToggleFeature}
          k={k}
          onKChange={setK}
          isProcessing={isProcessing}
        />

        {/* Section 3: Model Evaluation (Elbow & Silhouette) */}
        <ModelEvaluationSection
          elbowPoints={elbowPoints}
          currentK={k}
          currentInertia={kmeansResult.inertia}
          currentSilhouette={silhouetteScore}
        />

        {/* Section 4: Cluster Visualizations (1D / 2D / 3D / PCA-Reduced View) */}
        <ClusterVisualizationSection
          data={cleanedData}
          clusterLabels={kmeansResult.labels}
          selectedFeatures={activeFeatures}
          pcaData={pcaResult?.transformed}
          pcaVariance={pcaResult?.explainedVarianceRatio}
          clusterAudit={clusterAudit}
        />

        {/* Section 5: Traceable Cluster Profiles & Stability Table */}
        <ClusterStabilitySection
          thresholds={thresholds}
          clusterAudit={clusterAudit}
        />

        {/* Section 6: Customer Explorer, Search & Export */}
        <CustomerExplorerSection
          data={cleanedData}
          clusterLabels={kmeansResult.labels}
          clusterAudit={clusterAudit}
        />

        {/* Section 7: Python Streamlit CLI Execution & File Inspection */}
        <PythonCodeSection />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>Customer Segmentation Analytics Dashboard &bull; Scikit-Learn Parity &bull; Seed 42</span>
          <span>Supports CSV/XLSX Uploads up to 10,000 Rows &bull; Streamlit Compatible</span>
        </div>
      </footer>
    </div>
  );
}
