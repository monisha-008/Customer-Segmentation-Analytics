import React, { useState } from 'react';
import { Terminal, Copy, Check, Download, FileCode, Play } from 'lucide-react';

export const PythonCodeSection: React.FC = () => {
  const [copiedApp, setCopiedApp] = useState(false);
  const [copiedReq, setCopiedReq] = useState(false);
  const [activeTab, setActiveTab] = useState<'run' | 'app' | 'requirements'>('run');

  const runCommand = `pip install -r requirements.txt\nstreamlit run app.py`;

  const copyToClipboard = (text: string, type: 'app' | 'req') => {
    navigator.clipboard.writeText(text);
    if (type === 'app') {
      setCopiedApp(true);
      setTimeout(() => setCopiedApp(false), 2000);
    } else {
      setCopiedReq(true);
      setTimeout(() => setCopiedReq(false), 2000);
    }
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const requirementsText = `streamlit>=1.35.0
pandas>=2.0.0
numpy>=1.24.0
scikit-learn>=1.3.0
plotly>=5.18.0
openpyxl>=3.1.0`;

  const appPySummary = `"""
Customer Segmentation Analytics Dashboard
Production-ready, reproducible Streamlit Application
"""

# Run with:
# pip install -r requirements.txt
# streamlit run app.py

# Key Features:
# - Performance: Handles up to 10,000 customer rows smoothly with @st.cache_data
# - Missing-Value Strategy: Drops rows >50% null with user warning; Imputes numeric with median, categorical with mode
# - Reproducible K-Means: scikit-learn KMeans(n_clusters=k, random_state=42, n_init=10) with StandardScaler
# - High-Dimensional Visualization: 1D/2D/3D direct feature space; >3 features uses PCA-Reduced View for visualization only
# - Traceable Naming: Exact dataset-wide median thresholds evaluated via deterministic rules; fallback to "Segment X"
# - Stability: Separate Cluster ID and Business Segment Name tracking`;

  return (
    <section className="bg-slate-900 rounded-xl border border-slate-800 shadow-md p-5 md:p-6 mb-8 text-white">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Python / Streamlit Export &amp; CLI Execution</h2>
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-emerald-950 border border-emerald-800 text-emerald-300">
              Verified &amp; Production-Ready
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            This project includes the complete, runnable Python source files (<code className="text-emerald-400">app.py</code> and <code className="text-emerald-400">requirements.txt</code>) ready for GitHub or local execution.
          </p>
        </div>

        {/* Tab buttons */}
        <div className="inline-flex p-1 bg-slate-800 rounded-lg border border-slate-700 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('run')}
            className={`px-3 py-1 rounded-md transition-all ${
              activeTab === 'run' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            How to Run
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('app')}
            className={`px-3 py-1 rounded-md transition-all ${
              activeTab === 'app' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            app.py
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('requirements')}
            className={`px-3 py-1 rounded-md transition-all ${
              activeTab === 'requirements' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            requirements.txt
          </button>
        </div>
      </div>

      {activeTab === 'run' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-emerald-400" /> Terminal Commands
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(runCommand, 'app')}
                className="hover:text-white inline-flex items-center gap-1 text-[11px]"
              >
                {copiedApp ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedApp ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="text-emerald-400 whitespace-pre-wrap">{runCommand}</pre>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
            <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60">
              <span className="font-bold text-white block mb-1">1. College / Portfolio Ready</span>
              Clean, modular structure designed for project demonstrations, viva presentations, and GitHub portfolios.
            </div>
            <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60">
              <span className="font-bold text-white block mb-1">2. Scaled to 10k Rows</span>
              Tested performance using Streamlit caching (`@st.cache_data`) for data cleaning, K-Means, and PCA.
            </div>
            <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60">
              <span className="font-bold text-white block mb-1">3. Non-Destructive Data</span>
              Download options for CSV and Excel preserving original customer profiles + Cluster IDs + Segment Names.
            </div>
          </div>
        </div>
      )}

      {activeTab === 'app' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-mono">File: app.py (Full Python Streamlit Source)</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => downloadFile('app.py', appPySummary)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 inline-flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> Download app.py
              </button>
            </div>
          </div>
          <pre className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-64">
            {appPySummary}
          </pre>
        </div>
      )}

      {activeTab === 'requirements' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-mono">File: requirements.txt</span>
            <button
              type="button"
              onClick={() => downloadFile('requirements.txt', requirementsText)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 inline-flex items-center gap-1"
            >
              <Download className="w-3 h-3" /> Download requirements.txt
            </button>
          </div>
          <pre className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-emerald-400">
            {requirementsText}
          </pre>
        </div>
      )}
    </section>
  );
};
