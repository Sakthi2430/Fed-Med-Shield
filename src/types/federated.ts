export type UserRole = 'user' | 'admin';
export type AccountStatus = 'active' | 'suspended';
export type NodeStatus = 'active' | 'pending' | 'suspended';
export type AggregationStrategy = 'FedAvg' | 'FedProx';
export type RiskTier = 'Low' | 'Moderate' | 'Elevated' | 'Critical';

export interface UserProfile {
  uid: string;
  displayName: string;
  hospitalNodeId: string;
  role: UserRole;
  status: AccountStatus;
  email?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface HospitalNode {
  nodeId: string;
  name: string;
  department: string;
  region: string;
  ownerUid: string;
  status: NodeStatus;
  localRecordCount: number;
  localAccuracy: number;
  privacyBudgetUsed: number;
  privacyBudgetCap: number;
  nonIidSkew: number;
  lastSyncRound: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface LocalPatientRecord {
  localId: string;
  nodeId: string;
  patientCode: string;
  age: number;
  systolicBp: number;
  ldlCholesterol: number;
  hba1c: number;
  egfr: number;
  troponin: number;
  diagnosisLabel: 0 | 1;
  recordedDate: string;
}

export interface TrainingRound {
  roundId: string;
  roundNumber: number;
  strategy: AggregationStrategy;
  globalAccuracy: number;
  globalLoss: number;
  aucRoc: number;
  f1Score: number;
  epsilonSpent: number;
  noiseMultiplier: number;
  participatingNodesCount: number;
  totalSamplesAggregated: number;
  aggregatorUid: string;
  status: 'open' | 'aggregated';
  modelHash: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface GradientUpdate {
  updateId: string;
  roundNumber: number;
  nodeId: string;
  submittedByUid: string;
  sampleCount: number;
  localEpochs: number;
  localAccuracy: number;
  localLoss: number;
  l2Norm: number;
  epsilonDelta: number;
  gradientDigest: string;
  weightDeltas: number[];
  phiScanPassed: boolean;
  status: 'pending' | 'aggregated';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AuditLog {
  logId: string;
  actorUid: string;
  actorRole: UserRole;
  actionType: string;
  targetId: string;
  summary: string;
  integrityHash: string;
  createdAt?: unknown;
}

export interface ModelWeights {
  bias: number;
  ageWeight: number;
  systolicBpWeight: number;
  ldlWeight: number;
  hba1cWeight: number;
  egfrWeight: number;
  troponinWeight: number;
}

export interface BiomarkerContribution {
  feature: string;
  valueLabel: string;
  impactScore: number;
  direction: 'risk-increasing' | 'protective';
}

export interface RiskInferenceResult {
  probabilityPercent: number;
  riskTier: RiskTier;
  confidence: number;
  contributions: BiomarkerContribution[];
}

export interface LocalTrainingResult {
  rawDeltas: number[];
  clippedNoisedDeltas: number[];
  l2Norm: number;
  localAccuracy: number;
  localLoss: number;
  epsilonDelta: number;
  gradientDigest: string;
  phiScanPassed: boolean;
}

export interface AuthSession {
  mode: 'firebase' | 'sandbox';
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  hospitalNodeId: string;
}

export type AlertSeverity = 'critical' | 'warning';
export type AlertCategory =
  | 'accuracy_drop'
  | 'privacy_budget_exceeded'
  | 'privacy_budget_warning';
export type NodeHealthState = 'healthy' | 'warning' | 'critical';

export interface AlertThresholds {
  accuracyDropPercent: number;
  privacyWarningPercent: number;
}

export interface NodeHealthAlert {
  alertId: string;
  nodeId: string;
  nodeName: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  detail: string;
  metricSummary: string;
  recommendedAction: string;
  detectedAtRound: number;
}

export interface NodeHealthSummaryItem {
  nodeId: string;
  healthState: NodeHealthState;
  alerts: NodeHealthAlert[];
  budgetUtilizationPercent: number;
  accuracyDeltaVsGlobal: number;
  historicalAccuracyDrop: number;
}

export interface NodeHealthReport {
  alerts: NodeHealthAlert[];
  byNodeId: Record<string, NodeHealthSummaryItem>;
  criticalCount: number;
  warningCount: number;
  affectedNodeCount: number;
  healthyNodeCount: number;
}

export interface ComplianceExportOptions {
  includeAuditLogs: boolean;
  includeTrainingRounds: boolean;
  includeNodeHealthSummary: boolean;
  actionTypeFilter: string;
}

export interface ComplianceReportPayload {
  schemaVersion: '1.0.0';
  reportId: string;
  generatedAtIso: string;
  exportedBy: {
    uid: string;
    displayName: string;
    role: UserRole;
    authMode: 'firebase' | 'sandbox';
  };
  consortiumSummary: {
    totalHospitalNodes: number;
    activeHospitalNodes: number;
    totalTrainingRounds: number;
    latestGlobalAccuracy: number;
    cumulativeEpsilonSpent: number;
    totalAuditEntriesIncluded: number;
    activeHealthAlerts: number;
    zeroPhiGuarantee: boolean;
  };
  nodeHealthPosture?: {
    thresholds: AlertThresholds;
    criticalCount: number;
    warningCount: number;
    nodes: Array<{
      nodeId: string;
      name: string;
      department: string;
      region: string;
      status: NodeStatus;
      localAccuracy: number;
      privacyBudgetUsed: number;
      privacyBudgetCap: number;
      healthState: NodeHealthState;
    }>;
    activeAlerts: NodeHealthAlert[];
  };
  trainingRoundSummaries?: TrainingRound[];
  auditLogs?: AuditLog[];
  integrityDigest: string;
}

export interface PerformanceSample {
  timestampLabel: string;
  heapUsedMb: number;
  heapLimitMb: number;
  memoryPercent: number;
  threadLoadPercent: number;
  frameLatencyMs: number;
  activeWorkers: number;
}

export interface PerformanceSummary {
  latest: PerformanceSample;
  avgMemoryMb: number;
  peakThreadLoadPercent: number;
  headroomState: 'Optimal' | 'Busy' | 'Saturated';
}

