import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Eye, Info, RotateCw, Sparkles, Layers } from 'lucide-react';
import { CustomerRecord, ClusterAudit } from '../types';

interface ClusterVisualizationProps {
  data: CustomerRecord[];
  clusterLabels: number[];
  selectedFeatures: string[];
  pcaData?: number[][];
  pcaVariance?: number[];
  clusterAudit: Record<number, ClusterAudit>;
}

// Distinct, accessible palette for clusters
const CLUSTER_COLORS = [
  '#2563eb', // Blue
  '#059669', // Emerald
  '#d97706', // Amber
  '#dc2626', // Red
  '#7c3aed', // Purple
  '#0891b2', // Cyan
  '#db2777', // Pink
  '#4b5563', // Slate
];

export const ClusterVisualizationSection: React.FC<ClusterVisualizationProps> = ({
  data,
  clusterLabels,
  selectedFeatures,
  pcaData,
  pcaVariance,
  clusterAudit
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  
  // 3D rotation angles
  const [rotX, setRotX] = useState<number>(25);
  const [rotY, setRotY] = useState<number>(35);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mode for >3 features: '2d' or '3d' PCA
  const [pcaMode, setPcaMode] = useState<'2d' | '3d'>('2d');

  const featureCount = selectedFeatures.length;
  const isPca = featureCount > 3;

  // Compute bounding boxes and coordinates for rendering
  const pointCoords = useMemo(() => {
    const n = data.length;
    if (n === 0) return [];

    if (featureCount === 1) {
      const feat = selectedFeatures[0];
      const vals = data.map(d => Number(d[feat]) || 0);
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const range = max - min || 1;

      // Pseudo-deterministic jitter based on index
      return vals.map((v, i) => {
        const normX = (v - min) / range;
        const jitterY = 0.5 + ((i % 13) - 6) * 0.05;
        return { normX, normY: jitterY, z: 0, rawX: v, rawY: 0, rawZ: 0 };
      });
    }

    if (featureCount === 2) {
      const [f1, f2] = selectedFeatures;
      const xVals = data.map(d => Number(d[f1]) || 0);
      const yVals = data.map(d => Number(d[f2]) || 0);

      const minX = Math.min(...xVals);
      const maxX = Math.max(...xVals);
      const rangeX = maxX - minX || 1;

      const minY = Math.min(...yVals);
      const maxY = Math.max(...yVals);
      const rangeY = maxY - minY || 1;

      return data.map((_, i) => ({
        normX: (xVals[i] - minX) / rangeX,
        normY: (yVals[i] - minY) / rangeY,
        z: 0,
        rawX: xVals[i],
        rawY: yVals[i],
        rawZ: 0
      }));
    }

    if (featureCount === 3) {
      const [f1, f2, f3] = selectedFeatures;
      const xVals = data.map(d => Number(d[f1]) || 0);
      const yVals = data.map(d => Number(d[f2]) || 0);
      const zVals = data.map(d => Number(d[f3]) || 0);

      const minX = Math.min(...xVals);
      const maxX = Math.max(...xVals);
      const rangeX = maxX - minX || 1;

      const minY = Math.min(...yVals);
      const maxY = Math.max(...yVals);
      const rangeY = maxY - minY || 1;

      const minZ = Math.min(...zVals);
      const maxZ = Math.max(...zVals);
      const rangeZ = maxZ - minZ || 1;

      return data.map((_, i) => ({
        normX: (xVals[i] - minX) / rangeX - 0.5,
        normY: (yVals[i] - minY) / rangeY - 0.5,
        normZ: (zVals[i] - minZ) / rangeZ - 0.5,
        rawX: xVals[i],
        rawY: yVals[i],
        rawZ: zVals[i]
      }));
    }

    // >3 features: Use PCA transformed coordinates
    if (pcaData && pcaData.length === n) {
      const xVals = pcaData.map(p => p[0] || 0);
      const yVals = pcaData.map(p => p[1] || 0);
      const zVals = pcaData.map(p => p[2] || 0);

      const minX = Math.min(...xVals);
      const maxX = Math.max(...xVals);
      const rangeX = maxX - minX || 1;

      const minY = Math.min(...yVals);
      const maxY = Math.max(...yVals);
      const rangeY = maxY - minY || 1;

      const minZ = Math.min(...zVals);
      const maxZ = Math.max(...zVals);
      const rangeZ = maxZ - minZ || 1;

      return data.map((_, i) => ({
        normX: (xVals[i] - minX) / rangeX - (pcaMode === '3d' ? 0.5 : 0),
        normY: (yVals[i] - minY) / rangeY - (pcaMode === '3d' ? 0.5 : 0),
        normZ: (zVals[i] - minZ) / rangeZ - 0.5,
        rawX: xVals[i],
        rawY: yVals[i],
        rawZ: zVals[i]
      }));
    }

    return [];
  }, [data, selectedFeatures, featureCount, pcaData, pcaMode]);

  // Render on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const is3D = featureCount === 3 || (isPca && pcaMode === '3d');
    const padding = 50;

    if (!is3D) {
      // 2D or 1D View
      const plotW = width - padding * 2;
      const plotH = height - padding * 2;

      // Draw Grid & Axes
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const x = padding + (plotW / 5) * i;
        const y = padding + (plotH / 5) * i;
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
      }

      // Draw Border
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(padding, padding, plotW, plotH);

      // Draw Axis labels
      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';

      if (featureCount === 1) {
        ctx.fillText(selectedFeatures[0], width / 2, height - 15);
      } else if (featureCount === 2) {
        ctx.fillText(selectedFeatures[0], width / 2, height - 15);
        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(selectedFeatures[1], 0, 0);
        ctx.restore();
      } else if (isPca) {
        const v1 = pcaVariance && pcaVariance[0] ? ` (${(pcaVariance[0] * 100).toFixed(1)}% var)` : '';
        const v2 = pcaVariance && pcaVariance[1] ? ` (${(pcaVariance[1] * 100).toFixed(1)}% var)` : '';
        ctx.fillText(`PCA Component 1${v1}`, width / 2, height - 15);
        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`PCA Component 2${v2}`, 0, 0);
        ctx.restore();
      }

      // Plot Points
      const pointRadius = data.length > 5000 ? 2 : data.length > 1000 ? 3 : 4;

      pointCoords.forEach((pt, i) => {
        const cx = padding + pt.normX * plotW;
        const cy = height - padding - pt.normY * plotH;
        const cId = clusterLabels[i] || 0;
        const color = CLUSTER_COLORS[cId % CLUSTER_COLORS.length];

        ctx.beginPath();
        ctx.arc(cx, cy, i === hoveredIndex ? pointRadius + 3 : pointRadius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = i === hoveredIndex ? 1 : 0.75;
        ctx.fill();

        if (i === hoveredIndex) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
      ctx.globalAlpha = 1;

    } else {
      // 3D View Projection
      const radX = (rotX * Math.PI) / 180;
      const radY = (rotY * Math.PI) / 180;
      const cosX = Math.cos(radX);
      const sinX = Math.sin(radX);
      const cosY = Math.cos(radY);
      const sinY = Math.sin(radY);

      const centerX = width / 2;
      const centerY = height / 2;
      const scale = Math.min(width, height) * 0.7;

      // Draw 3D bounding wireframe box
      const corners = [
        [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5],
        [-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5],
      ];

      const projCorners = corners.map(([x, y, z]) => {
        const x1 = x * cosY + z * sinY;
        const z1 = -x * sinY + z * cosY;
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;
        const f = 2 / (2 + z2);
        return { px: centerX + x1 * scale * f, py: centerY - y2 * scale * f };
      });

      const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7]
      ];

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      edges.forEach(([i1, i2]) => {
        ctx.beginPath();
        ctx.moveTo(projCorners[i1].px, projCorners[i1].py);
        ctx.lineTo(projCorners[i2].px, projCorners[i2].py);
        ctx.stroke();
      });

      // Project all data points and sort by depth (z)
      const projected = pointCoords.map((pt, i) => {
        const x = pt.normX;
        const y = pt.normY;
        const z = (pt as any).normZ || 0;

        const x1 = x * cosY + z * sinY;
        const z1 = -x * sinY + z * cosY;
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;

        const factor = 2 / (2 + z2);
        const px = centerX + x1 * scale * factor;
        const py = centerY - y2 * scale * factor;

        return { px, py, depth: z2, index: i };
      });

      projected.sort((a, b) => b.depth - a.depth);

      const pointRadius = data.length > 5000 ? 2 : data.length > 1000 ? 3 : 4;

      projected.forEach(({ px, py, index }) => {
        const cId = clusterLabels[index] || 0;
        const color = CLUSTER_COLORS[cId % CLUSTER_COLORS.length];

        ctx.beginPath();
        ctx.arc(px, py, index === hoveredIndex ? pointRadius + 3 : pointRadius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = index === hoveredIndex ? 1 : 0.75;
        ctx.fill();

        if (index === hoveredIndex) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
      ctx.globalAlpha = 1;
    }
  }, [pointCoords, clusterLabels, hoveredIndex, rotX, rotY, featureCount, isPca, pcaMode, pcaVariance, selectedFeatures, data.length]);

  // Handle Canvas Mouse Move for Hover Inspector
  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDragging) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setRotY(prev => (prev + dx * 0.6) % 360);
      setRotX(prev => Math.max(-80, Math.min(80, prev - dy * 0.6)));
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    // Find nearest point within radius 15
    const is3D = featureCount === 3 || (isPca && pcaMode === '3d');
    const padding = 50;
    const plotW = canvas.width - padding * 2;
    const plotH = canvas.height - padding * 2;

    let closestIdx: number | null = null;
    let minDist = 18;

    if (!is3D) {
      for (let i = 0; i < pointCoords.length; i++) {
        const pt = pointCoords[i];
        const cx = padding + pt.normX * plotW;
        const cy = canvas.height - padding - pt.normY * plotH;
        const dist = Math.hypot(mouseX - cx, mouseY - cy);
        if (dist < minDist) {
          minDist = dist;
          closestIdx = i;
        }
      }
    }

    setHoveredIndex(closestIdx);
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const is3D = featureCount === 3 || (isPca && pcaMode === '3d');
    if (is3D) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const onMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 md:p-6 mb-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-4 border-b border-slate-100 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">4. Interactive Cluster Visualizations</h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-blue-50 text-blue-700">
              {featureCount === 1 ? '1D Distribution' : featureCount === 2 ? '2D Direct View' : featureCount === 3 ? '3D Direct View' : 'PCA-Reduced View'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {featureCount <= 3
              ? `Plotted directly on user-selected feature axes (${selectedFeatures.join(', ')}).`
              : 'High-dimensional dataset reduced via PCA for visual inspection.'}
          </p>
        </div>

        {/* View mode toggle for >3 features */}
        {isPca && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600">PCA View:</span>
            <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setPcaMode('2d')}
                className={`px-3 py-1 font-semibold rounded-md transition-all ${
                  pcaMode === '2d' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2D Projection
              </button>
              <button
                type="button"
                onClick={() => setPcaMode('3d')}
                className={`px-3 py-1 font-semibold rounded-md transition-all ${
                  pcaMode === '3d' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3D Interactive
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mandatory PCA Banner if > 3 features */}
      {isPca && (
        <div className="mb-4 p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-950 font-bold">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>PCA-Reduced View</span>
          </div>
          <p className="text-amber-900 leading-relaxed font-medium">
            PCA is used only to visualize high-dimensional clustering results. K-Means was fitted using the original selected features.
          </p>

          {/* Explained variance badges */}
          <div className="flex flex-wrap gap-2 pt-1">
            {pcaVariance && pcaVariance.slice(0, pcaMode === '3d' ? 3 : 2).map((v, idx) => (
              <div
                key={idx}
                className="px-2.5 py-1 rounded bg-white border border-amber-300/80 text-amber-950 font-semibold text-[11px] shadow-2xs"
              >
                PCA Component {idx + 1} &mdash; {(v * 100).toFixed(1)}% variance
              </div>
            ))}
            {pcaVariance && (
              <div className="px-2 py-1 text-[11px] text-amber-800 self-center">
                Total visualized variance:{' '}
                <strong>
                  {(
                    pcaVariance.slice(0, pcaMode === '3d' ? 3 : 2).reduce((s, x) => s + x, 0) * 100
                  ).toFixed(1)}%
                </strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3D Drag Instructions Notice */}
      {(featureCount === 3 || (isPca && pcaMode === '3d')) && (
        <div className="mb-2 text-[11px] text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <RotateCw className="w-3.5 h-3.5 text-slate-400" />
            Click and drag canvas to rotate 3D orientation (Pitch: {rotX.toFixed(0)}&deg;, Yaw: {rotY.toFixed(0)}&deg;)
          </span>
          <button
            type="button"
            onClick={() => { setRotX(25); setRotY(35); }}
            className="text-blue-600 hover:text-blue-800 font-medium text-[11px]"
          >
            Reset Camera
          </button>
        </div>
      )}

      {/* Canvas Stage */}
      <div className="relative w-full bg-slate-50/50 rounded-xl border border-slate-200 overflow-hidden flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={800}
          height={420}
          onMouseMove={onMouseMove}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onMouseLeave={() => { setIsDragging(false); setHoveredIndex(null); }}
          className={`w-full max-w-[800px] h-auto select-none ${
            featureCount === 3 || (isPca && pcaMode === '3d') ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
          }`}
        />

        {/* Hover Inspector Tooltip */}
        {hoveredIndex !== null && hoverPos && data[hoveredIndex] && (
          <div
            className="absolute z-20 pointer-events-none p-3 rounded-lg bg-slate-900/90 text-white text-xs shadow-lg backdrop-blur-xs border border-slate-700"
            style={{
              left: Math.min(Math.max(10, hoverPos.x + 15), 620),
              top: Math.min(Math.max(10, hoverPos.y - 15), 320)
            }}
          >
            <div className="font-bold text-sm text-slate-100">
              {data[hoveredIndex].CustomerID}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: CLUSTER_COLORS[(clusterLabels[hoveredIndex] || 0) % CLUSTER_COLORS.length] }}
              />
              <span className="font-semibold text-blue-300">
                {clusterAudit[clusterLabels[hoveredIndex]]?.segmentName || `Cluster ${clusterLabels[hoveredIndex]}`}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                (ID: {clusterLabels[hoveredIndex]})
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-700/80 space-y-0.5 text-[11px] text-slate-300">
              {selectedFeatures.slice(0, 4).map(f => (
                <div key={f} className="flex justify-between gap-3">
                  <span className="text-slate-400">{f}:</span>
                  <span className="font-mono">{Number(data[hoveredIndex][f]).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cluster Legend Bar */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Segments:</span>
        {Object.values(clusterAudit).map(audit => (
          <div
            key={audit.clusterId}
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100/80 border border-slate-200 text-xs"
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: CLUSTER_COLORS[audit.clusterId % CLUSTER_COLORS.length] }}
            />
            <span className="font-bold text-slate-800">{audit.segmentName}</span>
            <span className="text-[11px] text-slate-500">
              (ID: {audit.clusterId} &bull; {audit.sharePct.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};
