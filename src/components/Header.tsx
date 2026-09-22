import React from 'react';
import { Layers, ShieldCheck, Cpu, Database } from 'lucide-react';

interface HeaderProps {
  totalRows: number;
  k: number;
  featureCount: number;
}

export const Header: React.FC<HeaderProps> = ({ totalRows, k, featureCount }) => {
  return (
    <header className="border-b border-slate-200 bg-white shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Customer Segmentation Analytics Dashboard
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Deterministic K-Means (random_state=42, n_init=10) • PCA Visualization • Rule-Based Naming
                </p>
              </div>
            </div>
          </div>

          {/* Reproducibility & Performance Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Reproducible (seed: 42)</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              <span>K = {k} Clusters</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
              <Database className="w-3.5 h-3.5 text-slate-500" />
              <span>{totalRows.toLocaleString()} Customers ({featureCount} Features)</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
