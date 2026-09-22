import React from 'react';
import { Sliders, Shield, Info, Check } from 'lucide-react';

interface ModelConfigSectionProps {
  availableFeatures: string[];
  selectedFeatures: string[];
  onToggleFeature: (feature: string) => void;
  k: number;
  onKChange: (k: number) => void;
  isProcessing: boolean;
}

export const ModelConfigSection: React.FC<ModelConfigSectionProps> = ({
  availableFeatures,
  selectedFeatures,
  onToggleFeature,
  k,
  onKChange,
  isProcessing
}) => {
  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 md:p-6 mb-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
        <div>
          <h2 className="text-base font-bold text-slate-900">2. Reproducible K-Means Setup & Feature Selection</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Features selected here are standardized with StandardScaler and passed directly to K-Means.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md font-medium">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>random_state=42 • n_init=10 (Deterministic)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Feature Selector (Left 7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
            Select Clustering Features ({selectedFeatures.length} active)
          </label>
          <div className="flex flex-wrap gap-2">
            {availableFeatures.map((feat) => {
              const isSelected = selectedFeatures.includes(feat);
              return (
                <button
                  key={feat}
                  type="button"
                  onClick={() => onToggleFeature(feat)}
                  disabled={isProcessing}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center ${isSelected ? 'bg-white/20 text-white' : 'border border-slate-300'}`}>
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                  <span>{feat}</span>
                </button>
              );
            })}
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Visualization Routing Rule:</strong>
              {selectedFeatures.length === 1 && (
                <span> 1 feature selected &rarr; <strong>1D strip distribution visualization</strong>.</span>
              )}
              {selectedFeatures.length === 2 && (
                <span> 2 features selected &rarr; <strong>Direct 2D feature scatter plot</strong>.</span>
              )}
              {selectedFeatures.length === 3 && (
                <span> 3 features selected &rarr; <strong>Direct 3D interactive feature scatter plot</strong>.</span>
              )}
              {selectedFeatures.length > 3 && (
                <span>
                  {' '}{selectedFeatures.length} features selected &rarr; <strong>PCA-Reduced View</strong> (PCA is applied exclusively for 2D/3D visualization; K-Means was fitted on all {selectedFeatures.length} standardized features).
                </span>
              )}
            </div>
          </div>
        </div>

        {/* K Cluster Slider (Right 5 Cols) */}
        <div className="lg:col-span-5 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Number of Clusters (K)
              </span>
              <span className="px-2.5 py-0.5 text-sm font-bold rounded-md bg-blue-600 text-white">
                K = {k}
              </span>
            </div>

            <div className="mt-4">
              <input
                type="range"
                min={2}
                max={8}
                step={1}
                value={k}
                onChange={(e) => onKChange(Number(e.target.value))}
                disabled={isProcessing}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-medium text-slate-500 mt-1">
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
                <span>6</span>
                <span>7</span>
                <span>8</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] text-slate-500 leading-snug">
            <strong>Arbitrary Label Notice:</strong> Cluster labels (0, 1, 2, ...) are arbitrary mathematical indices generated by the centroid distance optimization. They carry no intrinsic business meaning until mapped by deterministic statistical rules.
          </div>
        </div>
      </div>
    </section>
  );
};
