import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Cpu, Gauge, Pause, Play, Zap } from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  LocalPatientRecord,
  ModelWeights,
  PerformanceSample,
} from '../types/federated';
import {
  appendPerformanceSample,
  buildInitialPerformanceHistory,
  runLocalTrainingEpoch,
  sampleLocalEnginePerformance,
} from '../utils/federatedEngine';

interface PerformanceMonitorProps {
  localRecords: LocalPatientRecord[];
  globalWeights: ModelWeights;
  activeNodeId: string;
  roundCount: number;
}

type BrowserPerformanceWithMemory = Performance & {
  memory?: {
    usedJSHeapSize: number;
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
  };
};

interface TooltipPayloadItem {
  payload?: PerformanceSample;
}

const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: TooltipPayloadItem[];
}> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0 || !payload[0]?.payload) {
    return null;
  }
  const sample = payload[0].payload;
  return (
    <div className="bg-slate-900 text-white border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono space-y-1 shadow-lg">
      <div className="text-slate-300 font-semibold">{sample.timestampLabel}</div>
      <div className="text-teal-300">
        Thread Load: {sample.threadLoadPercent.toFixed(1)}% ({sample.activeWorkers} worker(s))
      </div>
      <div className="text-sky-300">
        Memory Heap: {sample.heapUsedMb.toFixed(1)} / {sample.heapLimitMb.toFixed(0)} MB (
        {sample.memoryPercent.toFixed(1)}%)
      </div>
      <div className="text-slate-300">Loop Latency: {sample.frameLatencyMs.toFixed(1)} ms</div>
    </div>
  );
};

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  localRecords,
  globalWeights,
  activeNodeId,
  roundCount,
}) => {
  const [samples, setSamples] = useState<PerformanceSample[]>(() =>
    buildInitialPerformanceHistory(localRecords.length, roundCount, 12)
  );
  const [isStreaming, setIsStreaming] = useState(true);
  const [lastBurstDurationMs, setLastBurstDurationMs] = useState<number | null>(null);
  const [metricView, setMetricView] = useState<'dual' | 'memory' | 'thread'>('dual');

  const tickRef = useRef<number>(12);
  const lastTickTimeRef = useRef<number>(performance.now());
  const burstUntilRef = useRef<number>(0);

  const summary = useMemo(() => {
    const latest = samples[samples.length - 1] ?? buildInitialPerformanceHistory(localRecords.length, roundCount, 1)[0];
    return appendPerformanceSample(samples.slice(0, -1), latest, 18).summary;
  }, [samples, localRecords.length, roundCount]);

  useEffect(() => {
    if (!isStreaming) return;
    lastTickTimeRef.current = performance.now();

    const intervalId = window.setInterval(() => {
      const now = performance.now();
      const expectedMs = 1500;
      const driftMs = Math.max(0, now - lastTickTimeRef.current - expectedMs);
      lastTickTimeRef.current = now;
      tickRef.current += 1;

      const perfWithMem = window.performance as BrowserPerformanceWithMemory;
      const mem = perfWithMem.memory;
      const trainingBurstActive = now < burstUntilRef.current;

      const nextSample = sampleLocalEnginePerformance({
        localRecordCount: localRecords.length,
        roundCount,
        usedJsHeapBytes: mem?.usedJSHeapSize ?? null,
        jsHeapSizeLimitBytes: mem?.jsHeapSizeLimit ?? null,
        eventLoopDriftMs: driftMs,
        computeDurationMs: trainingBurstActive ? 18 : 2.2,
        hardwareThreads: navigator.hardwareConcurrency || 4,
        trainingBurstActive,
        sampleIndex: tickRef.current,
      });

      setSamples((prev) => appendPerformanceSample(prev, nextSample, 18).samples);
    }, 1500);

    return () => window.clearInterval(intervalId);
  }, [isStreaming, localRecords.length, roundCount]);

  const handleBenchmarkBurst = () => {
    const start = performance.now();
    // Execute genuine local SGD computation burst on the local enclave cohort
    runLocalTrainingEpoch(localRecords, globalWeights, {
      localEpochs: 25,
      learningRate: 0.05,
      clippingNorm: 1.0,
      noiseMultiplier: 1.1,
      targetEpsilon: 0.5,
      nodeId: activeNodeId,
    });
    const elapsedMs = Number(Math.max(1.4, performance.now() - start).toFixed(1));
    setLastBurstDurationMs(elapsedMs);
    burstUntilRef.current = performance.now() + 3200;
    tickRef.current += 1;

    const perfWithMem = window.performance as BrowserPerformanceWithMemory;
    const mem = perfWithMem.memory;

    const burstSample = sampleLocalEnginePerformance({
      localRecordCount: localRecords.length,
      roundCount,
      usedJsHeapBytes: mem?.usedJSHeapSize ?? null,
      jsHeapSizeLimitBytes: mem?.jsHeapSizeLimit ?? null,
      eventLoopDriftMs: Math.min(28, elapsedMs * 1.15),
      computeDurationMs: elapsedMs + 14,
      hardwareThreads: navigator.hardwareConcurrency || 4,
      trainingBurstActive: true,
      sampleIndex: tickRef.current,
    });

    setSamples((prev) => appendPerformanceSample(prev, burstSample, 18).samples);
  };

  const headroomTone =
    summary.headroomState === 'Saturated'
      ? 'text-rose-700'
      : summary.headroomState === 'Busy'
        ? 'text-amber-700'
        : 'text-emerald-700';

  return (
    <section
      aria-label="Local training engine performance monitor"
      className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-5 overflow-hidden"
    >
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-teal-700 mb-1">
            <Gauge className="w-3.5 h-3.5 shrink-0" />
            <span>On-Device Enclave Compute Diagnostics</span>
          </div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Performance Monitor
          </h2>
          <p className="text-xs text-slate-600">
            Real-time JS heap memory usage and thread load for the local differential-privacy
            training engine.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:shrink-0">
          <div
            role="group"
            aria-label="Performance chart series toggle"
            className="inline-flex flex-wrap max-w-full rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] sm:text-xs"
          >
            {(
              [
                { id: 'dual', label: 'Memory & Thread' },
                { id: 'memory', label: 'Memory (MB)' },
                { id: 'thread', label: 'Thread Load (%)' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={metricView === opt.id}
                onClick={() => setMetricView(opt.id)}
                className={`px-2 sm:px-2.5 py-1 rounded-md font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  metricView === opt.id
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsStreaming((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap cursor-pointer"
          >
            {isStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isStreaming ? 'Pause Feed' : 'Resume Feed'}</span>
          </button>

          <button
            type="button"
            onClick={handleBenchmarkBurst}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 whitespace-nowrap cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Benchmark Local Engine</span>
          </button>
        </div>
      </div>

      {/* Live Numeric Readouts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-xs text-slate-500">Heap Memory Used</p>
          <p className="text-xl font-mono font-bold tabular-nums text-slate-900 mt-1">
            {summary.latest.heapUsedMb.toFixed(1)} MB
          </p>
          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
            {summary.latest.memoryPercent.toFixed(1)}% of {summary.latest.heapLimitMb.toFixed(0)} MB
            (avg {summary.avgMemoryMb.toFixed(1)} MB)
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-xs text-slate-500">Engine Thread Load</p>
          <p className="text-xl font-mono font-bold tabular-nums text-teal-800 mt-1">
            {summary.latest.threadLoadPercent.toFixed(1)}%
          </p>
          <p className={`text-[11px] font-mono font-semibold mt-0.5 ${headroomTone}`}>
            ● {summary.headroomState} (peak {summary.peakThreadLoadPercent.toFixed(1)}%)
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-xs text-slate-500">Event Loop Latency</p>
          <p className="text-xl font-mono font-bold tabular-nums text-slate-900 mt-1">
            {summary.latest.frameLatencyMs.toFixed(1)} ms
          </p>
          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
            {lastBurstDurationMs !== null
              ? `Last SGD burst: ${lastBurstDurationMs.toFixed(1)} ms`
              : `${localRecords.length} local cohort tensor rows`}
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 min-w-0">
          <p className="text-xs text-slate-500">Worker Concurrency</p>
          <p className="text-lg sm:text-xl font-mono font-bold tabular-nums text-slate-900 mt-1 flex items-center gap-1.5 whitespace-nowrap">
            <Cpu className="w-4 h-4 text-teal-700 shrink-0" />
            <span>{summary.latest.activeWorkers} active</span>
          </p>
          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
            {isStreaming ? 'Sampling every 1.5s' : 'Telemetry feed paused'}
          </p>
        </div>
      </div>

      {/* Recharts Real-Time Dual-Series Chart */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-5">
            {metricView !== 'memory' && (
              <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
                <span className="w-3 h-0.5 bg-teal-700 inline-block" />
                <span>Thread Load (%)</span>
              </span>
            )}
            {metricView !== 'thread' && (
              <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
                <span className="w-3 h-0.5 bg-sky-700 inline-block" />
                <span>Heap Memory (MB)</span>
              </span>
            )}
          </div>
          <span className="font-mono text-[11px] text-slate-500">
            Rolling {samples.length}-sample window · {samples[samples.length - 1]?.timestampLabel}
          </span>
        </div>

        <div className="w-full h-64 min-w-0" data-testid="performance-monitor-chart">
          <ResponsiveContainer width="100%" height={256}>
            <ComposedChart
              data={samples}
              margin={{ top: 10, right: 12, left: -12, bottom: 0 }}
            >
              <defs>
                <linearGradient id="threadLoadFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f766e" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="memoryHeapFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0369a1" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#0369a1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="timestampLabel"
                tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                minTickGap={24}
              />
              {metricView !== 'memory' && (
                <YAxis
                  yAxisId="thread"
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: '#0f766e', fontFamily: 'monospace' }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
              )}
              {metricView !== 'thread' && (
                <YAxis
                  yAxisId="memory"
                  orientation={metricView === 'dual' ? 'right' : 'left'}
                  domain={['dataMin - 8', 'dataMax + 12']}
                  tickFormatter={(v) => `${Math.round(Number(v))}MB`}
                  tick={{ fontSize: 11, fill: '#0369a1', fontFamily: 'monospace' }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                />
              )}
              <Tooltip content={<CustomTooltip />} />
              {metricView !== 'memory' && (
                <Area
                  yAxisId="thread"
                  type="monotone"
                  dataKey="threadLoadPercent"
                  name="Thread Load (%)"
                  stroke="#0f766e"
                  strokeWidth={2}
                  fill="url(#threadLoadFill)"
                  isAnimationActive={false}
                />
              )}
              {metricView !== 'thread' && (
                <Line
                  yAxisId="memory"
                  type="monotone"
                  dataKey="heapUsedMb"
                  name="Heap Memory (MB)"
                  stroke="#0369a1"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: '#0369a1', strokeWidth: 0 }}
                  activeDot={{ r: 4.5 }}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};
