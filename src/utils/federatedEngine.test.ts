import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateFedAvg,
  appendPerformanceSample,
  authenticateDemoCredentials,
  buildCompliancePdfSections,
  buildComplianceReport,
  buildInitialPerformanceHistory,
  clipAndNoiseGradients,
  computeConvergenceView,
  computeHospitalFairnessMetrics,
  computePrivacyHeatmap,
  DEFAULT_ALERT_THRESHOLDS,
  evaluateLocalPatientRisk,
  evaluateNodeHealthAlerts,
  generateLocalCohortForNode,
  INITIAL_GLOBAL_WEIGHTS,
  runLocalTrainingEpoch,
  sampleLocalEnginePerformance,
  scanPayloadForPhi,
  SEED_GRADIENT_UPDATES,
  SEED_HOSPITAL_NODES,
  SEED_TRAINING_ROUNDS,
  simulatePrivacyAttackResilience,
} from './federatedEngine';

test('scanPayloadForPhi passes clean differential privacy gradient payload', () => {
  const clean = {
    nodeId: 'node_st_jude_cardio',
    weightDeltas: [0.012, -0.004, 0.021, 0.009, -0.015, 0.002, 0.018],
    l2Norm: 0.84,
    epsilonDelta: 0.41,
  };
  const res = scanPayloadForPhi(clean);
  assert.equal(res.passed, true);
  assert.equal(res.violations.length, 0);
});

test('scanPayloadForPhi blocks raw patient identifiers, SSNs, emails, and oversized arrays', () => {
  const leaky = {
    nodeId: 'node_st_jude_cardio',
    patientName: 'Jane Doe',
    contact: 'patient@hospital.org',
    ssnPattern: '123-45-6789',
    weightDeltas: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  };
  const res = scanPayloadForPhi(leaky);
  assert.equal(res.passed, false);
  assert.ok(res.violations.length >= 4);
});

test('clipAndNoiseGradients caps L2 norm and outputs bounded deterministic deltas', () => {
  const largeGrads = [3.0, 4.0, 2.0, -2.5, 1.5, -1.0, 0.5];
  const res = clipAndNoiseGradients(largeGrads, 1.2, 1.0, 101);
  assert.equal(res.clippedNoisedDeltas.length, 7);
  assert.ok(res.l2Norm <= 1.2);
});

test('runLocalTrainingEpoch trains on local enclave records without leaking PHI', () => {
  const records = generateLocalCohortForNode('node_st_jude_cardio');
  const result = runLocalTrainingEpoch(records, INITIAL_GLOBAL_WEIGHTS, {
    localEpochs: 5,
    learningRate: 0.05,
    clippingNorm: 1.0,
    noiseMultiplier: 1.1,
    targetEpsilon: 0.5,
    nodeId: 'node_st_jude_cardio',
  });
  assert.equal(result.phiScanPassed, true);
  assert.equal(result.clippedNoisedDeltas.length, 7);
  assert.ok(result.localAccuracy >= 76 && result.localAccuracy <= 99);
  assert.ok(/^[a-f0-9]{32}$/.test(result.gradientDigest));
});

test('aggregateFedAvg computes sample-weighted global model update and advances round', () => {
  const lastRound = SEED_TRAINING_ROUNDS[SEED_TRAINING_ROUNDS.length - 1];
  const { nextWeights, nextRound } = aggregateFedAvg({
    pendingUpdates: SEED_GRADIENT_UPDATES,
    currentWeights: INITIAL_GLOBAL_WEIGHTS,
    lastRound,
    strategy: 'FedAvg',
    noiseMultiplier: 1.05,
    aggregatorUid: 'admin_coordinator_01',
  });

  assert.equal(nextRound.roundNumber, 6);
  assert.equal(nextRound.participatingNodesCount, 2);
  assert.equal(nextRound.totalSamplesAggregated, 4280 + 3640);
  assert.ok(nextRound.globalAccuracy >= lastRound.globalAccuracy);
  assert.ok(nextRound.epsilonSpent > lastRound.epsilonSpent);
  assert.notEqual(nextWeights.troponinWeight, INITIAL_GLOBAL_WEIGHTS.troponinWeight);
});

test('evaluateLocalPatientRisk differentiates high-risk and low-risk patients', () => {
  const records = generateLocalCohortForNode('node_st_jude_cardio');
  const highRisk = evaluateLocalPatientRisk(records[2], INITIAL_GLOBAL_WEIGHTS);
  const lowRisk = evaluateLocalPatientRisk(records[1], INITIAL_GLOBAL_WEIGHTS);

  assert.ok(highRisk.probabilityPercent > lowRisk.probabilityPercent);
  assert.equal(highRisk.contributions.length, 6);
  assert.ok(['Elevated', 'Critical'].includes(highRisk.riskTier));
  assert.equal(lowRisk.riskTier, 'Low');
});

test('computeConvergenceView filters by strategy and model version and calculates accuracy gains', () => {
  const allView = computeConvergenceView(SEED_TRAINING_ROUNDS, 'all', 'all');
  assert.equal(allView.points.length, 5);
  assert.equal(allView.cumulativeAccuracyGain, 12.7);

  const fedAvgOnly = computeConvergenceView(SEED_TRAINING_ROUNDS, 'FedAvg', 'all');
  assert.equal(fedAvgOnly.points.length, 3);
  assert.ok(fedAvgOnly.points.every((p) => p.strategy === 'FedAvg'));

  const v2Only = computeConvergenceView(SEED_TRAINING_ROUNDS, 'compare', 'v2.0');
  assert.equal(v2Only.points.length, 2);
  assert.ok(v2Only.points.every((p) => p.modelVersion === 'v2.0'));
  assert.ok(v2Only.latestStrategyAdvantage > 0);
});

test('computePrivacyHeatmap identifies privacy bottleneck node and aggregates consortium epsilon totals', () => {
  const heatmap = computePrivacyHeatmap(
    SEED_HOSPITAL_NODES,
    SEED_TRAINING_ROUNDS,
    SEED_GRADIENT_UPDATES
  );

  assert.equal(heatmap.rows.length, 4);
  assert.equal(heatmap.roundNumbers.length, 5);
  assert.equal(heatmap.bottleneckRow?.node.nodeId, 'node_st_jude_cardio');
  assert.equal(heatmap.bottleneckRow?.severity, 'Bottleneck');
  assert.ok(heatmap.totalEpsilonUsed > 0);
  assert.ok(heatmap.totalEpsilonCap > heatmap.totalEpsilonUsed);
  assert.ok(heatmap.consortiumUtilizationPercent > 0);
});

test('authenticateDemoCredentials validates user and admin demo credentials and rejects invalid input', () => {
  const userAuth = authenticateDemoCredentials('user@hospital.org', 'user123');
  assert.equal(userAuth.ok, true);
  if (userAuth.ok) assert.equal(userAuth.account.role, 'user');

  const adminAuth = authenticateDemoCredentials('admin', 'admin123');
  assert.equal(adminAuth.ok, true);
  if (adminAuth.ok) assert.equal(adminAuth.account.role, 'admin');

  const invalid = authenticateDemoCredentials('user@hospital.org', 'wrong');
  assert.equal(invalid.ok, false);

  const empty = authenticateDemoCredentials('', '');
  assert.equal(empty.ok, false);
});

test('simulatePrivacyAttackResilience reduces attack leakage as DP noise increases', () => {
  const weak = simulatePrivacyAttackResilience(2.5, 0.3);
  const strong = simulatePrivacyAttackResilience(1.0, 1.4);

  assert.equal(weak.defenseGrade, 'Weak');
  assert.equal(strong.defenseGrade, 'Strong');
  assert.ok(strong.miaRiskPercent < weak.miaRiskPercent);
  assert.ok(strong.inversionRiskPercent < weak.inversionRiskPercent);
});

test('computeHospitalFairnessMetrics computes positive accuracy gain from federation', () => {
  const fairness = computeHospitalFairnessMetrics(SEED_HOSPITAL_NODES, 92.1);
  assert.equal(fairness.length, 4);
  assert.ok(fairness.every((m) => m.accuracyGain > 0));
});

test('evaluateNodeHealthAlerts detects privacy budget cap exceedance and approaching threshold', () => {
  const nodes = SEED_HOSPITAL_NODES.map((n) =>
    n.nodeId === 'node_zurich_oncology'
      ? { ...n, privacyBudgetUsed: 8.6, privacyBudgetCap: 8.0 }
      : n
  );

  const report = evaluateNodeHealthAlerts(nodes, SEED_TRAINING_ROUNDS, SEED_GRADIENT_UPDATES);
  const zurichAlerts = report.byNodeId['node_zurich_oncology'].alerts;
  assert.equal(report.byNodeId['node_zurich_oncology'].healthState, 'critical');
  assert.ok(zurichAlerts.some((a) => a.category === 'privacy_budget_exceeded' && a.severity === 'critical'));

  // St. Jude is at 4.85 / 6.0 = 80.8% (warning)
  assert.equal(report.byNodeId['node_st_jude_cardio'].healthState, 'warning');
  assert.ok(
    report.byNodeId['node_st_jude_cardio'].alerts.some((a) => a.category === 'privacy_budget_warning')
  );
});

test('evaluateNodeHealthAlerts detects significant local accuracy drop vs global and historical peak', () => {
  const nodes = SEED_HOSPITAL_NODES.map((n) =>
    n.nodeId === 'node_st_jude_cardio'
      ? { ...n, localAccuracy: 81.0, privacyBudgetUsed: 1.0 }
      : n
  );

  const report = evaluateNodeHealthAlerts(nodes, SEED_TRAINING_ROUNDS, SEED_GRADIENT_UPDATES);
  const stJude = report.byNodeId['node_st_jude_cardio'];
  assert.equal(stJude.healthState, 'critical');
  assert.ok(stJude.historicalAccuracyDrop >= 11.0);
  assert.ok(stJude.alerts.some((a) => a.category === 'accuracy_drop' && a.severity === 'critical'));
});

test('evaluateNodeHealthAlerts reports healthy when nodes meet accuracy and budget thresholds', () => {
  const healthyNodes = SEED_HOSPITAL_NODES.map((n) => ({
    ...n,
    localAccuracy: 91.5,
    privacyBudgetUsed: 1.5,
    privacyBudgetCap: 8.0,
  }));

  const report = evaluateNodeHealthAlerts(healthyNodes, SEED_TRAINING_ROUNDS, []);
  assert.equal(report.alerts.length, 0);
  assert.equal(report.affectedNodeCount, 0);
  assert.equal(report.healthyNodeCount, healthyNodes.length);
});

test('buildComplianceReport generates deterministic JSON report with round summaries, audit logs, and digest', () => {
  const health = evaluateNodeHealthAlerts(
    SEED_HOSPITAL_NODES,
    SEED_TRAINING_ROUNDS,
    SEED_GRADIENT_UPDATES
  );
  const logs = [
    {
      logId: 'log_01',
      actorUid: 'admin_coordinator_01',
      actorRole: 'admin' as const,
      actionType: 'ROUND_AGGREGATED',
      targetId: 'round_005',
      summary: 'Round 5 completed.',
      integrityHash: 'e2f94b10c83a56d719f2b48e3c70a6d5',
    },
    {
      logId: 'log_02',
      actorUid: 'admin_coordinator_01',
      actorRole: 'admin' as const,
      actionType: 'PRIVACY_CAP_EXTENDED',
      targetId: 'node_st_jude_cardio',
      summary: 'Extended privacy cap.',
      integrityHash: '9a4f7c12d83e61b04a52e19c3b8d47f0',
    },
  ];

  const { report, jsonText, filename } = buildComplianceReport({
    nodes: SEED_HOSPITAL_NODES,
    rounds: SEED_TRAINING_ROUNDS,
    auditLogs: logs,
    healthReport: health,
    alertThresholds: DEFAULT_ALERT_THRESHOLDS,
    exportedBy: {
      uid: 'admin_coordinator_01',
      displayName: 'Dr. Elena Vance',
      role: 'admin',
      authMode: 'sandbox',
    },
    generatedAtIso: '2026-11-23T12:00:00.000Z',
  });

  assert.equal(report.schemaVersion, '1.0.0');
  assert.equal(report.consortiumSummary.zeroPhiGuarantee, true);
  assert.equal(report.consortiumSummary.totalTrainingRounds, 5);
  assert.equal(report.consortiumSummary.totalAuditEntriesIncluded, 2);
  assert.equal(report.trainingRoundSummaries?.length, 5);
  assert.equal(report.auditLogs?.length, 2);
  assert.ok(/^[a-f0-9]{32}$/.test(report.integrityDigest));
  assert.ok(filename.startsWith('fedmed-compliance-report-2026-11-23-'));
  assert.ok(filename.endsWith('.json'));

  const parsed = JSON.parse(jsonText);
  assert.equal(parsed.integrityDigest, report.integrityDigest);
  assert.equal(parsed.trainingRoundSummaries[0].roundNumber, 1);
});

test('buildComplianceReport respects audit action filter, optional sections, and rejects empty selection', () => {
  const health = evaluateNodeHealthAlerts(
    SEED_HOSPITAL_NODES,
    SEED_TRAINING_ROUNDS,
    SEED_GRADIENT_UPDATES
  );
  const logs = [
    {
      logId: 'log_01',
      actorUid: 'admin_coordinator_01',
      actorRole: 'admin' as const,
      actionType: 'ROUND_AGGREGATED',
      targetId: 'round_005',
      summary: 'Round 5 completed.',
      integrityHash: 'e2f94b10c83a56d719f2b48e3c70a6d5',
    },
    {
      logId: 'log_02',
      actorUid: 'admin_coordinator_01',
      actorRole: 'admin' as const,
      actionType: 'NODE_STATUS_CHANGED',
      targetId: 'node_zurich_oncology',
      summary: 'Suspended node.',
      integrityHash: '3c1e8b40f92a75d618e4c02a9b71d3e4',
    },
  ];

  const { report } = buildComplianceReport({
    nodes: SEED_HOSPITAL_NODES,
    rounds: SEED_TRAINING_ROUNDS,
    auditLogs: logs,
    healthReport: health,
    alertThresholds: DEFAULT_ALERT_THRESHOLDS,
    exportedBy: {
      uid: 'admin_coordinator_01',
      displayName: 'Dr. Elena Vance',
      role: 'admin',
      authMode: 'sandbox',
    },
    options: {
      includeAuditLogs: true,
      includeTrainingRounds: true,
      includeNodeHealthSummary: false,
      actionTypeFilter: 'NODE_STATUS_CHANGED',
    },
    generatedAtIso: '2026-11-23T12:00:00.000Z',
  });

  assert.equal(report.auditLogs?.length, 1);
  assert.equal(report.auditLogs?.[0].actionType, 'NODE_STATUS_CHANGED');
  assert.equal(report.nodeHealthPosture, undefined);
  assert.equal(report.trainingRoundSummaries?.length, 5);

  assert.throws(() =>
    buildComplianceReport({
      nodes: SEED_HOSPITAL_NODES,
      rounds: SEED_TRAINING_ROUNDS,
      auditLogs: logs,
      healthReport: health,
      alertThresholds: DEFAULT_ALERT_THRESHOLDS,
      exportedBy: {
        uid: 'admin_coordinator_01',
        displayName: 'Dr. Elena Vance',
        role: 'admin',
        authMode: 'sandbox',
      },
      options: {
        includeAuditLogs: false,
        includeTrainingRounds: false,
        includeNodeHealthSummary: false,
        actionTypeFilter: 'ALL',
      },
    })
  );
});

test('buildCompliancePdfSections shapes full and selective JSON reports for regulatory PDF filing', () => {
  const health = evaluateNodeHealthAlerts(
    SEED_HOSPITAL_NODES,
    SEED_TRAINING_ROUNDS,
    SEED_GRADIENT_UPDATES
  );
  const logs = [
    {
      logId: 'log_01',
      actorUid: 'admin_coordinator_01',
      actorRole: 'admin' as const,
      actionType: 'ROUND_AGGREGATED',
      targetId: 'round_005',
      summary: 'Round 5 completed.',
      integrityHash: 'e2f94b10c83a56d719f2b48e3c70a6d5',
    },
  ];

  const { report: fullReport } = buildComplianceReport({
    nodes: SEED_HOSPITAL_NODES,
    rounds: SEED_TRAINING_ROUNDS,
    auditLogs: logs,
    healthReport: health,
    alertThresholds: DEFAULT_ALERT_THRESHOLDS,
    exportedBy: {
      uid: 'admin_coordinator_01',
      displayName: 'Dr. Elena Vance',
      role: 'admin',
      authMode: 'sandbox',
    },
    generatedAtIso: '2026-11-23T12:00:00.000Z',
  });

  const fullPdf = buildCompliancePdfSections(fullReport);
  assert.ok(fullPdf.filename.endsWith('.pdf'));
  assert.equal(fullPdf.summaryCards.length, 8);
  assert.equal(fullPdf.nodePostureTable.included, true);
  assert.equal(fullPdf.nodePostureTable.rows.length, SEED_HOSPITAL_NODES.length);
  assert.equal(fullPdf.trainingRoundsTable.included, true);
  assert.equal(fullPdf.trainingRoundsTable.rows.length, SEED_TRAINING_ROUNDS.length);
  assert.equal(fullPdf.auditLogsTable.included, true);
  assert.equal(fullPdf.auditLogsTable.rows.length, 1);
  assert.ok(fullPdf.attestationLine.includes(fullReport.integrityDigest));

  const { report: partialReport } = buildComplianceReport({
    nodes: SEED_HOSPITAL_NODES,
    rounds: SEED_TRAINING_ROUNDS,
    auditLogs: logs,
    healthReport: health,
    alertThresholds: DEFAULT_ALERT_THRESHOLDS,
    exportedBy: {
      uid: 'admin_coordinator_01',
      displayName: 'Dr. Elena Vance',
      role: 'admin',
      authMode: 'sandbox',
    },
    options: {
      includeAuditLogs: true,
      includeTrainingRounds: false,
      includeNodeHealthSummary: false,
      actionTypeFilter: 'ALL',
    },
    generatedAtIso: '2026-11-23T12:00:00.000Z',
  });

  const partialPdf = buildCompliancePdfSections(partialReport);
  assert.equal(partialPdf.nodePostureTable.included, false);
  assert.equal(partialPdf.trainingRoundsTable.included, false);
  assert.equal(partialPdf.auditLogsTable.included, true);
});

test('sampleLocalEnginePerformance measures memory and thread load with training burst amplification', () => {
  const idleSample = sampleLocalEnginePerformance({
    localRecordCount: 8,
    roundCount: 5,
    usedJsHeapBytes: 48 * 1024 * 1024,
    jsHeapSizeLimitBytes: 512 * 1024 * 1024,
    eventLoopDriftMs: 2.0,
    computeDurationMs: 1.5,
    hardwareThreads: 8,
    trainingBurstActive: false,
    timestampLabel: '12:00:00',
    sampleIndex: 1,
  });

  const burstSample = sampleLocalEnginePerformance({
    localRecordCount: 8,
    roundCount: 5,
    usedJsHeapBytes: 56 * 1024 * 1024,
    jsHeapSizeLimitBytes: 512 * 1024 * 1024,
    eventLoopDriftMs: 14.0,
    computeDurationMs: 22.0,
    hardwareThreads: 8,
    trainingBurstActive: true,
    timestampLabel: '12:00:02',
    sampleIndex: 2,
  });

  assert.ok(idleSample.heapUsedMb >= 48);
  assert.equal(idleSample.heapLimitMb, 512);
  assert.ok(burstSample.threadLoadPercent > idleSample.threadLoadPercent);
  assert.ok(burstSample.activeWorkers >= idleSample.activeWorkers);
});

test('appendPerformanceSample enforces rolling maxPoints window and classifies headroom state', () => {
  const seed = buildInitialPerformanceHistory(5, 5, 18);
  assert.equal(seed.length, 18);

  const saturatedSample = sampleLocalEnginePerformance({
    localRecordCount: 10,
    roundCount: 6,
    eventLoopDriftMs: 32,
    computeDurationMs: 40,
    trainingBurstActive: true,
    timestampLabel: '12:00:30',
    sampleIndex: 19,
  });

  const { samples, summary } = appendPerformanceSample(seed, saturatedSample, 18);
  assert.equal(samples.length, 18);
  assert.equal(samples[samples.length - 1].timestampLabel, '12:00:30');
  assert.equal(summary.headroomState, 'Saturated');
  assert.ok(summary.peakThreadLoadPercent >= saturatedSample.threadLoadPercent);
});

