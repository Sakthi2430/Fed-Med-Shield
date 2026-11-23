import React, { useMemo, useState } from 'react';
import { BarChart3, Lock, ShieldAlert, ShieldCheck, Sliders } from 'lucide-react';
import type { HospitalNode, TrainingRound } from '../types/federated';
import {
  computeHospitalFairnessMetrics,
  simulatePrivacyAttackResilience,
} from '../utils/federatedEngine';

interface PrivacyLabProps {
  nodes: HospitalNode[];
  rounds: TrainingRound[];
}

export const PrivacyLab: React.FC<PrivacyLabProps> = ({ nodes, rounds }) => {
  const [clippingNorm, setClippingNorm] = useState(1.0);
  const [noiseMultiplier, setNoiseMultiplier] = useState(1.15);

  const resilience = useMemo(
    () => simulatePrivacyAttackResilience(clippingNorm, noiseMultiplier),
    [clippingNorm, noiseMultiplier]
  );

  const latestAccuracy = useMemo(() => {
    if (rounds.length === 0) return 90.0;
    const sorted = [...rounds].sort((a, b) => b.roundNumber - a.roundNumber);
    return sorted[0].globalAccuracy;
  }, [rounds]);

  const fairnessRows = useMemo(
    () => computeHospitalFairnessMetrics(nodes, latestAccuracy),
    [nodes, latestAccuracy]
  );

  const avgLift = useMemo(() => {
    if (fairnessRows.length === 0) return 0;
    const total = fairnessRows.reduce((sum, r) => sum + r.accuracyGain, 0);
    return Number((total / fairnessRows.length).toFixed(1));
  }, [fairnessRows]);

  return (
    <div className="space-y-6">
      {/* Section 1: Interactive Privacy Attack Resilience Lab */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-teal-700 mb-1">
              <Sliders className="w-3.5 h-3.5 shrink-0" />
              <span>Differential Privacy Stress Test</span>
            </div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Attack Resilience Simulator
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Tune gradient clipping and Gaussian noise to test how well your hospital enclave
              resists Membership Inference and Gradient Inversion attacks.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setClippingNorm(0.7);
                setNoiseMultiplier(1.65);
              }}
              className="px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 cursor-pointer"
            >
              Strict Privacy
            </button>
            <button
              type="button"
              onClick={() => {
                setClippingNorm(1.0);
                setNoiseMultiplier(1.15);
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              Balanced Clinical
            </button>
            <button
              type="button"
              onClick={() => {
                setClippingNorm(2.2);
                setNoiseMultiplier(0.55);
              }}
              className="px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 cursor-pointer"
            >
              Low Noise (Weak Defense)
            </button>
          </div>

          <div className="space-y-4 pt-1">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="lab-clip" className="font-medium text-slate-700">
                  L2 Gradient Clipping Bound (C)
                </label>
                <span className="font-mono tabular-nums text-slate-900">
                  {clippingNorm.toFixed(2)}
                </span>
              </div>
              <input
                id="lab-clip"
                type="range"
                min={0.4}
                max={3.0}
                step={0.1}
                value={clippingNorm}
                onChange={(e) => setClippingNorm(Number(e.target.value))}
                className="w-full accent-teal-700"
              />
              <p className="text-[11px] text-slate-500 mt-0.5">
                Lower C caps how much any single patient record can influence outbound weights.
              </p>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="lab-noise" className="font-medium text-slate-700">
                  Gaussian Noise Multiplier (σ)
                </label>
                <span className="font-mono tabular-nums text-slate-900">
                  {noiseMultiplier.toFixed(2)}
                </span>
              </div>
              <input
                id="lab-noise"
                type="range"
                min={0.4}
                max={2.5}
                step={0.05}
                value={noiseMultiplier}
                onChange={(e) => setNoiseMultiplier(Number(e.target.value))}
                className="w-full accent-teal-700"
              />
              <p className="text-[11px] text-slate-500 mt-0.5">
                Higher σ masks individual biomarker signatures while slightly trading off utility.
              </p>
            </div>
          </div>
        </section>

        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                Simulated Adversarial Leakage &amp; Utility Telemetry
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Real-time privacy defense profile for C = {clippingNorm.toFixed(2)} and σ ={' '}
                {noiseMultiplier.toFixed(2)}
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm font-semibold">
              {resilience.defenseGrade === 'Strong' ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Defense Grade: Strong</span>
                </span>
              ) : resilience.defenseGrade === 'Moderate' ? (
                <span className="inline-flex items-center gap-1.5 text-amber-700">
                  <Lock className="w-4 h-4" />
                  <span>Defense Grade: Moderate</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-rose-700">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Defense Grade: Weak</span>
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500">Membership Inference Risk</p>
              <p
                className={`text-2xl font-mono font-bold tabular-nums mt-1 ${
                  resilience.miaRiskPercent >= 18
                    ? 'text-rose-700'
                    : resilience.miaRiskPercent >= 9
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                }`}
              >
                {resilience.miaRiskPercent.toFixed(1)}%
              </p>
              <div className="w-full h-1.5 bg-slate-200 rounded-sm mt-2 overflow-hidden">
                <div
                  className={`h-full ${
                    resilience.miaRiskPercent >= 18
                      ? 'bg-rose-600'
                      : resilience.miaRiskPercent >= 9
                        ? 'bg-amber-500'
                        : 'bg-emerald-600'
                  }`}
                  style={{ width: `${Math.min(100, resilience.miaRiskPercent * 2)}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500">Gradient Inversion Risk</p>
              <p
                className={`text-2xl font-mono font-bold tabular-nums mt-1 ${
                  resilience.inversionRiskPercent >= 22
                    ? 'text-rose-700'
                    : resilience.inversionRiskPercent >= 11
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                }`}
              >
                {resilience.inversionRiskPercent.toFixed(1)}%
              </p>
              <div className="w-full h-1.5 bg-slate-200 rounded-sm mt-2 overflow-hidden">
                <div
                  className={`h-full ${
                    resilience.inversionRiskPercent >= 22
                      ? 'bg-rose-600'
                      : resilience.inversionRiskPercent >= 11
                        ? 'bg-amber-500'
                        : 'bg-emerald-600'
                  }`}
                  style={{ width: `${Math.min(100, resilience.inversionRiskPercent * 1.6)}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500">Model Utility Retention</p>
              <p className="text-2xl font-mono font-bold tabular-nums text-teal-700 mt-1">
                {resilience.utilityRetentionPercent.toFixed(1)}%
              </p>
              <div className="w-full h-1.5 bg-slate-200 rounded-sm mt-2 overflow-hidden">
                <div
                  className="h-full bg-teal-600"
                  style={{ width: `${resilience.utilityRetentionPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div
            className={`p-3.5 rounded-lg border text-xs leading-relaxed ${
              resilience.defenseGrade === 'Strong'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : resilience.defenseGrade === 'Moderate'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <strong className="font-semibold">Privacy Officer Guidance:</strong>{' '}
            {resilience.recommendation}
          </div>
        </section>
      </div>

      {/* Section 2: Cross-Hospital Fairness & Non-IID Accuracy Lift Explorer */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <BarChart3 className="w-4 h-4 text-teal-700 shrink-0 mt-1" />
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Cross-Hospital Fairness &amp; Non-IID Lift Explorer
              </h3>
              <p className="text-xs text-slate-600">
                Compares each hospital&apos;s isolated single-site accuracy against collaborative
                federated accuracy (average consortium lift:{' '}
                <strong className="font-mono text-emerald-700">+{avgLift.toFixed(1)}%</strong>)
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            Global Baseline: {latestAccuracy.toFixed(1)}%
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <th className="py-2.5 px-4">Hospital Enclave</th>
                <th className="py-2.5 px-3 text-right">Local Cohort</th>
                <th className="py-2.5 px-3 text-right">Non-IID Skew</th>
                <th className="py-2.5 px-3 text-right">Isolated Local Acc</th>
                <th className="py-2.5 px-3 text-right">Federated Acc</th>
                <th className="py-2.5 px-4 text-right">Collaboration Gain</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {fairnessRows.map((row) => (
                <tr key={row.nodeId} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900 text-sm">{row.name}</div>
                    <div className="text-xs text-slate-500">{row.region}</div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                    {row.sampleCount.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                    {row.nonIidSkew.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                    {row.isolatedLocalAccuracy.toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-teal-800">
                    {row.federatedAccuracy.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                    +{row.accuracyGain.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
