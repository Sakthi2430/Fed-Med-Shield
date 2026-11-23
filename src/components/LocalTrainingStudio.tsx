import React, { useState } from 'react';
import { CheckCircle2, Cpu, Send, ShieldCheck } from 'lucide-react';
import type {
  GradientUpdate,
  HospitalNode,
  LocalPatientRecord,
  LocalTrainingResult,
  ModelWeights,
} from '../types/federated';
import { runLocalTrainingEpoch } from '../utils/federatedEngine';

interface LocalTrainingStudioProps {
  activeNode: HospitalNode;
  localRecords: LocalPatientRecord[];
  globalWeights: ModelWeights;
  currentRoundNumber: number;
  nodeUpdates: GradientUpdate[];
  onSubmitGradient: (
    result: LocalTrainingResult,
    localEpochs: number,
    sampleCount: number
  ) => Promise<void>;
}

export const LocalTrainingStudio: React.FC<LocalTrainingStudioProps> = ({
  activeNode,
  localRecords,
  globalWeights,
  currentRoundNumber,
  nodeUpdates,
  onSubmitGradient,
}) => {
  const [localEpochs, setLocalEpochs] = useState(4);
  const [learningRate, setLearningRate] = useState(0.05);
  const [clippingNorm, setClippingNorm] = useState(1.0);
  const [noiseMultiplier, setNoiseMultiplier] = useState(1.1);
  const [previewResult, setPreviewResult] = useState<LocalTrainingResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitBanner, setSubmitBanner] = useState<string | null>(null);

  const budgetRemaining = Math.max(0, activeNode.privacyBudgetCap - activeNode.privacyBudgetUsed);
  const effectiveSampleCount = Math.max(activeNode.localRecordCount, localRecords.length);
  const isNodeSuspended = activeNode.status !== 'active';

  const handleRunLocalTraining = () => {
    setSubmitBanner(null);
    const result = runLocalTrainingEpoch(localRecords, globalWeights, {
      localEpochs,
      learningRate,
      clippingNorm,
      noiseMultiplier,
      targetEpsilon: budgetRemaining,
      nodeId: activeNode.nodeId,
    });
    setPreviewResult(result);
  };

  const handleTransmitGradient = async () => {
    if (!previewResult || isNodeSuspended) return;
    setSubmitting(true);
    try {
      await onSubmitGradient(previewResult, localEpochs, effectiveSampleCount);
      setSubmitBanner(
        `Encrypted gradient packet ${previewResult.gradientDigest.slice(0, 12)} submitted for Round ${currentRoundNumber}.`
      );
      setPreviewResult(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Local Training & DP Calibration Controls */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div>
            <p className="text-xs font-medium text-teal-700 mb-1">
              On-Premise Training · Round {currentRoundNumber}
            </p>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Differential Privacy & Epoch Controls
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Calibrate L2 gradient clipping and Gaussian noise before running local stochastic
              gradient descent on {localRecords.length} enclave records.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="local-epochs" className="font-medium text-slate-700">
                  Local Epochs (E)
                </label>
                <span className="font-mono tabular-nums text-slate-900">{localEpochs}</span>
              </div>
              <input
                id="local-epochs"
                type="range"
                min={1}
                max={12}
                step={1}
                value={localEpochs}
                onChange={(e) => setLocalEpochs(Number(e.target.value))}
                className="w-full accent-teal-700"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="learning-rate" className="font-medium text-slate-700">
                  Learning Rate (η)
                </label>
                <span className="font-mono tabular-nums text-slate-900">
                  {learningRate.toFixed(3)}
                </span>
              </div>
              <input
                id="learning-rate"
                type="range"
                min={0.01}
                max={0.2}
                step={0.01}
                value={learningRate}
                onChange={(e) => setLearningRate(Number(e.target.value))}
                className="w-full accent-teal-700"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="clipping-norm" className="font-medium text-slate-700">
                  L2 Clipping Bound (C)
                </label>
                <span className="font-mono tabular-nums text-slate-900">
                  {clippingNorm.toFixed(2)}
                </span>
              </div>
              <input
                id="clipping-norm"
                type="range"
                min={0.5}
                max={3.0}
                step={0.1}
                value={clippingNorm}
                onChange={(e) => setClippingNorm(Number(e.target.value))}
                className="w-full accent-teal-700"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="noise-mult" className="font-medium text-slate-700">
                  Gaussian Noise Multiplier (σ)
                </label>
                <span className="font-mono tabular-nums text-slate-900">
                  {noiseMultiplier.toFixed(2)}
                </span>
              </div>
              <input
                id="noise-mult"
                type="range"
                min={0.6}
                max={2.5}
                step={0.05}
                value={noiseMultiplier}
                onChange={(e) => setNoiseMultiplier(Number(e.target.value))}
                className="w-full accent-teal-700"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600">Remaining Node ε-Budget</span>
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {budgetRemaining.toFixed(2)} / {activeNode.privacyBudgetCap.toFixed(2)} ε
            </span>
          </div>

          <button
            type="button"
            disabled={isNodeSuspended}
            onClick={handleRunLocalTraining}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Cpu className="w-4 h-4" />
            <span>Train Local Epoch & Compute DP Gradients</span>
          </button>

          {isNodeSuspended && (
            <p className="text-xs text-amber-700">
              Node status is currently {activeNode.status}. An administrator must activate this
              hospital node before submitting updates.
            </p>
          )}
        </section>

        {/* Right: Outbound Gradient Packet Inspector & Submission */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                Outbound Gradient Packet Verification
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Inspect the exact anonymized payload before transmitting to the consortium
                aggregator.
              </p>
            </div>
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
          </div>

          {submitBanner && (
            <div
              role="status"
              className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{submitBanner}</span>
            </div>
          )}

          {previewResult ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-y border-slate-200 py-4">
                <div>
                  <p className="text-xs text-slate-500">Local Accuracy</p>
                  <p className="text-lg font-mono font-bold tabular-nums text-slate-900">
                    {previewResult.localAccuracy.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Local Loss</p>
                  <p className="text-lg font-mono font-bold tabular-nums text-slate-900">
                    {previewResult.localLoss.toFixed(3)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Clipped L2 Norm</p>
                  <p className="text-lg font-mono font-bold tabular-nums text-slate-900">
                    {previewResult.l2Norm.toFixed(3)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Privacy Cost (Δε)</p>
                  <p className="text-lg font-mono font-bold tabular-nums text-teal-700">
                    +{previewResult.epsilonDelta.toFixed(3)} ε
                  </p>
                </div>
              </div>

              <div className="bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                <div className="flex items-center justify-between text-slate-400 pb-2 mb-2 border-b border-slate-800">
                  <span>OUTBOUND PAYLOAD · ZERO-PHI VERIFIED</span>
                  <span className="text-emerald-400">
                    PHI_SCAN: {previewResult.phiScanPassed ? 'PASSED' : 'BLOCKED'}
                  </span>
                </div>
                <pre className="leading-relaxed">
                  {JSON.stringify(
                    {
                      roundNumber: currentRoundNumber,
                      nodeId: activeNode.nodeId,
                      sampleCount: effectiveSampleCount,
                      localEpochs,
                      l2Norm: previewResult.l2Norm,
                      epsilonDelta: previewResult.epsilonDelta,
                      gradientDigest: previewResult.gradientDigest,
                      weightDeltas: previewResult.clippedNoisedDeltas,
                      patientRecordsIncluded: 0,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPreviewResult(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Discard Draft
                </button>
                <button
                  type="button"
                  disabled={submitting || !previewResult.phiScanPassed || isNodeSuspended}
                  onClick={() => void handleTransmitGradient()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Submitting...' : 'Submit Encrypted Gradient'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-12 px-4 border border-dashed border-slate-300 rounded-lg text-center">
              <p className="text-sm font-medium text-slate-700">
                No pending local training draft
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Click &ldquo;Train Local Epoch &amp; Compute DP Gradients&rdquo; to execute local
                stochastic gradient descent and inspect the differential privacy packet.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Cryptographic Submission Receipts */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">
              Node Gradient Submission Receipts
            </h3>
            <p className="text-xs text-slate-500">
              Cryptographic proof of zero-PHI submissions from {activeNode.name}
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            {nodeUpdates.length} receipts
          </span>
        </div>

        {nodeUpdates.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No gradient submissions recorded for this node yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">Round</th>
                  <th className="py-2.5 px-3">Digest</th>
                  <th className="py-2.5 px-3 text-right">Samples</th>
                  <th className="py-2.5 px-3 text-right">Local Acc</th>
                  <th className="py-2.5 px-3 text-right">Δε Cost</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {nodeUpdates.map((upd) => (
                  <tr key={upd.updateId} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono tabular-nums text-slate-900">
                      R{upd.roundNumber}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-600">
                      {upd.gradientDigest.slice(0, 16)}...
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {upd.sampleCount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {upd.localAccuracy.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      +{upd.epsilonDelta.toFixed(3)}
                    </td>
                    <td className="py-2.5 px-4 text-xs font-medium">
                      <span
                        className={
                          upd.status === 'aggregated' ? 'text-emerald-700' : 'text-amber-700'
                        }
                      >
                        {upd.status === 'aggregated' ? '● Aggregated' : '▲ Pending Quorum'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
