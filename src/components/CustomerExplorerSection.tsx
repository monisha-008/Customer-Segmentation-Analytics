import React, { useState, useMemo } from 'react';
import { Download, Search, Filter, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { CustomerRecord, ClusterAudit } from '../types';

interface CustomerExplorerSectionProps {
  data: CustomerRecord[];
  clusterLabels: number[];
  clusterAudit: Record<number, ClusterAudit>;
}

export const CustomerExplorerSection: React.FC<CustomerExplorerSectionProps> = ({
  data,
  clusterLabels,
  clusterAudit
}) => {
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;

  // Augment dataset with Cluster ID and Business Segment Name
  const enrichedData = useMemo(() => {
    return data.map((record, i) => {
      const cId = clusterLabels[i] !== undefined ? clusterLabels[i] : 0;
      const segName = clusterAudit[cId]?.segmentName || `Segment ${cId + 1}`;
      return {
        ...record,
        'Cluster ID': cId,
        'Segment Name': segName
      };
    });
  }, [data, clusterLabels, clusterAudit]);

  const allSegmentNames = useMemo(() => {
    return Array.from(new Set(Object.values(clusterAudit).map(a => a.segmentName)));
  }, [clusterAudit]);

  // Filter non-destructively
  const filteredData = useMemo(() => {
    return enrichedData.filter(item => {
      // Segment filter
      if (selectedSegments.length > 0 && !selectedSegments.includes(item['Segment Name'])) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matches = Object.values(item).some(val =>
          String(val || '').toLowerCase().includes(query)
        );
        if (!matches) return false;
      }
      return true;
    });
  }, [enrichedData, selectedSegments, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const currentRows = filteredData.slice((page - 1) * pageSize, page * pageSize);

  // Column headers
  const displayColumns = useMemo(() => {
    if (enrichedData.length === 0) return [];
    const keys = Object.keys(enrichedData[0]);
    // Put CustomerID, Segment Name, Cluster ID first
    const priority = ['CustomerID', 'Segment Name', 'Cluster ID'];
    const rest = keys.filter(k => !priority.includes(k));
    return [...priority.filter(p => keys.includes(p)), ...rest];
  }, [enrichedData]);

  // Export CSV
  const exportToCSV = () => {
    const csvString = Papa.unparse(filteredData);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'segmented_customers.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Excel
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SegmentedCustomers');
    XLSX.writeFile(workbook, 'segmented_customers.xlsx');
  };

  const toggleSegment = (seg: string) => {
    setPage(1);
    setSelectedSegments(prev =>
      prev.includes(seg) ? prev.filter(s => s !== seg) : [...prev, seg]
    );
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 md:p-6 mb-6">
      {/* Title & Export Buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100 mb-5">
        <div>
          <h2 className="text-base font-bold text-slate-900">6. Customer Explorer &amp; Consistent Data Export</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Filter, search, and download enriched data containing original attributes + Cluster ID + Segment Name.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportToCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-white hover:bg-slate-900 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV
          </button>
          <button
            type="button"
            onClick={exportToExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Download Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        {/* Segment filter pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          <button
            type="button"
            onClick={() => setSelectedSegments([])}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              selectedSegments.length === 0
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Segments
          </button>
          {allSegmentNames.map(name => {
            const isSelected = selectedSegments.includes(name);
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggleSegment(name)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search Customer ID or values..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
          />
        </div>
      </div>

      {/* Results summary */}
      <div className="text-xs text-slate-500 mb-2 flex items-center justify-between">
        <span>
          Showing <strong>{filteredData.length.toLocaleString()}</strong> of <strong>{enrichedData.length.toLocaleString()}</strong> customers
        </span>
        <span>
          Page {page} of {totalPages}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              {displayColumns.map(col => (
                <th key={col} className="py-2.5 px-3.5 whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {currentRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                {displayColumns.map(col => {
                  const val = (row as Record<string, any>)[col];
                  const isSegName = col === 'Segment Name';
                  const isClusterId = col === 'Cluster ID';
                  const isId = col === 'CustomerID';

                  return (
                    <td
                      key={col}
                      className={`py-2 px-3.5 whitespace-nowrap ${
                        isId ? 'font-mono font-medium text-slate-900' : ''
                      } ${isSegName ? 'font-bold text-blue-700' : ''} ${
                        isClusterId ? 'font-mono font-semibold text-slate-700' : ''
                      }`}
                    >
                      {val !== null && val !== undefined ? String(val) : 'N/A'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage(p => Math.max(1, p - 1))}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:pointer-events-none"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Previous
        </button>
        <span className="text-xs text-slate-600 font-medium">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:pointer-events-none"
        >
          Next <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </section>
  );
};
