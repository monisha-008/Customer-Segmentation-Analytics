import React from 'react';
import { Activity, HelpCircle, CheckCircle } from 'lucide-react';
import { ElbowPoint } from '../types';

interface ModelEvaluationSectionProps {
  elbowPoints: ElbowPoint[];
  currentK: number;
  currentInertia: number;
  currentSilhouette: number | null;
}

export const ModelEvaluationSection: React.FC<ModelEvaluationSectionProps> = ({
  elbowPoints,
  currentK,
  currentInertia,
  currentSilhouette
}) => {
  // SVG Dimensions
  const svgWidth = 500;
  const svgHeight = 220;
  const padding = { top: 25, right: 30, bottom: 35, left: 65 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  // Inertia chart bounds
  const maxInertia = elbowPoints.length > 0 ? Math.max(...elbowPoints.map(p => p.inertia)) * 1.08 : 100;
  const minInertia = elbowPoints.length > 0 ? Math.min(...elbowPoints.map(p => p.inertia)) * 0.92 : 0;

  const getInertiaCoords = (point: ElbowPoint, index: number, total: number) => {
    const x = padding.left + (index / (total - 1 || 1)) * plotWidth;
    const y = padding.top + plotHeight - ((point.inertia - minInertia) / (maxInertia - minInertia || 1)) * plotHeight;
    return { x, y };
  };

  // Silhouette chart bounds
  const maxSil = 0.8;
  const minSil = 0.0;
  const getSilCoords = (point: ElbowPoint, index: number, total: number) => {
    const x = padding.left + (index / (total - 1 || 1)) * plotWidth;
    const normSil = Math.max(0, Math.min(1, (point.silhouette - minSil) / (maxSil - minSil || 1)));
    const y = padding.top + plotHeight - normSil * plotHeight;
    return { x, y };
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 md:p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100 mb-5">
        <div>
          <h2 className="text-base font-bold text-slate-900">3. Model Evaluation &amp; Optimal K Diagnostics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluates cluster compactness (Inertia) and cluster separation (Silhouette Score) across candidate K values.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 font-medium">Selected Model:</span>
          <span className="px-2.5 py-1 rounded bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs">
            K = {currentK} Clusters
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-900 uppercase tracking-wider block">
              Inertia (Within-Cluster Sum of Squares)
            </span>
            <div className="text-2xl font-bold text-blue-700 mt-1">
              {currentInertia.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </div>
            <p className="text-xs text-blue-800/80 mt-1.5 leading-relaxed">
              Measures how tightly packed clusters are. The "Elbow point" is where diminishing returns occur as K increases.
            </p>
          </div>
          <Activity className="w-5 h-5 text-blue-500 shrink-0 mt-1" />
        </div>

        <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-900 uppercase tracking-wider block">
              Silhouette Score
            </span>
            <div className="text-2xl font-bold text-emerald-700 mt-1">
              {currentSilhouette !== null ? currentSilhouette.toFixed(3) : 'N/A'}
            </div>
            <p className="text-xs text-emerald-800/80 mt-1.5 leading-relaxed">
              Ranges from -1 to +1. High values (&gt;0.4) indicate dense, well-isolated clusters. Current score demonstrates solid separation.
            </p>
          </div>
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-1" />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inertia Elbow Chart */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Elbow Method (Inertia vs. K)
            </span>
            <span className="text-[11px] text-slate-500">Lower is more compact</span>
          </div>

          <div className="w-full overflow-x-auto flex justify-center">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full max-w-[500px] h-auto select-none">
              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((frac, idx) => {
                const y = padding.top + plotHeight * frac;
                const val = maxInertia - frac * (maxInertia - minInertia);
                return (
                  <g key={idx}>
                    <line x1={padding.left} y1={y} x2={svgWidth - padding.right} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                    <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
                      {val > 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0)}
                    </text>
                  </g>
                );
              })}

              {/* Inertia Line */}
              {elbowPoints.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={elbowPoints.map((pt, i) => {
                    const { x, y } = getInertiaCoords(pt, i, elbowPoints.length);
                    return `${x},${y}`;
                  }).join(' ')}
                />
              )}

              {/* Data Points */}
              {elbowPoints.map((pt, i) => {
                const { x, y } = getInertiaCoords(pt, i, elbowPoints.length);
                const isSelected = pt.k === currentK;
                return (
                  <g key={pt.k}>
                    {isSelected && (
                      <circle cx={x} cy={y} r="10" fill="#2563eb" fillOpacity="0.2" className="animate-pulse" />
                    )}
                    <circle
                      cx={x}
                      cy={y}
                      r={isSelected ? 6 : 4}
                      fill={isSelected ? '#1d4ed8' : '#3b82f6'}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <text x={x} y={svgHeight - 12} textAnchor="middle" fontSize="11" fontWeight={isSelected ? 'bold' : 'normal'} fill={isSelected ? '#1d4ed8' : '#64748b'}>
                      K={pt.k}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="text-[11px] text-slate-500 text-center mt-1">
            Red dot indicates current active K={currentK}. Select optimal K where curve bends (the "elbow").
          </div>
        </div>

        {/* Silhouette Score Chart */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Silhouette Quality vs. K
            </span>
            <span className="text-[11px] text-slate-500">Higher indicates better separation</span>
          </div>

          <div className="w-full overflow-x-auto flex justify-center">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full max-w-[500px] h-auto select-none">
              {/* Grid lines */}
              {[0, 0.2, 0.4, 0.6, 0.8].map((val, idx) => {
                const y = padding.top + plotHeight - (val / 0.8) * plotHeight;
                return (
                  <g key={idx}>
                    <line x1={padding.left} y1={y} x2={svgWidth - padding.right} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                    <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
                      {val.toFixed(2)}
                    </text>
                  </g>
                );
              })}

              {/* Silhouette Line */}
              {elbowPoints.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={elbowPoints.map((pt, i) => {
                    const { x, y } = getSilCoords(pt, i, elbowPoints.length);
                    return `${x},${y}`;
                  }).join(' ')}
                />
              )}

              {/* Points */}
              {elbowPoints.map((pt, i) => {
                const { x, y } = getSilCoords(pt, i, elbowPoints.length);
                const isSelected = pt.k === currentK;
                return (
                  <g key={pt.k}>
                    {isSelected && (
                      <circle cx={x} cy={y} r="10" fill="#059669" fillOpacity="0.2" className="animate-pulse" />
                    )}
                    <circle
                      cx={x}
                      cy={y}
                      r={isSelected ? 6 : 4}
                      fill={isSelected ? '#047857' : '#10b981'}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <text x={x} y={svgHeight - 12} textAnchor="middle" fontSize="11" fontWeight={isSelected ? 'bold' : 'normal'} fill={isSelected ? '#047857' : '#64748b'}>
                      K={pt.k}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="text-[11px] text-slate-500 text-center mt-1">
            Scores above 0.35 represent robust separation. Notice the peak corresponding to optimal cluster count.
          </div>
        </div>
      </div>
    </section>
  );
};
