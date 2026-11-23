import React, { useMemo, useState } from 'react';
import { AlertTriangle, Shield } from 'lucide-react';
import type { GradientUpdate, HospitalNode, TrainingRound } from '../types/federated';
import {
  type BottleneckSeverity,
  computePrivacyHeatmap,
  type PrivacyHeatmapCell,
} from '../utils/federatedEngine';

interface PrivacyBudgetHeatmapProps {
  nodes: HospitalNode[];
  rounds: TrainingRound[];
  gradientUpdates: GradientUpdate[];
}

function getCellSurfaceClass(severity: BottleneckSeverity, isSelected: boolean): string {
  const ring = isSelected ? 'ring-2 ring-slate-900 ring-offset-1' : '';
  switch (severity) {
    case 'Bottleneck':
      return `bg-rose-600 text-white ${ring}`;
    case 'Elevated':
      return `bg-amber-400 text-slate-950 ${ring}`;
    case 'Moderate':
      return `bg-teal-500 text-white ${ring}`;
    case 'Low':
      return `bg-teal-200 text-slate-900 ${ring}`;
    default:
      return `bg-slate-100 text-slate-400 ${ring}`;
  }
}

function getSeverityTextClass(severity: BottleneckSeverity): string {
  switch (severity) {
    case 'Bottleneck':
      return 'text-rose-700 font-semibold';
    case 'Elevated':
      return 'text-amber-700 font-semibold';
    case 'Moderate':
    case 'Low':
      return 'text-emerald-700 font-medium';
    default:
      return 'text-slate-500 font-medium';
  }
}

function getSeverityLabel(severity: BottleneckSeverity): string {
  switch (severity) {
    case 'Bottleneck':
      return '✖ Bottleneck';
    case 'Elevated':
      return '▲ Elevated';
    case 'Moderate':
    case 'Low':
      return '● Nominal';
    default:
      return '○ Idle';
  }
}

export const PrivacyBudgetHeatmap: React.FC<PrivacyBudgetHeatmapProps> = ({
  nodes,
  rounds,
  gradientUpdates,
}) => {
  const heatmap = useMemo(
    () => computePrivacyHeatmap(nodes, rounds, gradientUpdates),
    [nodes, rounds, gradientUpdates]
  );

  const [selectedCell, setSelectedCell] = useState<PrivacyHeatmapCell | null>(null);

  if (nodes.length === 0) {
    return null;
  }

  const activeCell =
    selectedCell ||
    heatmap.bottleneckRow?.cells[heatmap.bottleneckRow.cells.length - 1] ||
    null;

  const activeNodeName =
    nodes.find((n) => n.nodeId === activeCell?.nodeId)?.name || activeCell?.nodeId || '';

  return (
    <section
      aria-label="Privacy budget consumption heat map"
      className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
    >
      {/* Header & Bottleneck Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-teal-700 mb-1">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span>Differential Privacy Headroom Matrix</span>
          </div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Privacy Budget Consumption Heat Map
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Cumulative (ε, δ)-DP utilization across hospital enclaves and rounds to surface
            exhaustion bottlenecks early.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs">
          <div>
            <p className="text-slate-500">Total Consortium Burn</p>
            <p className="font-mono font-bold tabular-nums text-sm text-slate-900 mt-0.5">
              {heatmap.totalEpsilonUsed.toFixed(2)} / {heatmap.totalEpsilonCap.toFixed(1)} ε (
              {heatmap.consortiumUtilizationPercent.toFixed(1)}%)
            </p>
          </div>

          {heatmap.bottleneckRow && (
            <div className="pl-6 border-l border-slate-200">
              <p className="text-slate-500 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Primary Bottleneck</span>
              </p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">
                {heatmap.bottleneckRow.node.name.split(' ').slice(0, 3).join(' ')}{' '}
                <span className="font-mono tabular-nums text-rose-700">
                  ({heatmap.bottleneckRow.utilizationPercent.toFixed(1)}%
                  {heatmap.bottleneckRow.projectedRoundsRemaining !== null
                    ? ` · ~${heatmap.bottleneckRow.projectedRoundsRemaining} rounds left`
                    : ''}
                  )
                </span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Discrete Color-Step Legend + Active Cell Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="font-medium text-slate-700">Utilization Ramp:</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-slate-100 border border-slate-200 inline-block" />
            <span>0% Idle</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-teal-200 inline-block" />
            <span>&lt;30% Low</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-teal-500 inline-block" />
            <span>30–54% Moderate</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-amber-400 inline-block" />
            <span>55–77% Elevated</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-rose-600 inline-block" />
            <span>≥78% Bottleneck</span>
          </span>
        </div>

        {activeCell && (
          <div className="text-xs font-mono tabular-nums text-slate-700 bg-slate-100 px-2.5 py-1 rounded">
            {activeNodeName} · R{activeCell.roundNumber} · Δε +{activeCell.epsilonDelta.toFixed(3)}{' '}
            · Cumulative {activeCell.cumulativePercentAtRound.toFixed(1)}%
          </div>
        )}
      </div>

      {/* Heat Map Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
              <th className="py-2 pr-4 min-w-[210px]">Hospital Enclave</th>
              {heatmap.roundNumbers.map((rn) => (
                <th key={rn} className="py-2 px-1 text-center font-mono">
                  R{rn}
                </th>
              ))}
              <th className="py-2 pl-4 text-right">Total Burn / Cap</th>
              <th className="py-2 pl-4 text-right">Headroom State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {heatmap.rows.map((row) => (
              <tr key={row.node.nodeId} className="hover:bg-slate-50/70">
                <td className="py-2.5 pr-4">
                  <div className="font-medium text-slate-900 text-xs">{row.node.name}</div>
                  <div className="text-[11px] text-slate-500">{row.node.region}</div>
                </td>

                {row.cells.map((cell) => {
                  const isSelected =
                    activeCell?.nodeId === cell.nodeId &&
                    activeCell?.roundNumber === cell.roundNumber;
                  return (
                    <td key={`${row.node.nodeId}_r${cell.roundNumber}`} className="p-0.5">
                      <button
                        type="button"
                        aria-label={`${row.node.name} Round ${cell.roundNumber}: +${cell.epsilonDelta.toFixed(
                          3
                        )} epsilon, ${cell.cumulativePercentAtRound.toFixed(1)}% cumulative`}
                        onClick={() => setSelectedCell(cell)}
                        onMouseEnter={() => setSelectedCell(cell)}
                        className={`w-full h-9 rounded-sm font-mono text-[11px] tabular-nums flex items-center justify-center transition-transform cursor-pointer ${getCellSurfaceClass(
                          cell.severity,
                          isSelected
                        )}`}
                      >
                        {cell.epsilonDelta > 0 ? cell.epsilonDelta.toFixed(2) : '0.00'}
                      </button>
                    </td>
                  );
                })}

                <td className="py-2.5 pl-4 text-right font-mono tabular-nums text-xs text-slate-900 whitespace-nowrap">
                  <div>
                    {row.node.privacyBudgetUsed.toFixed(2)} / {row.node.privacyBudgetCap.toFixed(1)}{' '}
                    ε
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {row.utilizationPercent.toFixed(1)}% used
                  </div>
                </td>

                <td className="py-2.5 pl-4 text-right text-xs whitespace-nowrap">
                  <span className={getSeverityTextClass(row.severity)}>
                    {getSeverityLabel(row.severity)}
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
