import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  Building2,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  FileJson,
  FileText,
  Plus,
  RotateCcw,
  Shield,
  ShieldAlert,
  Users,
} from 'lucide-react';
import type {
  AlertThresholds,
  AuditLog,
  ComplianceExportOptions,
  HospitalNode,
  NodeHealthReport,
  NodeStatus,
  TrainingRound,
  UserProfile,
  UserRole,
} from '../types/federated';
import {
  buildComplianceReport,
  DEFAULT_COMPLIANCE_EXPORT_OPTIONS,
} from '../utils/federatedEngine';
import { generateCompliancePdfBlob } from '../utils/compliancePdf';

interface NodeAndUserGovernanceProps {
  nodes: HospitalNode[];
  rounds: TrainingRound[];
  users: UserProfile[];
  auditLogs: AuditLog[];
  currentUser: {
    uid: string;
    displayName: string;
    role: UserRole;
    authMode: 'firebase' | 'sandbox';
  };
  healthReport: NodeHealthReport;
  alertThresholds: AlertThresholds;
  onUpdateAlertThresholds: (next: AlertThresholds) => void;
  onUpdateNodeStatus: (nodeId: string, status: NodeStatus) => Promise<void>;
  onExtendPrivacyCap: (nodeId: string, deltaEpsilon: number) => Promise<void>;
  onSimulateNodeAnomaly: (
    nodeId: string,
    mode: 'accuracy_drop' | 'budget_breach' | 'restore'
  ) => Promise<void>;
  onRegisterNode: (node: {
    name: string;
    department: string;
    region: string;
    privacyBudgetCap: number;
  }) => Promise<void>;
  onToggleUserRole: (targetUid: string, nextRole: UserRole) => Promise<void>;
  onRecordComplianceExport: (meta: {
    reportId: string;
    summary: string;
    integrityHash: string;
    actionType?: 'COMPLIANCE_REPORT_EXPORTED' | 'COMPLIANCE_PDF_EXPORTED';
  }) => Promise<void>;
}

export const NodeAndUserGovernance: React.FC<NodeAndUserGovernanceProps> = ({
  nodes,
  rounds,
  users,
  auditLogs,
  currentUser,
  healthReport,
  alertThresholds,
  onUpdateAlertThresholds,
  onUpdateNodeStatus,
  onExtendPrivacyCap,
  onSimulateNodeAnomaly,
  onRegisterNode,
  onToggleUserRole,
  onRecordComplianceExport,
}) => {
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [nodeName, setNodeName] = useState('');
  const [department, setDepartment] = useState('');
  const [region, setRegion] = useState('');
  const [cap, setCap] = useState('8.0');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [acknowledgedKeys, setAcknowledgedKeys] = useState<Record<string, string>>({});
  const [selectedTestNodeId, setSelectedTestNodeId] = useState<string>(
    nodes[1]?.nodeId || nodes[0]?.nodeId || 'node_zurich_oncology'
  );
  const [busyActionId, setBusyActionId] = useState<string | null>(null);

  const [exportOptions, setExportOptions] = useState<ComplianceExportOptions>(
    DEFAULT_COMPLIANCE_EXPORT_OPTIONS
  );
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'json' | 'pdf' | null>(null);
  const [lastExportStatus, setLastExportStatus] = useState<{
    format: 'JSON' | 'PDF';
    filename: string;
    sizeKb: string;
    digest: string;
    auditCount: number;
    roundCount: number;
    pageCount?: number;
  } | null>(null);

  const availableActionTypes = useMemo(() => {
    const types = Array.from(new Set(auditLogs.map((l) => l.actionType)));
    types.sort();
    return types;
  }, [auditLogs]);

  const filteredAuditCount = useMemo(() => {
    return auditLogs.filter(
      (l) =>
        exportOptions.actionTypeFilter === 'ALL' ||
        l.actionType === exportOptions.actionTypeFilter
    ).length;
  }, [auditLogs, exportOptions.actionTypeFilter]);

  const hasValidExportSelection =
    exportOptions.includeAuditLogs ||
    exportOptions.includeTrainingRounds ||
    exportOptions.includeNodeHealthSummary;

  const previewPackage = useMemo(() => {
    if (!hasValidExportSelection) return null;
    return buildComplianceReport({
      nodes,
      rounds,
      auditLogs,
      healthReport,
      alertThresholds,
      exportedBy: currentUser,
      options: exportOptions,
    });
  }, [
    hasValidExportSelection,
    nodes,
    rounds,
    auditLogs,
    healthReport,
    alertThresholds,
    currentUser,
    exportOptions,
  ]);

  const triggerBrowserDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleExportComplianceJson = async (overrideOptions?: ComplianceExportOptions) => {
    const opts = overrideOptions ?? exportOptions;
    if (
      !opts.includeAuditLogs &&
      !opts.includeTrainingRounds &&
      !opts.includeNodeHealthSummary
    ) {
      return;
    }

    setExportingFormat('json');
    try {
      const { report, jsonText, filename } = buildComplianceReport({
        nodes,
        rounds,
        auditLogs,
        healthReport,
        alertThresholds,
        exportedBy: currentUser,
        options: opts,
      });

      const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
      triggerBrowserDownload(blob, filename);

      const roundCount = report.trainingRoundSummaries?.length ?? 0;
      const auditCount = report.auditLogs?.length ?? 0;
      const sizeKb = (blob.size / 1024).toFixed(1);

      setLastExportStatus({
        format: 'JSON',
        filename,
        sizeKb,
        digest: report.integrityDigest,
        auditCount,
        roundCount,
      });

      await onRecordComplianceExport({
        reportId: report.reportId,
        actionType: 'COMPLIANCE_REPORT_EXPORTED',
        summary: `Exported JSON compliance report (${auditCount} audit logs, ${roundCount} training rounds) for regulatory record-keeping.`,
        integrityHash: report.integrityDigest,
      });
    } finally {
      setExportingFormat(null);
    }
  };

  const handleExportCompliancePdf = async (overrideOptions?: ComplianceExportOptions) => {
    const opts = overrideOptions ?? exportOptions;
    if (
      !opts.includeAuditLogs &&
      !opts.includeTrainingRounds &&
      !opts.includeNodeHealthSummary
    ) {
      return;
    }

    setExportingFormat('pdf');
    try {
      const { report } = buildComplianceReport({
        nodes,
        rounds,
        auditLogs,
        healthReport,
        alertThresholds,
        exportedBy: currentUser,
        options: opts,
      });

      const { blob, filename, pageCount } = generateCompliancePdfBlob(report);
      triggerBrowserDownload(blob, filename);

      const roundCount = report.trainingRoundSummaries?.length ?? 0;
      const auditCount = report.auditLogs?.length ?? 0;
      const sizeKb = (blob.size / 1024).toFixed(1);

      setLastExportStatus({
        format: 'PDF',
        filename,
        sizeKb,
        digest: report.integrityDigest,
        auditCount,
        roundCount,
        pageCount,
      });

      await onRecordComplianceExport({
        reportId: report.reportId,
        actionType: 'COMPLIANCE_PDF_EXPORTED',
        summary: `Generated ${pageCount}-page printable PDF audit summary (${auditCount} audit logs, ${roundCount} training rounds) for regulatory filing.`,
        integrityHash: report.integrityDigest,
      });
    } finally {
      setExportingFormat(null);
    }
  };

  const visibleAlerts = useMemo(() => {
    return healthReport.alerts.filter((alert) => {
      const ackSignature = acknowledgedKeys[alert.alertId];
      return ackSignature !== alert.metricSummary;
    });
  }, [healthReport.alerts, acknowledgedKeys]);

  const hiddenCount = healthReport.alerts.length - visibleAlerts.length;

  const handleAcknowledge = (alertId: string, metricSummary: string) => {
    setAcknowledgedKeys((prev) => ({
      ...prev,
      [alertId]: metricSummary,
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const numCap = Number(cap);
    if (nodeName.trim().length < 2 || department.trim().length < 2 || region.trim().length < 2) {
      setFormError('Institution name, department, and region are required.');
      return;
    }
    if (Number.isNaN(numCap) || numCap <= 0 || numCap > 50) {
      setFormError('Privacy budget cap must be between 0.5 and 50.0 ε.');
      return;
    }

    setSubmitting(true);
    try {
      await onRegisterNode({
        name: nodeName.trim(),
        department: department.trim(),
        region: region.trim(),
        privacyBudgetCap: numCap,
      });
      setNodeName('');
      setDepartment('');
      setRegion('');
      setShowRegisterModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const runAction = async (key: string, fn: () => Promise<void>) => {
    setBusyActionId(key);
    try {
      await fn();
    } finally {
      setBusyActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Automated Node Health Alert System */}
      <section
        aria-label="Automated node health alert system"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <BellRing className="w-4 h-4 text-teal-700 shrink-0 mt-1" />
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Automated Node Health Alert System
              </h2>
              <p className="text-xs text-slate-600">
                Continuously monitors every hospital enclave for significant local accuracy drops
                and privacy budget cap breaches.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <label htmlFor="thresh-acc" className="text-slate-600 font-medium whitespace-nowrap">
                Accuracy Drop ≥
              </label>
              <select
                id="thresh-acc"
                value={alertThresholds.accuracyDropPercent}
                onChange={(e) =>
                  onUpdateAlertThresholds({
                    ...alertThresholds,
                    accuracyDropPercent: Number(e.target.value),
                  })
                }
                className="px-2 py-1 font-mono bg-slate-50 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value={3}>3.0%</option>
                <option value={5}>5.0%</option>
                <option value={8}>8.0%</option>
                <option value={10}>10.0%</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="thresh-priv" className="text-slate-600 font-medium whitespace-nowrap">
                Privacy Warning ≥
              </label>
              <select
                id="thresh-priv"
                value={alertThresholds.privacyWarningPercent}
                onChange={(e) =>
                  onUpdateAlertThresholds({
                    ...alertThresholds,
                    privacyWarningPercent: Number(e.target.value),
                  })
                }
                className="px-2 py-1 font-mono bg-slate-50 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value={70}>70%</option>
                <option value={80}>80%</option>
                <option value={90}>90%</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Metrics & Anomaly Test Controls */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <p className="text-slate-500">Critical Anomalies</p>
              <p className="text-lg font-mono font-bold tabular-nums text-rose-700">
                {healthReport.criticalCount}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Health Warnings</p>
              <p className="text-lg font-mono font-bold tabular-nums text-amber-700">
                {healthReport.warningCount}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Flagged Enclaves</p>
              <p className="text-lg font-mono font-bold tabular-nums text-slate-900">
                {healthReport.affectedNodeCount} / {nodes.length}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Healthy Enclaves</p>
              <p className="text-lg font-mono font-bold tabular-nums text-emerald-700">
                {healthReport.healthyNodeCount}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Target node for anomaly check"
              value={selectedTestNodeId}
              onChange={(e) => setSelectedTestNodeId(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              {nodes.map((n) => (
                <option key={n.nodeId} value={n.nodeId}>
                  {n.name.split(' ').slice(0, 3).join(' ')}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busyActionId !== null}
              onClick={() =>
                void runAction('sim_acc', () =>
                  onSimulateNodeAnomaly(selectedTestNodeId, 'accuracy_drop')
                )
              }
              className="px-2.5 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 whitespace-nowrap cursor-pointer"
            >
              Simulate Accuracy Drop
            </button>
            <button
              type="button"
              disabled={busyActionId !== null}
              onClick={() =>
                void runAction('sim_priv', () =>
                  onSimulateNodeAnomaly(selectedTestNodeId, 'budget_breach')
                )
              }
              className="px-2.5 py-1.5 text-xs font-medium text-rose-800 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 whitespace-nowrap cursor-pointer"
            >
              Simulate Budget Breach
            </button>
            <button
              type="button"
              disabled={busyActionId !== null}
              onClick={() =>
                void runAction('sim_restore', () =>
                  onSimulateNodeAnomaly(selectedTestNodeId, 'restore')
                )
              }
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-teal-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restore Baseline</span>
            </button>
          </div>
        </div>

        {/* Active Alert List */}
        <div className="p-6 space-y-3">
          {hiddenCount > 0 && (
            <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
              <span>{hiddenCount} acknowledged alert(s) hidden</span>
              <button
                type="button"
                onClick={() => setAcknowledgedKeys({})}
                className="text-teal-700 font-medium hover:underline cursor-pointer"
              >
                Show All Alerts
              </button>
            </div>
          )}

          {visibleAlerts.length === 0 ? (
            <div className="p-6 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-sm text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <p className="font-semibold">All monitored hospital enclaves within policy bounds</p>
                <p className="text-xs text-emerald-800 mt-0.5">
                  No active local accuracy drops or privacy budget cap violations detected under
                  current thresholds.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleAlerts.map((alert) => {
                const targetNode = nodes.find((n) => n.nodeId === alert.nodeId);
                const isCritical = alert.severity === 'critical';
                const isPrivacyAlert =
                  alert.category === 'privacy_budget_exceeded' ||
                  alert.category === 'privacy_budget_warning';

                return (
                  <div
                    key={alert.alertId}
                    role="region"
                    aria-label={`${alert.severity} alert for ${alert.nodeName}`}
                    className={`p-4 rounded-xl border flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                      isCritical
                        ? 'bg-rose-50/70 border-rose-200'
                        : 'bg-amber-50/60 border-amber-200'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`inline-flex items-center gap-1 font-mono font-bold ${
                            isCritical ? 'text-rose-800' : 'text-amber-800'
                          }`}
                        >
                          {isCritical ? (
                            <ShieldAlert className="w-3.5 h-3.5" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          )}
                          <span>{isCritical ? 'CRITICAL' : 'WARNING'}</span>
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="font-semibold text-slate-900">{alert.title}</span>
                        <span className="text-slate-400">·</span>
                        <span className="font-mono text-slate-700">{alert.metricSummary}</span>
                      </div>

                      <p className="text-xs text-slate-800 leading-relaxed">{alert.detail}</p>
                      <p className="text-[11px] text-slate-600">
                        <strong className="font-medium text-slate-800">Recommended Action:</strong>{' '}
                        {alert.recommendedAction}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {isPrivacyAlert && (
                        <button
                          type="button"
                          disabled={busyActionId !== null}
                          onClick={() =>
                            void runAction(`cap_${alert.nodeId}`, () =>
                              onExtendPrivacyCap(alert.nodeId, 2.0)
                            )
                          }
                          className="px-3 py-1.5 text-xs font-semibold text-teal-800 bg-white border border-teal-300 rounded-lg hover:bg-teal-50 whitespace-nowrap cursor-pointer"
                        >
                          Extend ε Cap (+2.0)
                        </button>
                      )}

                      {targetNode && targetNode.status !== 'suspended' && (
                        <button
                          type="button"
                          disabled={busyActionId !== null}
                          onClick={() =>
                            void runAction(`quarantine_${alert.nodeId}`, () =>
                              onUpdateNodeStatus(alert.nodeId, 'suspended')
                            )
                          }
                          className="px-3 py-1.5 text-xs font-semibold text-rose-800 bg-white border border-rose-300 rounded-lg hover:bg-rose-50 whitespace-nowrap cursor-pointer"
                        >
                          Quarantine Node
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleAcknowledge(alert.alertId, alert.metricSummary)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap cursor-pointer"
                      >
                        Acknowledge
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Hospital Node Governance Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <Building2 className="w-4 h-4 text-teal-700 shrink-0 mt-1" />
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Federated Hospital Enclave Registry
              </h2>
              <p className="text-xs text-slate-500">
                Approve pending hospital nodes, inspect health anomalies, or quarantine anomalous
                nodes
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowRegisterModal((prev) => !prev)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showRegisterModal ? 'Cancel Registration' : 'Onboard Hospital Node'}</span>
          </button>
        </div>

        {showRegisterModal && (
          <form
            onSubmit={(e) => void handleRegister(e)}
            className="p-6 bg-slate-50 border-b border-slate-200 space-y-4"
          >
            {formError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800"
              >
                {formError}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="node-name" className="block text-xs font-medium text-slate-700 mb-1">
                  Hospital Institution Name
                </label>
                <input
                  id="node-name"
                  type="text"
                  placeholder="e.g. Mayo Precision Enclave"
                  value={nodeName}
                  onChange={(e) => setNodeName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <div>
                <label htmlFor="node-dept" className="block text-xs font-medium text-slate-700 mb-1">
                  Clinical Department
                </label>
                <input
                  id="node-dept"
                  type="text"
                  placeholder="e.g. Cardiology"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <div>
                <label htmlFor="node-reg" className="block text-xs font-medium text-slate-700 mb-1">
                  Data Residency Region
                </label>
                <input
                  id="node-reg"
                  type="text"
                  placeholder="e.g. Rochester, US-Midwest"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <div>
                <label htmlFor="node-cap" className="block text-xs font-medium text-slate-700 mb-1">
                  Epsilon Privacy Cap (ε)
                </label>
                <input
                  id="node-cap"
                  type="number"
                  step="0.5"
                  value={cap}
                  onChange={(e) => setCap(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Provisioning...' : 'Provision Active Enclave'}
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <th className="py-2.5 px-4 min-w-[210px]">Institution &amp; Region</th>
                <th className="py-2.5 px-3 text-right">Records</th>
                <th className="py-2.5 px-3 text-right">Local Acc</th>
                <th className="py-2.5 px-3 text-right">ε Used / Cap</th>
                <th className="py-2.5 px-3">Health Monitor</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-4">Governance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {nodes.map((node) => {
                const nodeHealth = healthReport.byNodeId[node.nodeId];
                const healthState = nodeHealth?.healthState || 'healthy';
                const rowTone =
                  healthState === 'critical'
                    ? 'bg-rose-50/70 hover:bg-rose-50'
                    : healthState === 'warning'
                      ? 'bg-amber-50/50 hover:bg-amber-50/80'
                      : 'hover:bg-slate-50';

                return (
                  <tr key={node.nodeId} className={rowTone}>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900 text-sm">{node.name}</div>
                      <div className="text-xs text-slate-500">
                        {node.department} · {node.region}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {node.localRecordCount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      <span
                        className={
                          nodeHealth?.alerts.some((a) => a.category === 'accuracy_drop')
                            ? 'font-semibold text-rose-700'
                            : 'text-slate-700'
                        }
                      >
                        {node.localAccuracy.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      <span
                        className={
                          node.privacyBudgetUsed > node.privacyBudgetCap
                            ? 'font-semibold text-rose-700'
                            : nodeHealth?.budgetUtilizationPercent >=
                                alertThresholds.privacyWarningPercent
                              ? 'font-semibold text-amber-700'
                              : 'text-slate-700'
                        }
                      >
                        {node.privacyBudgetUsed.toFixed(2)} / {node.privacyBudgetCap.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-xs">
                      {healthState === 'critical' ? (
                        <span className="font-semibold text-rose-700">
                          ✖ Critical ({nodeHealth.alerts.length})
                        </span>
                      ) : healthState === 'warning' ? (
                        <span className="font-semibold text-amber-700">
                          ▲ Warning ({nodeHealth.alerts.length})
                        </span>
                      ) : (
                        <span className="font-medium text-emerald-700">● Healthy</span>
                      )}
                      {nodeHealth && nodeHealth.alerts.length > 0 && (
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          {nodeHealth.alerts.map((a) => a.title).join(' · ')}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-xs font-medium whitespace-nowrap">
                      <span
                        className={
                          node.status === 'active'
                            ? 'text-emerald-700'
                            : node.status === 'pending'
                              ? 'text-amber-700'
                              : 'text-rose-700'
                        }
                      >
                        {node.status === 'active'
                          ? '● Active'
                          : node.status === 'pending'
                            ? '▲ Pending'
                            : '✖ Suspended'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        {node.status !== 'active' && (
                          <button
                            type="button"
                            onClick={() => void onUpdateNodeStatus(node.nodeId, 'active')}
                            className="px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 whitespace-nowrap cursor-pointer"
                          >
                            Approve
                          </button>
                        )}
                        {node.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => void onUpdateNodeStatus(node.nodeId, 'suspended')}
                            className="px-2.5 py-1 text-xs font-medium text-rose-800 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100 whitespace-nowrap cursor-pointer"
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Admin Compliance Record-Keeping Export */}
      <section
        aria-label="Compliance JSON export"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <FileJson className="w-4 h-4 text-teal-700 shrink-0 mt-1" />
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Compliance Record-Keeping Export (JSON &amp; PDF)
              </h2>
              <p className="text-xs text-slate-600">
                Package audit ledger events, federated training round summaries, and enclave privacy
                posture into a verifiable JSON artifact or printable PDF audit filing.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={!hasValidExportSelection}
              onClick={() => setShowJsonPreview((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap cursor-pointer"
            >
              {showJsonPreview ? (
                <EyeOff className="w-3.5 h-3.5" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
              <span>{showJsonPreview ? 'Hide Preview' : 'Preview JSON'}</span>
            </button>

            <button
              type="button"
              disabled={!hasValidExportSelection || exportingFormat !== null}
              onClick={() => void handleExportComplianceJson()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 disabled:opacity-40 whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exportingFormat === 'json' ? 'Exporting...' : 'Export Compliance JSON'}</span>
            </button>

            <button
              type="button"
              disabled={!hasValidExportSelection || exportingFormat !== null}
              onClick={() => void handleExportCompliancePdf()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{exportingFormat === 'pdf' ? 'Rendering PDF...' : 'Export Printable PDF'}</span>
            </button>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-5">
            <label className="inline-flex items-center gap-2 text-slate-800 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={exportOptions.includeAuditLogs}
                onChange={(e) =>
                  setExportOptions((prev) => ({
                    ...prev,
                    includeAuditLogs: e.target.checked,
                  }))
                }
                className="w-4 h-4 accent-teal-700 rounded cursor-pointer"
              />
              <span>
                Audit Logs{' '}
                <span className="font-mono text-slate-500">({filteredAuditCount})</span>
              </span>
            </label>

            <label className="inline-flex items-center gap-2 text-slate-800 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={exportOptions.includeTrainingRounds}
                onChange={(e) =>
                  setExportOptions((prev) => ({
                    ...prev,
                    includeTrainingRounds: e.target.checked,
                  }))
                }
                className="w-4 h-4 accent-teal-700 rounded cursor-pointer"
              />
              <span>
                Training Round Summaries{' '}
                <span className="font-mono text-slate-500">({rounds.length})</span>
              </span>
            </label>

            <label className="inline-flex items-center gap-2 text-slate-800 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={exportOptions.includeNodeHealthSummary}
                onChange={(e) =>
                  setExportOptions((prev) => ({
                    ...prev,
                    includeNodeHealthSummary: e.target.checked,
                  }))
                }
                className="w-4 h-4 accent-teal-700 rounded cursor-pointer"
              />
              <span>
                Node Health &amp; Privacy Posture{' '}
                <span className="font-mono text-slate-500">({nodes.length})</span>
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="export-action-filter" className="text-slate-600 font-medium whitespace-nowrap">
              Audit Action Filter
            </label>
            <select
              id="export-action-filter"
              value={exportOptions.actionTypeFilter}
              onChange={(e) =>
                setExportOptions((prev) => ({
                  ...prev,
                  actionTypeFilter: e.target.value,
                }))
              }
              className="px-2.5 py-1.5 font-mono text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="ALL">All Actions ({auditLogs.length})</option>
              {availableActionTypes.map((actionType) => (
                <option key={actionType} value={actionType}>
                  {actionType}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!hasValidExportSelection && (
          <div className="px-6 py-3 bg-amber-50 border-t border-amber-200 text-xs text-amber-800">
            Select at least one dataset (Audit Logs, Training Round Summaries, or Node Health
            Posture) to generate a compliance report.
          </div>
        )}

        {lastExportStatus && (
          <div
            role="status"
            className="px-6 py-3 bg-emerald-50 border-t border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                Downloaded {lastExportStatus.format}{' '}
                <strong className="font-mono">{lastExportStatus.filename}</strong> (
                {lastExportStatus.sizeKb} KB
                {lastExportStatus.pageCount ? ` · ${lastExportStatus.pageCount} page(s)` : ''} ·{' '}
                {lastExportStatus.auditCount} audit log(s), {lastExportStatus.roundCount} training
                round(s))
              </span>
            </div>
            <span className="font-mono text-[11px] text-emerald-800">
              Integrity Digest #{lastExportStatus.digest.slice(0, 12)}
            </span>
          </div>
        )}

        {showJsonPreview && previewPackage && (
          <div className="border-t border-slate-200 bg-slate-900 text-slate-100 p-4">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
              <span>Compliance JSON Preview ({previewPackage.filename})</span>
              <span>Schema v{previewPackage.report.schemaVersion} · Zero-PHI Verified</span>
            </div>
            <pre className="text-xs font-mono leading-relaxed max-h-72 overflow-auto whitespace-pre">
              {previewPackage.jsonText}
            </pre>
          </div>
        )}
      </section>

      {/* Bottom Split: User RBAC + Immutable Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-700" />
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                User &amp; Admin Access Control (RBAC)
              </h3>
              <p className="text-xs text-slate-500">
                Assign or revoke Consortium Admin privileges across verified accounts
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">Account</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-4">Access Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {users.map((usr) => {
                  const isSelf = usr.uid === currentUser.uid;
                  return (
                    <tr key={usr.uid} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-900 text-xs">{usr.displayName}</div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {usr.hospitalNodeId}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-xs font-medium">
                        <span
                          className={usr.role === 'admin' ? 'text-teal-700' : 'text-slate-700'}
                        >
                          {usr.role === 'admin' ? 'Consortium Admin' : 'Hospital User'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() =>
                            void onToggleUserRole(
                              usr.uid,
                              usr.role === 'admin' ? 'user' : 'admin'
                            )
                          }
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap cursor-pointer"
                        >
                          {isSelf
                            ? 'Current Session'
                            : usr.role === 'admin'
                              ? 'Demote to User'
                              : 'Promote to Admin'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Shield className="w-4 h-4 text-teal-700 shrink-0" />
              <div className="min-w-0">
                <h3 className="font-display text-base font-bold text-slate-900">
                  Cryptographic Compliance Audit Log
                </h3>
                <p className="text-xs text-slate-500">
                  Append-only integrity ledger for authentication, training, and compliance exports
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={exportingFormat !== null}
                onClick={() => void handleExportComplianceJson(DEFAULT_COMPLIANCE_EXPORT_OPTIONS)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
              <button
                type="button"
                disabled={exportingFormat !== null}
                onClick={() => void handleExportCompliancePdf(DEFAULT_COMPLIANCE_EXPORT_OPTIONS)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-200 max-h-80 overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Audit ledger will populate as federated actions occur.
              </div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.logId} className="px-5 py-3 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-slate-900">
                      {log.actionType} · {log.actorRole.toUpperCase()}
                    </span>
                    <span className="font-mono text-slate-400">
                      #{log.integrityHash.slice(0, 10)}
                    </span>
                  </div>
                  <p className="text-slate-600">{log.summary}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
