import React, { useMemo, useState } from 'react';
import type { TrainingRound } from '../types/federated';
import {
  computeConvergenceView,
  type ConvergenceStrategyFilter,
  type ModelVersionFilter,
} from '../utils/federatedEngine';

interface ConvergenceChartProps {
  rounds: TrainingRound[];
}

export const ConvergenceChart: React.FC<ConvergenceChartProps> = ({ rounds }) => {
  const [strategyFilter, setStrategyFilter] = useState<ConvergenceStrategyFilter>('all');
  const [versionFilter, setVersionFilter] = useState<ModelVersionFilter>('all');
  const [hoveredRoundId, setHoveredRoundId] = useState<string | null>(null);

  const viewData = useMemo(
    () => computeConvergenceView(rounds, strategyFilter, versionFilter),
    [rounds, strategyFilter, versionFilter]
  );

  if (rounds.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-500">
        No federated rounds aggregated yet. Run Round 1 to visualize convergence.
      </div>
    );
  }

  const points = viewData.points;
  const count = points.length;
  const isCompareMode = strategyFilter === 'compare';

  const width = 680;
  const height = 240;
  const padLeft = 48;
  const padRight = 48;
  const padTop = 20;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const getX = (idx: number) =>
    count <= 1 ? padLeft + plotW / 2 : padLeft + (idx / (count - 1)) * plotW;

  // Accuracy scale: 65% to 100%
  const getAccY = (acc: number) => {
    const clamped = Math.max(65, Math.min(100, acc));
    return padTop + ((100 - clamped) / 35) * plotH;
  };

  // Loss scale: 0.0 to 0.7
  const getLossY = (loss: number) => {
    const clamped = Math.max(0, Math.min(0.7, loss));
    return padTop + ((0.7 - clamped) / 0.7) * plotH;
  };

  const accPoints = points.map((p, i) => `${getX(i)},${getAccY(p.globalAccuracy)}`).join(' ');
  const lossPoints = points.map((p, i) => `${getX(i)},${getLossY(p.globalLoss)}`).join(' ');
  const baselinePoints = points
    .map((p, i) => `${getX(i)},${getAccY(p.baselineFedAvgAccuracy)}`)
    .join(' ');

  const compareFillPolygon =
    isCompareMode && count > 1
      ? [
          ...points.map((p, i) => `${getX(i)},${getAccY(p.globalAccuracy)}`),
          ...[...points]
            .reverse()
            .map((p, revIdx) => `${getX(count - 1 - revIdx)},${getAccY(p.baselineFedAvgAccuracy)}`),
        ].join(' ')
      : '';

  const activeIdx =
    hoveredRoundId !== null
      ? Math.max(
          0,
          points.findIndex((p) => p.roundId === hoveredRoundId)
        )
      : Math.max(0, count - 1);
  const activePoint = points[activeIdx] || null;

  return (
    <div className="w-full space-y-3">
      {/* Interactive Strategy & Model Version Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div
          role="group"
          aria-label="Aggregation strategy comparison filter"
          className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto max-w-full"
        >
          {(
            [
              { id: 'all', label: 'All Rounds' },
              { id: 'FedAvg', label: 'FedAvg' },
              { id: 'FedProx', label: 'FedProx' },
              { id: 'compare', label: 'Compare Strategies' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              aria-pressed={strategyFilter === opt.id}
              onClick={() => {
                setStrategyFilter(opt.id);
                setHoveredRoundId(null);
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                strategyFilter === opt.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div
          role="group"
          aria-label="Model version filter"
          className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
        >
          {(
            [
              { id: 'all', label: 'All Versions' },
              { id: 'v1.0', label: 'v1.0 (R1–R3)' },
              { id: 'v2.0', label: 'v2.0 (R4+)' },
            ] as const
          ).map((ver) => (
            <button
              key={ver.id}
              type="button"
              aria-pressed={versionFilter === ver.id}
              onClick={() => setVersionFilter(ver.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                versionFilter === ver.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {ver.label}
            </button>
          ))}
        </div>
      </div>

      {count === 0 ? (
        <div className="h-56 flex flex-col items-center justify-center gap-3 border border-slate-200 rounded-lg bg-slate-50 px-4 text-center">
          <p className="text-sm text-slate-600">
            No rounds match {strategyFilter} under model {versionFilter}.
          </p>
          <button
            type="button"
            onClick={() => {
              setStrategyFilter('all');
              setVersionFilter('all');
              setHoveredRoundId(null);
            }}
            className="px-3 py-1.5 text-xs font-medium text-teal-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            Reset Chart Filters
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-0.5 bg-teal-700 inline-block" />
                <span>Global Accuracy (%)</span>
              </span>
              {isCompareMode && (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-0.5 border-t-2 border-dashed border-teal-600 inline-block" />
                  <span>FedAvg Baseline (%)</span>
                </span>
              )}
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-0.5 border-t-2 border-dashed border-amber-600 inline-block" />
                <span>Global Loss</span>
              </span>
            </div>

            {activePoint && (
              <div className="text-xs font-mono tabular-nums text-slate-700 bg-slate-100 px-2.5 py-1 rounded">
                R{activePoint.roundNumber} · {activePoint.modelVersion} · {activePoint.strategy} ·
                Acc {activePoint.globalAccuracy.toFixed(1)}% · Loss{' '}
                {activePoint.globalLoss.toFixed(3)}
                {isCompareMode && activePoint.accuracyGainVsBaseline > 0
                  ? ` · +${activePoint.accuracyGainVsBaseline.toFixed(1)}% vs FedAvg`
                  : viewData.cumulativeAccuracyGain > 0
                    ? ` · +${viewData.cumulativeAccuracyGain.toFixed(1)}% span`
                    : ''}
              </div>
            )}
          </div>

          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-56 select-none"
              role="img"
              aria-label="Global federated model accuracy and loss convergence chart"
            >
              {/* Horizontal grid lines */}
              {[70, 80, 90, 100].map((tick) => {
                const y = getAccY(tick);
                return (
                  <g key={tick}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={width - padRight}
                      y2={y}
                      stroke="#e2e8f0"
                      strokeWidth="1"
                    />
                    <text
                      x={padLeft - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-500 text-[10px] font-mono"
                    >
                      {tick}%
                    </text>
                  </g>
                );
              })}

              {/* Right Y-Axis Loss ticks */}
              {[0.1, 0.3, 0.5, 0.7].map((lossTick) => {
                const y = getLossY(lossTick);
                return (
                  <text
                    key={lossTick}
                    x={width - padRight + 8}
                    y={y + 4}
                    textAnchor="start"
                    className="fill-amber-700 text-[10px] font-mono"
                  >
                    {lossTick.toFixed(1)}
                  </text>
                );
              })}

              {/* Shaded Gain Area when comparing FedAvg vs FedProx */}
              {compareFillPolygon && (
                <polygon points={compareFillPolygon} fill="#0d9488" fillOpacity="0.12" />
              )}

              {/* Crosshair guide */}
              <line
                x1={getX(activeIdx)}
                y1={padTop}
                x2={getX(activeIdx)}
                y2={height - padBottom}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                strokeWidth="1"
              />

              {/* Accuracy, Baseline & Loss Curves */}
              {count > 1 && (
                <>
                  {isCompareMode && (
                    <polyline
                      fill="none"
                      stroke="#0d9488"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={baselinePoints}
                    />
                  )}
                  <polyline
                    fill="none"
                    stroke="#0f766e"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={accPoints}
                  />
                  <polyline
                    fill="none"
                    stroke="#d97706"
                    strokeWidth="2"
                    strokeDasharray="5 4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={lossPoints}
                  />
                </>
              )}

              {/* Data Nodes & Interactive Hit Targets */}
              {points.map((pt, idx) => {
                const cx = getX(idx);
                const accY = getAccY(pt.globalAccuracy);
                const lossY = getLossY(pt.globalLoss);
                const baseY = getAccY(pt.baselineFedAvgAccuracy);
                const isSelected = idx === activeIdx;

                return (
                  <g
                    key={pt.roundId}
                    onMouseEnter={() => setHoveredRoundId(pt.roundId)}
                    onMouseLeave={() => setHoveredRoundId(null)}
                    className="cursor-pointer"
                  >
                    {isCompareMode && (
                      <circle
                        cx={cx}
                        cy={baseY}
                        r={isSelected ? 4.5 : 3}
                        fill="#0d9488"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    )}
                    <circle
                      cx={cx}
                      cy={accY}
                      r={isSelected ? 5 : 3.5}
                      fill="#0f766e"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={cx}
                      cy={lossY}
                      r={isSelected ? 4.5 : 3}
                      fill="#d97706"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    <text
                      x={cx}
                      y={height - 10}
                      textAnchor="middle"
                      className={`text-[10px] font-mono ${
                        isSelected ? 'fill-slate-900 font-semibold' : 'fill-slate-500'
                      }`}
                    >
                      R{pt.roundNumber}
                    </text>
                    <rect
                      x={cx - 18}
                      y={padTop}
                      width={36}
                      height={plotH + 20}
                      fill="transparent"
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </>
      )}
    </div>
  );
};
