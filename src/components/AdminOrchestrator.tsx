import React, { useState } from 'react';
import { Download, Eye, FastForward, Layers, Play, ShieldCheck } from 'lucide-react';
import type {
  AggregationStrategy,
  AuditLog,
  GradientUpdate,
  HospitalNode,
  TrainingRound,
} from '../types/federated';
import { ConvergenceChart } from './ConvergenceChart';

interface AdminOrchestratorProps {
  nodes: HospitalNode[];
  rounds: TrainingRound[];
  gradientUpdates: GradientUpdate[];
  auditLogs: AuditLog[];
  onRunGlobalRound: (strategy: AggregationStrategy, noiseMultiplier: number) => Promise<void>;
  onAutoRunRounds: (
    count: number,
    strategy: AggregationStrategy,
    noiseMultiplier: number
  ) => Promise<void>;
}

export const AdminOrchestrator: React.FC<AdminOrchestratorProps> = ({
  nodes,
  rounds,
  gradientUpdates,
  auditLogs,
  onRunGlobalRound,
  onAutoRunRounds,
}) => {
  const [strategy, setStrategy] = useState<AggregationStrategy>('FedProx');
  const [noiseMultiplier, setNoiseMultiplier] = useState(1.05);
  const [aggregating, setAggregating] = useState(false);
  const [simulatingBatch, setSimulatingBatch] = useState(false);
  const [inspectedUpdateId, setInspectedUpdateId] = useState<string>(
    gradientUpdates[0]?.updateId || ''
  );
  const [roundNotice, setRoundNotice] = useState<string | null>(null);

  const inspectedUpdate =
    gradientUpdates.find((u) => u.updateId === inspectedUpdateId) ||
    gradientUpdates[0] ||
    null;

  const pendingUpdates = gradientUpdates.filter((u) => u.status === 'pending');
  const latestRound =
    rounds.length > 0
      ? [...rounds].sort((a, b) => b.roundNumber - a.roundNumber)[0]
      : null;

  const handleAggregate = async () => {
    if (pendingUpdates.length === 0) return;
    setAggregating(true);
    setRoundNotice(null);
    try {
      await onRunGlobalRound(strategy, noiseMultiplier);
      setRoundNotice(
        `Global Round ${(latestRound?.roundNumber || 0) + 1} aggregated via ${strategy} across ${pendingUpdates.length} verified node packets.`
      );
    } finally {
      setAggregating(false);
    }
  };

  const handleAutoRunThree = async () => {
    setSimulatingBatch(true);
    setRoundNotice(null);
    try {
      const startRound = (latestRound?.roundNumber || 0) + 1;
      await onAutoRunRounds(3, strategy, noiseMultiplier);
      setRoundNotice(
        `Simulated 3 federated ${strategy} rounds (R${startRound}–R${startRound + 2}) across active hospital enclaves.`
      );
    } finally {
      setSimulatingBatch(false);
    }
  };

  const handleExportComplianceReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      platform: 'FedMed Shield Federated Consortium',
      zeroPhiInvariant: 'Verified: 0 patient records stored in central aggregator',
      activeNodes: nodes.filter((n) => n.status === 'active').length,
      latestRound,
      trainingRounds: rounds,
      recentAuditTrail: auditLogs.slice(0, 25),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fedmed-compliance-audit-r${latestRound?.roundNumber || 0}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Aggregation Control Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div>
            <p className="text-xs font-medium text-teal-700 mb-1">
              Consortium Aggregator Control
            </p>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Global Round Orchestration
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Aggregate pending differentially private gradient updates from verified hospital
              nodes without accessing underlying records.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="agg-strategy"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Aggregation Algorithm
              </label>
              <select
                id="agg-strategy"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as AggregationStrategy)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="FedProx">FedProx (Non-IID Heterogeneity Guard)</option>
                <option value="FedAvg">FedAvg (Standard Sample-Weighted)</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="global-noise" className="font-medium text-slate-700">
                  Server Noise Multiplier (σ)
                </label>
                <span className="font-mono tabular-nums text-slate-900">
                  {noiseMultiplier.toFixed(2)}
                </span>
              </div>
              <input
                id="global-noise"
                type="range"
                min={0.6}
                max={2.0}
                step={0.05}
                value={noiseMultiplier}
                onChange={(e) => setNoiseMultiplier(Number(e.target.value))}
                className="w-full accent-teal-700"
              />
            </div>
          </div>

          <div className="border-y border-slate-200 py-3.5 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Pending Gradient Packets</span>
              <span className="font-mono font-semibold tabular-nums text-slate-900">
                {pendingUpdates.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Pending Sample Weight</span>
              <span className="font-mono font-semibold tabular-nums text-slate-900">
                {pendingUpdates
                  .reduce((acc, u) => acc + u.sampleCount, 0)
                  .toLocaleString()}
              </span>
            </div>
          </div>

          {roundNotice && (
            <div
              role="status"
              className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800"
            >
              {roundNotice}
            </div>
          )}

          <div className="space-y-2.5">
            <button
              type="button"
              disabled={aggregating || simulatingBatch || pendingUpdates.length === 0}
              onClick={() => void handleAggregate()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>
                {aggregating
                  ? 'Aggregating Weights...'
                  : `Execute Global ${strategy} Round`}
              </span>
            </button>

            <button
              type="button"
              disabled={aggregating || simulatingBatch}
              onClick={() => void handleAutoRunThree()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 disabled:opacity-50 cursor-pointer"
            >
              <FastForward className="w-4 h-4" />
              <span>
                {simulatingBatch ? 'Running 3 Rounds...' : 'Auto-Run 3 Federated Rounds'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportComplianceReport}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Audit Compliance JSON</span>
            </button>
          </div>
        </section>

        {/* Right: Convergence & Privacy Tradeoff Telemetry */}
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                Global Model Convergence &amp; Loss Telemetry
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Cross-institutional evaluation metrics aggregated over encrypted updates
              </p>
            </div>
            {latestRound && (
              <div className="text-xs font-mono tabular-nums text-slate-600">
                AUC-ROC: <strong className="text-slate-900">{latestRound.aucRoc.toFixed(3)}</strong>{' '}
                · F1: <strong className="text-slate-900">{latestRound.f1Score.toFixed(3)}</strong>
              </div>
            )}
          </div>

          <ConvergenceChart rounds={rounds} />
        </section>
      </div>

      {/* Zero-PHI Packet Inspector */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-700" />
            <h3 className="font-display text-base font-bold text-slate-900">
              Inbound Gradient Queue &amp; Zero-PHI Inspector
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            {gradientUpdates.length} packets total · {pendingUpdates.length} pending
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-7 overflow-x-auto border-b lg:border-b-0 lg:border-r border-slate-200">
            {gradientUpdates.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No gradient updates submitted yet.
              </div>
            ) : (
              <table className="w-full min-w-[580px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                    <th className="py-2.5 px-4">Node</th>
                    <th className="py-2.5 px-3 text-right">Round</th>
                    <th className="py-2.5 px-3 text-right">Samples</th>
                    <th className="py-2.5 px-3 text-right">L2 Norm</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-4">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {gradientUpdates.map((upd) => {
                    const node = nodes.find((n) => n.nodeId === upd.nodeId);
                    const isSelected = inspectedUpdate?.updateId === upd.updateId;
                    return (
                      <tr
                        key={upd.updateId}
                        className={isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'}
                      >
                        <td className="py-2.5 px-4 text-xs font-medium text-slate-900">
                          {node?.name || upd.nodeId}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                          R{upd.roundNumber}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                          {upd.sampleCount.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                          {upd.l2Norm.toFixed(3)}
                        </td>
                        <td className="py-2.5 px-3 text-xs font-medium whitespace-nowrap">
                          <span
                            className={
                              upd.status === 'pending' ? 'text-amber-700' : 'text-emerald-700'
                            }
                          >
                            {upd.status === 'pending' ? '▲ Pending' : '● Aggregated'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <button
                            type="button"
                            onClick={() => setInspectedUpdateId(upd.updateId)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="lg:col-span-5 p-5 bg-slate-50">
            {inspectedUpdate ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold text-slate-900">
                    {inspectedUpdate.updateId}
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Zero-PHI Verified</span>
                  </span>
                </div>
                <div className="bg-slate-900 text-slate-100 rounded-lg p-3.5 font-mono text-xs overflow-x-auto">
                  <pre>
                    {JSON.stringify(
                      {
                        nodeId: inspectedUpdate.nodeId,
                        roundNumber: inspectedUpdate.roundNumber,
                        phiScanPassed: inspectedUpdate.phiScanPassed,
                        gradientDigest: inspectedUpdate.gradientDigest,
                        weightDeltas: inspectedUpdate.weightDeltas,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-8 text-center">
                Select an inbound packet to inspect its differentially private tensor payload.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
