import React, { useRef, useState } from 'react';
import { Upload, AlertTriangle, CheckCircle2, FileSpreadsheet, Sparkles, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { CustomerRecord, CleanedDataResult } from '../types';

interface DataInputSectionProps {
  cleaningResult: CleanedDataResult;
  currentSource: string;
  onSelectPreset: (preset: '10k' | '200') => void;
  onCustomUpload: (data: CustomerRecord[], filename: string) => void;
  isProcessing: boolean;
}

export const DataInputSection: React.FC<DataInputSectionProps> = ({
  cleaningResult,
  currentSource,
  onSelectPreset,
  onCustomUpload,
  isProcessing
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  const handleFiles = (file: File) => {
    setUploadError(null);
    const filename = file.name.toLowerCase();

    if (!filename.endsWith('.csv') && !filename.endsWith('.xlsx') && !filename.endsWith('.xls')) {
      setUploadError('Unsupported file format. Please upload a CSV (.csv) or Excel (.xlsx, .xls) file.');
      return;
    }

    if (filename.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (!results.data || results.data.length === 0) {
            setUploadError('The uploaded CSV file is empty. Please provide a file with customer records.');
            return;
          }
          const validRows = (results.data as any[]).filter(r => r && Object.keys(r).length > 0);
          onCustomUpload(validRows, file.name);
        },
        error: (err) => {
          setUploadError(`Failed to parse CSV: ${err.message}`);
        }
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheet];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (!jsonData || jsonData.length === 0) {
            setUploadError('The uploaded Excel sheet contains no readable rows.');
            return;
          }
          onCustomUpload(jsonData as CustomerRecord[], file.name);
        } catch (err: any) {
          setUploadError(`Error reading Excel file: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = () => {
    setDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files[0]);
    }
  };

  const {
    rawRowCount,
    cleanedRowCount,
    droppedRowCount,
    imputationLog
  } = cleaningResult;

  const retentionPct = rawRowCount > 0 ? ((cleanedRowCount / rawRowCount) * 100).toFixed(1) : '100.0';

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 md:p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">1. Data Ingestion & Missing-Value Strategy</h2>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-700">
              Active: {currentSource}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Handles up to 10,000 rows smoothly. Automatically filters corrupted records (&gt;50% missing) and safely imputes remaining fields.
          </p>
        </div>

        {/* Dataset switcher buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectPreset('10k')}
            disabled={isProcessing}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
              currentSource.includes('10,000')
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            10,000 Customers (Scale Benchmark)
          </button>
          <button
            type="button"
            onClick={() => onSelectPreset('200')}
            disabled={isProcessing}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
              currentSource.includes('200')
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Mall Customers (200 rows)
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-white hover:bg-slate-900 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload CSV / Excel
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, .xlsx, .xls"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFiles(e.target.files[0]);
              }
            }}
          />
        </div>
      </div>

      {/* Drag & Drop banner if drag active or error */}
      {uploadError && (
        <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`mt-4 p-4 rounded-xl border-2 border-dashed transition-all ${
          dragActive
            ? 'border-blue-500 bg-blue-50/50'
            : 'border-slate-200 bg-slate-50/50'
        }`}
      >
        {/* Cleaning & Audit Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Raw Uploaded Rows
            </span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">
              {rawRowCount.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400">Original dataset preserved</span>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Cleaned Rows
            </span>
            <span className="text-xl font-bold text-emerald-600 mt-1 block">
              {cleanedRowCount.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-600 font-medium">{retentionPct}% retained</span>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Rows Removed (&gt;50% Null)
            </span>
            <span className={`text-xl font-bold mt-1 block ${droppedRowCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {droppedRowCount.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400">
              {droppedRowCount > 0 ? 'Explicitly pruned' : 'No severe nulls'}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Imputed Columns
            </span>
            <span className="text-xl font-bold text-blue-600 mt-1 block">
              {Object.keys(imputationLog).length}
            </span>
            <span className="text-[10px] text-blue-600">Median (num) &amp; Mode (cat)</span>
          </div>
        </div>

        {/* Explicit Row-Removal Warning or All-Retained Banner */}
        <div className="mt-3.5">
          {droppedRowCount > 0 ? (
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200/90 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-950">
                  ⚠️ Explicit Missing-Value Row Removal Notice
                </p>
                <p className="mt-0.5 text-amber-800 leading-relaxed">
                  <strong>{droppedRowCount} rows were removed</strong> because more than 50% of their fields were missing.
                  The application does not silently delete records. The original uploaded dataset remains intact and non-destructive.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-emerald-50/80 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Zero rows dropped:</strong> All {rawRowCount.toLocaleString()} rows satisfied the missing-value completeness criterion (&le; 50% null fields).
              </span>
            </div>
          )}
        </div>

        {/* Imputation log drawer */}
        {Object.keys(imputationLog).length > 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowAuditLogs(!showAuditLogs)}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
            >
              {showAuditLogs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showAuditLogs ? 'Hide' : 'Show'} Safe Imputation Audit Log ({Object.keys(imputationLog).length} attributes modified with column median/mode)
            </button>
            {showAuditLogs && (
              <div className="mt-2 p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1.5">
                {Object.entries(imputationLog).map(([col, method]) => (
                  <div key={col} className="flex items-center justify-between text-slate-700">
                    <span className="font-medium text-slate-900">{col}</span>
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[11px]">
                      Imputed using: {method}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
