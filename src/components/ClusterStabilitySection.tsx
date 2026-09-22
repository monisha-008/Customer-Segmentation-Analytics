import React from 'react';
import { ShieldCheck, ArrowRight, FileText, CheckCircle2 } from 'lucide-react';
import { Thresholds, ClusterAudit } from '../types';

interface ClusterStabilitySectionProps {
  thresholds: Thresholds;
  clusterAudit: Record<number, ClusterAudit>;
}

export const ClusterStabilitySection: React.FC<ClusterStabilitySectionProps> = ({
  thresholds,
  clusterAudit
}) => {
  const {
    incomeMedian,
    spendingMedian,
    freqMedian,
    recencyMedian,
    incomeCol,
    spendingCol,
    freqCol,
    recencyCol
  } = thresholds;

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 md:p-6 mb-6">
      {/* Title */}
      <div className="pb-4 border-b border-slate-100 mb-5">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-900">5. Traceable Segment Profiles &amp; Cluster Label Stability</h2>
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-50 text-emerald-700">
            Deterministic Rule-Based Engine
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Cluster numbers (0, 1, 2, ...) are arbitrary mathematical tags. Segments are mapped dynamically by evaluating cluster averages against dataset-wide median thresholds. No AI / LLM judgment is used.
        </p>
      </div>

      {/* Dataset-Wide Median Thresholds Display */}
      <div className="mb-5 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-blue-600" />
          <span>Dataset-Wide Median Thresholds (Audit Baseline)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[11px] text-slate-500 block font-medium">
              Median Annual Income
            </span>
            <span className="text-base font-bold text-slate-900 mt-0.5 block">
              {incomeMedian !== undefined ? `$${Math.round(incomeMedian).toLocaleString()}` : 'N/A'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              col: {incomeCol || 'missing'}
            </span>
          </div>

          <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[11px] text-slate-500 block font-medium">
              Median Spending Score
            </span>
            <span className="text-base font-bold text-slate-900 mt-0.5 block">
              {spendingMedian !== undefined ? spendingMedian.toFixed(1) : 'N/A'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              col: {spendingCol || 'missing'}
            </span>
          </div>

          <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[11px] text-slate-500 block font-medium">
              Median Purchase Frequency
            </span>
            <span className="text-base font-bold text-slate-900 mt-0.5 block">
              {freqMedian !== undefined ? `${freqMedian.toFixed(1)} orders/yr` : 'N/A'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              col: {freqCol || 'missing'}
            </span>
          </div>

          <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[11px] text-slate-500 block font-medium">
              Median Recency
            </span>
            <span className="text-base font-bold text-slate-900 mt-0.5 block">
              {recencyMedian !== undefined ? `${recencyMedian.toFixed(1)} days` : 'N/A'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              col: {recencyCol || 'missing'}
            </span>
          </div>
        </div>

        <div className="mt-2 text-[11px] text-slate-500 leading-relaxed">
          <strong>Threshold Definitions:</strong> High Income: &ge; median &bull; Low Income: &lt; median &bull; High Spending: &ge; median &bull; Low Spending: &lt; median &bull; Moderate: within &plusmn;15% of median.
        </div>
      </div>

      {/* Cluster ID vs Business Segment Name Stability Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Cluster ID</th>
              <th className="py-3 px-4">Business Segment Name</th>
              <th className="py-3 px-4">Customer Count</th>
              <th className="py-3 px-4">Share (%)</th>
              <th className="py-3 px-4">Avg Income</th>
              <th className="py-3 px-4">Avg Spending</th>
              <th className="py-3 px-4">Traceable Rule Logic</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {Object.values(clusterAudit).map((audit) => (
              <tr key={audit.clusterId} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-4 font-mono font-bold text-slate-900">
                  <span className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center">
                    {audit.clusterId}
                  </span>
                </td>
                <td className="py-3 px-4 font-bold text-slate-900">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{audit.segmentName}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-700 font-medium">
                  {audit.count.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-slate-700 font-medium">
                  {audit.sharePct.toFixed(1)}%
                </td>
                <td className="py-3 px-4 text-slate-900 font-semibold font-mono">
                  {audit.meanIncome ? `$${Math.round(audit.meanIncome).toLocaleString()}` : 'N/A'}
                </td>
                <td className="py-3 px-4 text-slate-900 font-semibold font-mono">
                  {audit.meanSpending ? audit.meanSpending.toFixed(1) : 'N/A'}
                </td>
                <td className="py-3 px-4 text-slate-600 max-w-xs">
                  <span className="inline-block px-2 py-1 rounded bg-slate-100 text-slate-800 text-[11px] font-medium leading-tight">
                    {audit.matchedRule}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
