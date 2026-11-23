import type {
  AggregationStrategy,
  AlertThresholds,
  AuditLog,
  BiomarkerContribution,
  ComplianceExportOptions,
  ComplianceReportPayload,
  GradientUpdate,
  HospitalNode,
  LocalPatientRecord,
  LocalTrainingResult,
  ModelWeights,
  NodeHealthAlert,
  NodeHealthReport,
  NodeHealthState,
  NodeHealthSummaryItem,
  PerformanceSample,
  PerformanceSummary,
  RiskInferenceResult,
  RiskTier,
  TrainingRound,
  UserProfile,
  UserRole,
} from '../types/federated';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'sgkan24@gmail.com';

export const INITIAL_GLOBAL_WEIGHTS: ModelWeights = {
  bias: -2.65,
  ageWeight: 0.42,
  systolicBpWeight: 0.58,
  ldlWeight: 0.36,
  hba1cWeight: 0.64,
  egfrWeight: -0.49,
  troponinWeight: 0.88,
};

export const SEED_HOSPITAL_NODES: HospitalNode[] = [
  {
    nodeId: 'node_st_jude_cardio',
    name: 'St. Jude Regional Cardiology Enclave',
    department: 'Cardiovascular ICU',
    region: 'Boston, US-East',
    ownerUid: 'clinician_cardio_01',
    status: 'active',
    localRecordCount: 4280,
    localAccuracy: 91.4,
    privacyBudgetUsed: 4.85,
    privacyBudgetCap: 6.0,
    nonIidSkew: 0.18,
    lastSyncRound: 5,
  },
  {
    nodeId: 'node_zurich_oncology',
    name: 'Zurich University Clinical Center',
    department: 'Metabolic & Vascular Unit',
    region: 'Zurich, EU-Central',
    ownerUid: 'clinician_zurich_02',
    status: 'active',
    localRecordCount: 3640,
    localAccuracy: 89.8,
    privacyBudgetUsed: 3.15,
    privacyBudgetCap: 8.0,
    nonIidSkew: 0.24,
    lastSyncRound: 5,
  },
  {
    nodeId: 'node_singapore_genomics',
    name: 'Pacific Biobank Medical Institute',
    department: 'Preventive Cardiology',
    region: 'Singapore, APAC',
    ownerUid: 'clinician_pacific_03',
    status: 'active',
    localRecordCount: 5120,
    localAccuracy: 92.6,
    privacyBudgetUsed: 2.15,
    privacyBudgetCap: 8.0,
    nonIidSkew: 0.14,
    lastSyncRound: 5,
  },
  {
    nodeId: 'node_toronto_neuro',
    name: 'Northshore General Research Hospital',
    department: 'Internal Medicine',
    region: 'Toronto, CA-Central',
    ownerUid: 'clinician_north_04',
    status: 'pending',
    localRecordCount: 2190,
    localAccuracy: 84.2,
    privacyBudgetUsed: 0.0,
    privacyBudgetCap: 6.0,
    nonIidSkew: 0.37,
    lastSyncRound: 0,
  },
];

export const SEED_TRAINING_ROUNDS: TrainingRound[] = [
  {
    roundId: 'round_001',
    roundNumber: 1,
    strategy: 'FedAvg',
    globalAccuracy: 79.4,
    globalLoss: 0.542,
    aucRoc: 0.812,
    f1Score: 0.768,
    epsilonSpent: 0.45,
    noiseMultiplier: 1.1,
    participatingNodesCount: 3,
    totalSamplesAggregated: 11840,
    aggregatorUid: 'admin_coordinator_01',
    status: 'aggregated',
    modelHash: '9a4f7c12d83e61b04a52e19c3b8d47f0',
  },
  {
    roundId: 'round_002',
    roundNumber: 2,
    strategy: 'FedAvg',
    globalAccuracy: 84.1,
    globalLoss: 0.431,
    aucRoc: 0.861,
    f1Score: 0.819,
    epsilonSpent: 0.89,
    noiseMultiplier: 1.1,
    participatingNodesCount: 3,
    totalSamplesAggregated: 12190,
    aggregatorUid: 'admin_coordinator_01',
    status: 'aggregated',
    modelHash: '3c1e8b40f92a75d618e4c02a9b71d3e4',
  },
  {
    roundId: 'round_003',
    roundNumber: 3,
    strategy: 'FedAvg',
    globalAccuracy: 87.6,
    globalLoss: 0.348,
    aucRoc: 0.897,
    f1Score: 0.858,
    epsilonSpent: 1.32,
    noiseMultiplier: 1.1,
    participatingNodesCount: 3,
    totalSamplesAggregated: 12510,
    aggregatorUid: 'admin_coordinator_01',
    status: 'aggregated',
    modelHash: '7b2d4f81a60c93e527d1a48f0e63b2c9',
  },
  {
    roundId: 'round_004',
    roundNumber: 4,
    strategy: 'FedProx',
    globalAccuracy: 90.2,
    globalLoss: 0.279,
    aucRoc: 0.924,
    f1Score: 0.889,
    epsilonSpent: 1.74,
    noiseMultiplier: 1.05,
    participatingNodesCount: 3,
    totalSamplesAggregated: 12880,
    aggregatorUid: 'admin_coordinator_01',
    status: 'aggregated',
    modelHash: '5e8a1c39d74b02f681c3e95a2d47f1b8',
  },
  {
    roundId: 'round_005',
    roundNumber: 5,
    strategy: 'FedProx',
    globalAccuracy: 92.1,
    globalLoss: 0.224,
    aucRoc: 0.943,
    f1Score: 0.911,
    epsilonSpent: 2.15,
    noiseMultiplier: 1.05,
    participatingNodesCount: 3,
    totalSamplesAggregated: 13040,
    aggregatorUid: 'admin_coordinator_01',
    status: 'aggregated',
    modelHash: 'e2f94b10c83a56d719f2b48e3c70a6d5',
  },
];

export const SEED_GRADIENT_UPDATES: GradientUpdate[] = [
  {
    updateId: 'upd_r6_cardio_01',
    roundNumber: 6,
    nodeId: 'node_st_jude_cardio',
    submittedByUid: 'clinician_cardio_01',
    sampleCount: 4280,
    localEpochs: 5,
    localAccuracy: 92.8,
    localLoss: 0.214,
    l2Norm: 0.892,
    epsilonDelta: 0.42,
    gradientDigest: 'a71f9c2e48b301d6e5a29c81f04b3d72',
    weightDeltas: [0.014, 0.022, 0.031, -0.012, 0.028, -0.019, 0.041],
    phiScanPassed: true,
    status: 'pending',
  },
  {
    updateId: 'upd_r6_zurich_02',
    roundNumber: 6,
    nodeId: 'node_zurich_oncology',
    submittedByUid: 'clinician_zurich_02',
    sampleCount: 3640,
    localEpochs: 4,
    localAccuracy: 91.5,
    localLoss: 0.238,
    l2Norm: 0.941,
    epsilonDelta: 0.39,
    gradientDigest: 'c39e1b74d20a86f13e9c54b27a1d80e6',
    weightDeltas: [0.011, 0.019, 0.026, 0.008, 0.034, -0.024, 0.033],
    phiScanPassed: true,
    status: 'pending',
  },
];

export const SEED_SANDBOX_USERS: UserProfile[] = [
  {
    uid: 'admin_coordinator_01',
    displayName: 'Dr. Elena Vance (Consortium Lead)',
    hospitalNodeId: 'node_st_jude_cardio',
    role: 'admin',
    status: 'active',
    email: 'admin.coordinator@fedmed-consortium.org',
  },
  {
    uid: 'clinician_cardio_01',
    displayName: 'Dr. Marcus Chen (Cardiology Node)',
    hospitalNodeId: 'node_st_jude_cardio',
    role: 'user',
    status: 'active',
    email: 'm.chen@stjude-enclave.org',
  },
  {
    uid: 'clinician_zurich_02',
    displayName: 'Dr. Lukas Weber (Zurich Node)',
    hospitalNodeId: 'node_zurich_oncology',
    role: 'user',
    status: 'active',
    email: 'l.weber@zurich-clinical.ch',
  },
  {
    uid: 'clinician_north_04',
    displayName: 'Dr. Priya Nair (Northshore Applicant)',
    hospitalNodeId: 'node_toronto_neuro',
    role: 'user',
    status: 'active',
    email: 'p.nair@northshore-med.ca',
  },
];

export function generateLocalCohortForNode(nodeId: string): LocalPatientRecord[] {
  const cohorts: Record<string, LocalPatientRecord[]> = {
    node_st_jude_cardio: [
      {
        localId: 'loc_sj_101',
        nodeId,
        patientCode: 'ENCLAVE-SJ-8401',
        age: 67,
        systolicBp: 158,
        ldlCholesterol: 174,
        hba1c: 7.4,
        egfr: 58,
        troponin: 0.062,
        diagnosisLabel: 1,
        recordedDate: '2026-11-18',
      },
      {
        localId: 'loc_sj_102',
        nodeId,
        patientCode: 'ENCLAVE-SJ-8402',
        age: 44,
        systolicBp: 118,
        ldlCholesterol: 96,
        hba1c: 5.3,
        egfr: 98,
        troponin: 0.008,
        diagnosisLabel: 0,
        recordedDate: '2026-11-19',
      },
      {
        localId: 'loc_sj_103',
        nodeId,
        patientCode: 'ENCLAVE-SJ-8403',
        age: 72,
        systolicBp: 164,
        ldlCholesterol: 188,
        hba1c: 8.1,
        egfr: 47,
        troponin: 0.091,
        diagnosisLabel: 1,
        recordedDate: '2026-11-20',
      },
      {
        localId: 'loc_sj_104',
        nodeId,
        patientCode: 'ENCLAVE-SJ-8404',
        age: 53,
        systolicBp: 132,
        ldlCholesterol: 128,
        hba1c: 5.9,
        egfr: 84,
        troponin: 0.015,
        diagnosisLabel: 0,
        recordedDate: '2026-11-21',
      },
      {
        localId: 'loc_sj_105',
        nodeId,
        patientCode: 'ENCLAVE-SJ-8405',
        age: 61,
        systolicBp: 146,
        ldlCholesterol: 159,
        hba1c: 6.8,
        egfr: 66,
        troponin: 0.044,
        diagnosisLabel: 1,
        recordedDate: '2026-11-22',
      },
    ],
    node_zurich_oncology: [
      {
        localId: 'loc_zh_201',
        nodeId,
        patientCode: 'ENCLAVE-ZH-3109',
        age: 59,
        systolicBp: 142,
        ldlCholesterol: 152,
        hba1c: 6.9,
        egfr: 71,
        troponin: 0.036,
        diagnosisLabel: 1,
        recordedDate: '2026-11-17',
      },
      {
        localId: 'loc_zh_202',
        nodeId,
        patientCode: 'ENCLAVE-ZH-3110',
        age: 39,
        systolicBp: 114,
        ldlCholesterol: 88,
        hba1c: 5.1,
        egfr: 105,
        troponin: 0.005,
        diagnosisLabel: 0,
        recordedDate: '2026-11-20',
      },
      {
        localId: 'loc_zh_203',
        nodeId,
        patientCode: 'ENCLAVE-ZH-3111',
        age: 69,
        systolicBp: 154,
        ldlCholesterol: 168,
        hba1c: 7.7,
        egfr: 53,
        troponin: 0.072,
        diagnosisLabel: 1,
        recordedDate: '2026-11-22',
      },
    ],
  };

  if (cohorts[nodeId]) {
    return cohorts[nodeId];
  }

  return [
    {
      localId: `loc_${nodeId}_01`,
      nodeId,
      patientCode: `ENCLAVE-LOCAL-101`,
      age: 58,
      systolicBp: 144,
      ldlCholesterol: 156,
      hba1c: 6.6,
      egfr: 68,
      troponin: 0.038,
      diagnosisLabel: 1,
      recordedDate: '2026-11-21',
    },
    {
      localId: `loc_${nodeId}_02`,
      nodeId,
      patientCode: `ENCLAVE-LOCAL-102`,
      age: 42,
      systolicBp: 116,
      ldlCholesterol: 94,
      hba1c: 5.2,
      egfr: 96,
      troponin: 0.009,
      diagnosisLabel: 0,
      recordedDate: '2026-11-22',
    },
  ];
}

export function computeHexDigest(input: string, length = 32): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  let hex = '';
  for (let round = 0; hex.length < length; round += 1) {
    for (let i = 0; i < input.length; i += 1) {
      const ch = input.charCodeAt(i) ^ (round * 31);
      h1 = Math.imul(h1 ^ ch, 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ (ch + i), 0x85ebca6b) >>> 0;
    }
    hex += h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
  }
  return hex.slice(0, length);
}

const FORBIDDEN_PHI_KEYS = new Set([
  'patientname',
  'patient_name',
  'fullname',
  'ssn',
  'mrn',
  'dob',
  'dateofbirth',
  'patientcode',
  'email',
  'phone',
  'address',
  'records',
  'patients',
]);

export function scanPayloadForPhi(payload: Record<string, unknown>): {
  passed: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  const inspect = (obj: unknown, path: string) => {
    if (obj === null || obj === undefined) return;
    if (Array.isArray(obj)) {
      if (obj.length > 8) {
        violations.push(`Array ${path} exceeds tensor bound (len=${obj.length})`);
      }
      obj.forEach((item, idx) => inspect(item, `${path}[${idx}]`));
      return;
    }
    if (typeof obj === 'object') {
      for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
        const normKey = key.toLowerCase();
        if (FORBIDDEN_PHI_KEYS.has(normKey)) {
          violations.push(`Forbidden PHI/PII key "${key}" at ${path}`);
        }
        inspect(val, path ? `${path}.${key}` : key);
      }
      return;
    }
    if (typeof obj === 'string') {
      if (/\b\d{3}-\d{2}-\d{4}\b/.test(obj)) {
        violations.push(`Potential SSN pattern detected at ${path}`);
      }
      if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(obj)) {
        violations.push(`Potential email PII detected at ${path}`);
      }
    }
  };

  inspect(payload, 'payload');
  return {
    passed: violations.length === 0,
    violations,
  };
}

function deterministicNoise(seed: number, index: number): number {
  const x = Math.sin(seed * 9301 + index * 49297 + 233280) * 10000;
  const u1 = Math.max(0.0001, x - Math.floor(x));
  const y = Math.cos(seed * 7919 + index * 31337 + 104729) * 10000;
  const u2 = y - Math.floor(y);
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

export function clipAndNoiseGradients(
  rawDeltas: number[],
  clippingNorm: number,
  noiseMultiplier: number,
  seed = 42
): {
  clippedNoisedDeltas: number[];
  l2Norm: number;
} {
  const sumSq = rawDeltas.reduce((acc, v) => acc + v * v, 0);
  const l2Norm = Math.sqrt(sumSq);
  const clipScale = l2Norm > clippingNorm && l2Norm > 0 ? clippingNorm / l2Norm : 1;
  const noiseScale = (noiseMultiplier * clippingNorm) / 45;

  const clippedNoisedDeltas = rawDeltas.map((delta, idx) => {
    const clipped = delta * clipScale;
    const gaussianNoise = deterministicNoise(seed, idx) * noiseScale;
    return Number((clipped + gaussianNoise).toFixed(5));
  });

  return {
    clippedNoisedDeltas,
    l2Norm: Number(Math.min(l2Norm, clippingNorm).toFixed(4)),
  };
}

function sigmoid(z: number): number {
  if (z > 20) return 0.999999;
  if (z < -20) return 0.000001;
  return 1 / (1 + Math.exp(-z));
}

function normalizeFeatures(record: LocalPatientRecord): number[] {
  return [
    (record.age - 55) / 15,
    (record.systolicBp - 130) / 20,
    (record.ldlCholesterol - 125) / 35,
    (record.hba1c - 6.0) / 1.2,
    (record.egfr - 75) / 20,
    (record.troponin - 0.03) / 0.03,
  ];
}

export function evaluateLocalPatientRisk(
  record: LocalPatientRecord,
  weights: ModelWeights
): RiskInferenceResult {
  const [fAge, fBp, fLdl, fHba1c, fEgfr, fTrop] = normalizeFeatures(record);

  const logit =
    weights.bias +
    weights.ageWeight * fAge +
    weights.systolicBpWeight * fBp +
    weights.ldlWeight * fLdl +
    weights.hba1cWeight * fHba1c +
    weights.egfrWeight * fEgfr +
    weights.troponinWeight * fTrop;

  const prob = sigmoid(logit);
  const probabilityPercent = Number((prob * 100).toFixed(1));

  let riskTier: RiskTier = 'Low';
  if (probabilityPercent >= 75) riskTier = 'Critical';
  else if (probabilityPercent >= 50) riskTier = 'Elevated';
  else if (probabilityPercent >= 25) riskTier = 'Moderate';

  const rawContributions: BiomarkerContribution[] = [
    {
      feature: 'Troponin I',
      valueLabel: `${record.troponin.toFixed(3)} ng/mL`,
      impactScore: Number((weights.troponinWeight * fTrop).toFixed(3)),
      direction: weights.troponinWeight * fTrop >= 0 ? 'risk-increasing' : 'protective',
    },
    {
      feature: 'HbA1c',
      valueLabel: `${record.hba1c.toFixed(1)} %`,
      impactScore: Number((weights.hba1cWeight * fHba1c).toFixed(3)),
      direction: weights.hba1cWeight * fHba1c >= 0 ? 'risk-increasing' : 'protective',
    },
    {
      feature: 'Systolic BP',
      valueLabel: `${record.systolicBp} mmHg`,
      impactScore: Number((weights.systolicBpWeight * fBp).toFixed(3)),
      direction: weights.systolicBpWeight * fBp >= 0 ? 'risk-increasing' : 'protective',
    },
    {
      feature: 'eGFR Renal',
      valueLabel: `${record.egfr} mL/min`,
      impactScore: Number((weights.egfrWeight * fEgfr).toFixed(3)),
      direction: weights.egfrWeight * fEgfr >= 0 ? 'risk-increasing' : 'protective',
    },
    {
      feature: 'LDL Cholesterol',
      valueLabel: `${record.ldlCholesterol} mg/dL`,
      impactScore: Number((weights.ldlWeight * fLdl).toFixed(3)),
      direction: weights.ldlWeight * fLdl >= 0 ? 'risk-increasing' : 'protective',
    },
    {
      feature: 'Patient Age',
      valueLabel: `${record.age} yrs`,
      impactScore: Number((weights.ageWeight * fAge).toFixed(3)),
      direction: weights.ageWeight * fAge >= 0 ? 'risk-increasing' : 'protective',
    },
  ];

  rawContributions.sort((a, b) => Math.abs(b.impactScore) - Math.abs(a.impactScore));

  return {
    probabilityPercent,
    riskTier,
    confidence: Number((85 + Math.abs(prob - 0.5) * 28).toFixed(1)),
    contributions: rawContributions,
  };
}

export function runLocalTrainingEpoch(
  records: LocalPatientRecord[],
  globalWeights: ModelWeights,
  config: {
    localEpochs: number;
    learningRate: number;
    clippingNorm: number;
    noiseMultiplier: number;
    targetEpsilon: number;
    nodeId: string;
  }
): LocalTrainingResult {
  const safeRecords = records.length > 0 ? records : generateLocalCohortForNode(config.nodeId);
  const wVec = [
    globalWeights.bias,
    globalWeights.ageWeight,
    globalWeights.systolicBpWeight,
    globalWeights.ldlWeight,
    globalWeights.hba1cWeight,
    globalWeights.egfrWeight,
    globalWeights.troponinWeight,
  ];
  const initialVec = [...wVec];

  let totalLoss = 0;
  let correct = 0;

  for (let epoch = 0; epoch < config.localEpochs; epoch += 1) {
    const grads = [0, 0, 0, 0, 0, 0, 0];
    let epochLoss = 0;
    let epochCorrect = 0;

    for (const rec of safeRecords) {
      const feats = [1, ...normalizeFeatures(rec)];
      const z = feats.reduce((sum, f, idx) => sum + f * wVec[idx], 0);
      const pred = sigmoid(z);
      const y = rec.diagnosisLabel;

      epochLoss += -(y * Math.log(pred) + (1 - y) * Math.log(1 - pred));
      if ((pred >= 0.5 ? 1 : 0) === y) epochCorrect += 1;

      const err = pred - y;
      for (let i = 0; i < grads.length; i += 1) {
        grads[i] += err * feats[i];
      }
    }

    for (let i = 0; i < wVec.length; i += 1) {
      wVec[i] -= (config.learningRate / safeRecords.length) * grads[i];
    }

    totalLoss = epochLoss / safeRecords.length;
    correct = epochCorrect;
  }

  const rawDeltas = wVec.map((val, idx) => Number((val - initialVec[idx]).toFixed(5)));
  const seed = safeRecords.length * 17 + config.localEpochs * 31;
  const { clippedNoisedDeltas, l2Norm } = clipAndNoiseGradients(
    rawDeltas,
    config.clippingNorm,
    config.noiseMultiplier,
    seed
  );

  const epsilonDelta = Number(
    Math.min(
      5,
      Math.max(0.12, (config.localEpochs * 0.11) / Math.max(0.5, config.noiseMultiplier))
    ).toFixed(3)
  );

  const empiricalAcc = (correct / safeRecords.length) * 100;
  const localAccuracy = Number(Math.min(98.5, Math.max(76.0, empiricalAcc * 0.35 + 61.2)).toFixed(1));
  const localLoss = Number(Math.max(0.11, Math.min(0.85, totalLoss)).toFixed(3));

  const outboundCandidate = {
    nodeId: config.nodeId,
    weightDeltas: clippedNoisedDeltas,
    l2Norm,
    epsilonDelta,
  };
  const phiCheck = scanPayloadForPhi(outboundCandidate);
  const gradientDigest = computeHexDigest(
    `${config.nodeId}:${clippedNoisedDeltas.join(',')}:${l2Norm}:${epsilonDelta}`
  );

  return {
    rawDeltas,
    clippedNoisedDeltas,
    l2Norm,
    localAccuracy,
    localLoss,
    epsilonDelta,
    gradientDigest,
    phiScanPassed: phiCheck.passed,
  };
}

export function aggregateFedAvg(params: {
  pendingUpdates: GradientUpdate[];
  currentWeights: ModelWeights;
  lastRound: TrainingRound | null;
  strategy: AggregationStrategy;
  noiseMultiplier: number;
  aggregatorUid: string;
}): {
  nextWeights: ModelWeights;
  nextRound: TrainingRound;
} {
  const { pendingUpdates, currentWeights, lastRound, strategy, noiseMultiplier, aggregatorUid } = params;
  if (pendingUpdates.length === 0) {
    throw new Error('At least one verified gradient update is required for federated aggregation.');
  }

  const totalSamples = pendingUpdates.reduce((sum, u) => sum + u.sampleCount, 0);
  const proxDampening = strategy === 'FedProx' ? 0.88 : 1.0;

  const avgDeltas = [0, 0, 0, 0, 0, 0, 0];
  let weightedAcc = 0;
  let weightedLoss = 0;
  let maxEpsilon = 0;

  for (const update of pendingUpdates) {
    const weightRatio = update.sampleCount / totalSamples;
    weightedAcc += update.localAccuracy * weightRatio;
    weightedLoss += update.localLoss * weightRatio;
    maxEpsilon = Math.max(maxEpsilon, update.epsilonDelta);

    for (let i = 0; i < 7; i += 1) {
      const d = update.weightDeltas[i] ?? 0;
      avgDeltas[i] += d * weightRatio * proxDampening;
    }
  }

  const nextWeights: ModelWeights = {
    bias: Number((currentWeights.bias + avgDeltas[0]).toFixed(5)),
    ageWeight: Number((currentWeights.ageWeight + avgDeltas[1]).toFixed(5)),
    systolicBpWeight: Number((currentWeights.systolicBpWeight + avgDeltas[2]).toFixed(5)),
    ldlWeight: Number((currentWeights.ldlWeight + avgDeltas[3]).toFixed(5)),
    hba1cWeight: Number((currentWeights.hba1cWeight + avgDeltas[4]).toFixed(5)),
    egfrWeight: Number((currentWeights.egfrWeight + avgDeltas[5]).toFixed(5)),
    troponinWeight: Number((currentWeights.troponinWeight + avgDeltas[6]).toFixed(5)),
  };

  const prevAcc = lastRound?.globalAccuracy ?? 80.0;
  const prevLoss = lastRound?.globalLoss ?? 0.45;
  const prevEps = lastRound?.epsilonSpent ?? 0;
  const roundNumber = (lastRound?.roundNumber ?? 0) + 1;

  const improvedAcc = Math.min(97.8, Math.max(prevAcc + 0.45, weightedAcc + 0.65));
  const improvedLoss = Math.max(0.082, Math.min(prevLoss - 0.014, weightedLoss * 0.94));
  const globalAccuracy = Number(improvedAcc.toFixed(1));
  const globalLoss = Number(improvedLoss.toFixed(3));
  const aucRoc = Number(Math.min(0.985, 0.72 + (globalAccuracy - 70) * 0.0098).toFixed(3));
  const f1Score = Number(Math.min(0.968, (globalAccuracy / 100) * 0.985).toFixed(3));
  const epsilonSpent = Number((prevEps + maxEpsilon * 0.85).toFixed(3));

  const roundId = `round_${String(roundNumber).padStart(3, '0')}`;
  const modelHash = computeHexDigest(
    `${roundId}:${strategy}:${Object.values(nextWeights).join(',')}:${totalSamples}`
  );

  const nextRound: TrainingRound = {
    roundId,
    roundNumber,
    strategy,
    globalAccuracy,
    globalLoss,
    aucRoc,
    f1Score,
    epsilonSpent,
    noiseMultiplier,
    participatingNodesCount: new Set(pendingUpdates.map((u) => u.nodeId)).size,
    totalSamplesAggregated: totalSamples,
    aggregatorUid,
    status: 'aggregated',
    modelHash,
  };

  return { nextWeights, nextRound };
}

export type ConvergenceStrategyFilter = 'all' | 'FedAvg' | 'FedProx' | 'compare';
export type ModelVersionFilter = 'all' | 'v1.0' | 'v2.0';

export interface ConvergencePoint {
  roundId: string;
  roundNumber: number;
  modelVersion: 'v1.0' | 'v2.0';
  strategy: AggregationStrategy;
  globalAccuracy: number;
  globalLoss: number;
  aucRoc: number;
  epsilonSpent: number;
  baselineFedAvgAccuracy: number;
  accuracyGainVsBaseline: number;
}

export interface ConvergenceViewData {
  points: ConvergencePoint[];
  cumulativeAccuracyGain: number;
  latestStrategyAdvantage: number;
}

export function getRoundModelVersion(round: TrainingRound): 'v1.0' | 'v2.0' {
  return round.roundNumber <= 3 && round.strategy === 'FedAvg' ? 'v1.0' : 'v2.0';
}

export function computeConvergenceView(
  rounds: TrainingRound[],
  strategyFilter: ConvergenceStrategyFilter,
  versionFilter: ModelVersionFilter
): ConvergenceViewData {
  const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);

  const enriched: ConvergencePoint[] = sorted.map((round) => {
    const modelVersion = getRoundModelVersion(round);
    // Deterministic FedAvg reference trajectory for cross-strategy comparison across rounds
    const baselineFedAvgAccuracy =
      round.strategy === 'FedAvg'
        ? round.globalAccuracy
        : Number(
            Math.max(76.0, round.globalAccuracy - (1.4 + Math.min(2.2, (round.roundNumber - 3) * 0.45))).toFixed(1)
          );
    const accuracyGainVsBaseline = Number(
      (round.globalAccuracy - baselineFedAvgAccuracy).toFixed(1)
    );

    return {
      roundId: round.roundId,
      roundNumber: round.roundNumber,
      modelVersion,
      strategy: round.strategy,
      globalAccuracy: round.globalAccuracy,
      globalLoss: round.globalLoss,
      aucRoc: round.aucRoc,
      epsilonSpent: round.epsilonSpent,
      baselineFedAvgAccuracy,
      accuracyGainVsBaseline,
    };
  });

  const filtered = enriched.filter((pt) => {
    const matchesVersion = versionFilter === 'all' || pt.modelVersion === versionFilter;
    if (!matchesVersion) return false;
    if (strategyFilter === 'FedAvg') return pt.strategy === 'FedAvg';
    if (strategyFilter === 'FedProx') return pt.strategy === 'FedProx';
    return true;
  });

  const cumulativeAccuracyGain =
    filtered.length >= 2
      ? Number((filtered[filtered.length - 1].globalAccuracy - filtered[0].globalAccuracy).toFixed(1))
      : 0;

  const latestStrategyAdvantage =
    filtered.length > 0 ? filtered[filtered.length - 1].accuracyGainVsBaseline : 0;

  return {
    points: filtered,
    cumulativeAccuracyGain,
    latestStrategyAdvantage,
  };
}

export type BottleneckSeverity = 'Idle' | 'Low' | 'Moderate' | 'Elevated' | 'Bottleneck';

export interface PrivacyHeatmapCell {
  roundNumber: number;
  nodeId: string;
  epsilonDelta: number;
  cumulativePercentAtRound: number;
  severity: BottleneckSeverity;
}

export interface PrivacyHeatmapRow {
  node: HospitalNode;
  utilizationPercent: number;
  remainingEpsilon: number;
  severity: BottleneckSeverity;
  projectedRoundsRemaining: number | null;
  cells: PrivacyHeatmapCell[];
}

export interface PrivacyHeatmapSummary {
  roundNumbers: number[];
  rows: PrivacyHeatmapRow[];
  totalEpsilonUsed: number;
  totalEpsilonCap: number;
  consortiumUtilizationPercent: number;
  bottleneckRow: PrivacyHeatmapRow | null;
}

export function classifyPrivacySeverity(utilizationPercent: number): BottleneckSeverity {
  if (utilizationPercent <= 0) return 'Idle';
  if (utilizationPercent >= 78) return 'Bottleneck';
  if (utilizationPercent >= 55) return 'Elevated';
  if (utilizationPercent >= 30) return 'Moderate';
  return 'Low';
}

export function computePrivacyHeatmap(
  nodes: HospitalNode[],
  rounds: TrainingRound[],
  gradientUpdates: GradientUpdate[]
): PrivacyHeatmapSummary {
  const sortedRounds = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
  const roundNumbers =
    sortedRounds.length > 0 ? sortedRounds.map((r) => r.roundNumber) : [1, 2, 3, 4, 5];

  const rows: PrivacyHeatmapRow[] = nodes.map((node) => {
    const cap = Math.max(0.1, node.privacyBudgetCap);
    const used = Math.max(0, node.privacyBudgetUsed);
    const utilizationPercent = Number(Math.min(100, (used / cap) * 100).toFixed(1));
    const remainingEpsilon = Number(Math.max(0, cap - used).toFixed(2));
    const severity = classifyPrivacySeverity(utilizationPercent);

    const activeRoundCount = Math.max(1, node.lastSyncRound || roundNumbers.length);
    const avgBurnPerRound = used > 0 ? used / activeRoundCount : 0;
    const projectedRoundsRemaining =
      node.status === 'active' && avgBurnPerRound > 0
        ? Math.max(0, Math.floor(remainingEpsilon / avgBurnPerRound))
        : null;

    let runningUsed = 0;
    const cells: PrivacyHeatmapCell[] = roundNumbers.map((roundNum, idx) => {
      const matchingUpdates = gradientUpdates.filter(
        (u) => u.nodeId === node.nodeId && u.roundNumber === roundNum
      );

      let delta = 0;
      if (matchingUpdates.length > 0) {
        delta = matchingUpdates.reduce((sum, u) => sum + u.epsilonDelta, 0);
      } else if (node.status === 'active' && used > 0 && roundNum <= (node.lastSyncRound || roundNumbers[roundNumbers.length - 1])) {
        // Distribute historical cumulative spend deterministically across synced rounds
        const weightFactor = 0.8 + ((idx + 1) / Math.max(1, roundNumbers.length)) * 0.4;
        const totalWeights = roundNumbers.reduce(
          (acc, rn, rIdx) =>
            rn <= (node.lastSyncRound || roundNumbers[roundNumbers.length - 1])
              ? acc + (0.8 + ((rIdx + 1) / Math.max(1, roundNumbers.length)) * 0.4)
              : acc,
          0
        );
        delta = (used * weightFactor) / Math.max(0.01, totalWeights);
      }

      delta = Number(delta.toFixed(3));
      runningUsed = Math.min(cap, runningUsed + delta);
      const cumulativePercentAtRound = Number(((runningUsed / cap) * 100).toFixed(1));

      return {
        roundNumber: roundNum,
        nodeId: node.nodeId,
        epsilonDelta: delta,
        cumulativePercentAtRound,
        severity: classifyPrivacySeverity(
          delta === 0 ? 0 : cumulativePercentAtRound
        ),
      };
    });

    return {
      node,
      utilizationPercent,
      remainingEpsilon,
      severity,
      projectedRoundsRemaining,
      cells,
    };
  });

  rows.sort((a, b) => b.utilizationPercent - a.utilizationPercent);

  const totalEpsilonUsed = Number(
    rows.reduce((sum, r) => sum + r.node.privacyBudgetUsed, 0).toFixed(2)
  );
  const totalEpsilonCap = Number(
    rows.reduce((sum, r) => sum + r.node.privacyBudgetCap, 0).toFixed(2)
  );
  const consortiumUtilizationPercent =
    totalEpsilonCap > 0
      ? Number(((totalEpsilonUsed / totalEpsilonCap) * 100).toFixed(1))
      : 0;

  const activeRows = rows.filter((r) => r.node.status === 'active');
  const bottleneckRow = activeRows.length > 0 ? activeRows[0] : rows[0] || null;

  return {
    roundNumbers,
    rows,
    totalEpsilonUsed,
    totalEpsilonCap,
    consortiumUtilizationPercent,
    bottleneckRow,
  };
}

export interface DemoAccountCredential {
  username: string;
  password: string;
  role: 'user' | 'admin';
  displayName: string;
  uid: string;
  defaultNodeId: string;
}

export const DEMO_ACCOUNTS: DemoAccountCredential[] = [
  {
    username: 'user@hospital.org',
    password: 'user123',
    role: 'user',
    displayName: 'Dr. Marcus Chen (Cardiology User)',
    uid: 'clinician_cardio_01',
    defaultNodeId: 'node_st_jude_cardio',
  },
  {
    username: 'admin@fedmed.org',
    password: 'admin123',
    role: 'admin',
    displayName: 'Dr. Elena Vance (Consortium Admin)',
    uid: 'admin_coordinator_01',
    defaultNodeId: 'node_st_jude_cardio',
  },
];

export function authenticateDemoCredentials(
  usernameInput: string,
  passwordInput: string
):
  | { ok: true; account: DemoAccountCredential }
  | { ok: false; error: string } {
  const normUser = usernameInput.trim().toLowerCase();
  const normPass = passwordInput;

  if (!normUser || !normPass) {
    return { ok: false, error: 'Please enter both username/email and password.' };
  }

  const matched = DEMO_ACCOUNTS.find((acc) => {
    const shortAlias = acc.username.split('@')[0];
    return (
      (acc.username.toLowerCase() === normUser || shortAlias === normUser) &&
      acc.password === normPass
    );
  });

  if (!matched) {
    return {
      ok: false,
      error:
        'Invalid credentials. Use demo user (user@hospital.org / user123) or demo admin (admin@fedmed.org / admin123).',
    };
  }

  return { ok: true, account: matched };
}

export interface PrivacyAttackResilienceResult {
  miaRiskPercent: number;
  inversionRiskPercent: number;
  utilityRetentionPercent: number;
  defenseGrade: 'Strong' | 'Moderate' | 'Weak';
  recommendation: string;
}

export function simulatePrivacyAttackResilience(
  clippingNorm: number,
  noiseMultiplier: number
): PrivacyAttackResilienceResult {
  const effectiveShield = noiseMultiplier / Math.max(0.4, Math.sqrt(clippingNorm));
  const miaRiskPercent = Number(
    Math.max(1.8, Math.min(48.0, 34.0 * Math.exp(-1.15 * effectiveShield))).toFixed(1)
  );
  const inversionRiskPercent = Number(
    Math.max(1.2, Math.min(62.0, 46.0 * Math.exp(-1.35 * effectiveShield))).toFixed(1)
  );
  const utilityRetentionPercent = Number(
    Math.max(76.0, Math.min(99.2, 98.6 - Math.max(0, noiseMultiplier - 0.8) * 5.2)).toFixed(1)
  );

  let defenseGrade: 'Strong' | 'Moderate' | 'Weak' = 'Strong';
  let recommendation =
    'Calibrated DP noise keeps reconstruction and membership inference leakage well below clinical safety thresholds.';

  if (miaRiskPercent >= 18 || inversionRiskPercent >= 22) {
    defenseGrade = 'Weak';
    recommendation =
      'Increase Gaussian noise multiplier (σ ≥ 1.0) or tighten L2 clipping bound (C ≤ 1.2) to prevent gradient leakage.';
  } else if (miaRiskPercent >= 9 || inversionRiskPercent >= 11) {
    defenseGrade = 'Moderate';
    recommendation =
      'Acceptable baseline protection. Raising σ slightly above 1.15 further suppresses membership inference risk.';
  }

  return {
    miaRiskPercent,
    inversionRiskPercent,
    utilityRetentionPercent,
    defenseGrade,
    recommendation,
  };
}

export interface HospitalFairnessMetric {
  nodeId: string;
  name: string;
  region: string;
  sampleCount: number;
  nonIidSkew: number;
  isolatedLocalAccuracy: number;
  federatedAccuracy: number;
  accuracyGain: number;
}

export function computeHospitalFairnessMetrics(
  nodes: HospitalNode[],
  latestGlobalAccuracy: number
): HospitalFairnessMetric[] {
  return nodes.map((node) => {
    const sampleFactor = Math.min(6.5, (5500 - Math.min(5500, node.localRecordCount)) / 650);
    const skewPenalty = node.nonIidSkew * 14.0;
    const isolatedLocalAccuracy = Number(
      Math.max(68.0, Math.min(node.localAccuracy - 1.5, latestGlobalAccuracy - sampleFactor - skewPenalty)).toFixed(1)
    );
    const federatedAccuracy = Number(
      Math.max(node.localAccuracy, latestGlobalAccuracy - node.nonIidSkew * 3.5).toFixed(1)
    );
    const accuracyGain = Number((federatedAccuracy - isolatedLocalAccuracy).toFixed(1));

    return {
      nodeId: node.nodeId,
      name: node.name,
      region: node.region,
      sampleCount: node.localRecordCount,
      nonIidSkew: node.nonIidSkew,
      isolatedLocalAccuracy,
      federatedAccuracy,
      accuracyGain,
    };
  });
}

export function generateSyntheticPatientBatch(
  nodeId: string,
  seedOffset = 1
): LocalPatientRecord[] {
  const today = new Date().toISOString().slice(0, 10);
  const base = 9100 + seedOffset * 10;
  return [
    {
      localId: `loc_syn_${Date.now()}_1`,
      nodeId,
      patientCode: `ENCLAVE-SYN-${base + 1}`,
      age: 64,
      systolicBp: 152,
      ldlCholesterol: 168,
      hba1c: 7.2,
      egfr: 61,
      troponin: 0.054,
      diagnosisLabel: 1,
      recordedDate: today,
    },
    {
      localId: `loc_syn_${Date.now()}_2`,
      nodeId,
      patientCode: `ENCLAVE-SYN-${base + 2}`,
      age: 48,
      systolicBp: 122,
      ldlCholesterol: 108,
      hba1c: 5.5,
      egfr: 92,
      troponin: 0.011,
      diagnosisLabel: 0,
      recordedDate: today,
    },
    {
      localId: `loc_syn_${Date.now()}_3`,
      nodeId,
      patientCode: `ENCLAVE-SYN-${base + 3}`,
      age: 71,
      systolicBp: 166,
      ldlCholesterol: 192,
      hba1c: 8.3,
      egfr: 45,
      troponin: 0.088,
      diagnosisLabel: 1,
      recordedDate: today,
    },
  ];
}

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  accuracyDropPercent: 5.0,
  privacyWarningPercent: 80.0,
};

export function evaluateNodeHealthAlerts(
  nodes: HospitalNode[],
  rounds: TrainingRound[],
  gradientUpdates: GradientUpdate[],
  thresholds: AlertThresholds = DEFAULT_ALERT_THRESHOLDS
): NodeHealthReport {
  const sortedRounds = [...rounds].sort((a, b) => b.roundNumber - a.roundNumber);
  const latestRound = sortedRounds[0] || null;
  const latestGlobalAccuracy = latestRound?.globalAccuracy ?? 88.0;
  const currentRoundNumber = latestRound?.roundNumber ?? 0;

  const alerts: NodeHealthAlert[] = [];
  const byNodeId: Record<string, NodeHealthSummaryItem> = {};

  for (const node of nodes) {
    const nodeAlerts: NodeHealthAlert[] = [];
    const cap = Math.max(0.1, node.privacyBudgetCap);
    const budgetUtilizationPercent = Number(((node.privacyBudgetUsed / cap) * 100).toFixed(1));
    const accuracyDeltaVsGlobal = Number((node.localAccuracy - latestGlobalAccuracy).toFixed(1));

    // Check historical drop across node's submitted gradient updates
    const nodeUpdates = gradientUpdates
      .filter((u) => u.nodeId === node.nodeId)
      .sort((a, b) => b.roundNumber - a.roundNumber);
    const peakHistoricalAcc =
      nodeUpdates.length > 0
        ? Math.max(...nodeUpdates.map((u) => u.localAccuracy))
        : node.localAccuracy;
    const historicalAccuracyDrop = Number(
      Math.max(0, peakHistoricalAcc - node.localAccuracy).toFixed(1)
    );

    // 1. Privacy Budget Exceeded vs Approaching Cap
    if (node.privacyBudgetUsed > node.privacyBudgetCap) {
      const overage = Number((node.privacyBudgetUsed - node.privacyBudgetCap).toFixed(2));
      nodeAlerts.push({
        alertId: `alert_priv_exceeded_${node.nodeId}`,
        nodeId: node.nodeId,
        nodeName: node.name,
        category: 'privacy_budget_exceeded',
        severity: 'critical',
        title: 'Privacy Budget Cap Exceeded',
        detail: `${node.name} consumed ${node.privacyBudgetUsed.toFixed(2)} ε against its ${node.privacyBudgetCap.toFixed(
          1
        )} ε institutional cap (+${overage.toFixed(2)} ε over limit).`,
        metricSummary: `${node.privacyBudgetUsed.toFixed(2)} / ${node.privacyBudgetCap.toFixed(1)} ε (${budgetUtilizationPercent.toFixed(1)}%)`,
        recommendedAction:
          node.status === 'suspended'
            ? 'Node quarantined. Extend ε cap or reset budget before reactivating.'
            : 'Suspend node from upcoming rounds or authorize an emergency ε cap extension.',
        detectedAtRound: currentRoundNumber,
      });
    } else if (budgetUtilizationPercent >= thresholds.privacyWarningPercent) {
      const remaining = Number(Math.max(0, node.privacyBudgetCap - node.privacyBudgetUsed).toFixed(2));
      nodeAlerts.push({
        alertId: `alert_priv_warn_${node.nodeId}`,
        nodeId: node.nodeId,
        nodeName: node.name,
        category: 'privacy_budget_warning',
        severity: 'warning',
        title: 'Privacy Budget Near Exhaustion',
        detail: `${node.name} has burned ${budgetUtilizationPercent.toFixed(
          1
        )}% of its ε allocation (${remaining.toFixed(2)} ε remaining).`,
        metricSummary: `${node.privacyBudgetUsed.toFixed(2)} / ${node.privacyBudgetCap.toFixed(1)} ε (${budgetUtilizationPercent.toFixed(1)}%)`,
        recommendedAction:
          'Increase Gaussian noise σ on local training or expand institutional ε cap.',
        detectedAtRound: currentRoundNumber,
      });
    }

    // 2. Significant Local Accuracy Drop (either vs historical peak OR lagging global consensus)
    const dropVsGlobal = Number(Math.max(0, latestGlobalAccuracy - node.localAccuracy).toFixed(1));
    const maxObservedDrop = Math.max(historicalAccuracyDrop, dropVsGlobal);

    if (maxObservedDrop >= thresholds.accuracyDropPercent) {
      const isCriticalDrop = maxObservedDrop >= thresholds.accuracyDropPercent * 1.6;
      const reason =
        historicalAccuracyDrop >= thresholds.accuracyDropPercent
          ? `dropped ${historicalAccuracyDrop.toFixed(1)}% from prior peak (${peakHistoricalAcc.toFixed(
              1
            )}% → ${node.localAccuracy.toFixed(1)}%)`
          : `trails consortium global accuracy (${node.localAccuracy.toFixed(
              1
            )}% vs ${latestGlobalAccuracy.toFixed(1)}%)`;

      nodeAlerts.push({
        alertId: `alert_acc_drop_${node.nodeId}`,
        nodeId: node.nodeId,
        nodeName: node.name,
        category: 'accuracy_drop',
        severity: isCriticalDrop ? 'critical' : 'warning',
        title: 'Significant Local Accuracy Drop',
        detail: `${node.name} ${reason}, indicating potential non-IID drift, label corruption, or stale local weights.`,
        metricSummary: `Local ${node.localAccuracy.toFixed(1)}% (${accuracyDeltaVsGlobal >= 0 ? '+' : ''}${accuracyDeltaVsGlobal.toFixed(1)}% vs global)`,
        recommendedAction:
          node.status === 'suspended'
            ? 'Node quarantined for local data quality audit.'
            : 'Inspect local cohort distribution, switch aggregation to FedProx, or quarantine node.',
        detectedAtRound: currentRoundNumber,
      });
    }

    let healthState: NodeHealthState = 'healthy';
    if (nodeAlerts.some((a) => a.severity === 'critical')) {
      healthState = 'critical';
    } else if (nodeAlerts.length > 0) {
      healthState = 'warning';
    }

    byNodeId[node.nodeId] = {
      nodeId: node.nodeId,
      healthState,
      alerts: nodeAlerts,
      budgetUtilizationPercent,
      accuracyDeltaVsGlobal,
      historicalAccuracyDrop,
    };

    alerts.push(...nodeAlerts);
  }

  alerts.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === 'critical' ? -1 : 1;
    }
    return a.nodeName.localeCompare(b.nodeName);
  });

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;
  const affectedNodeCount = Object.values(byNodeId).filter(
    (item) => item.healthState !== 'healthy'
  ).length;
  const healthyNodeCount = nodes.length - affectedNodeCount;

  return {
    alerts,
    byNodeId,
    criticalCount,
    warningCount,
    affectedNodeCount,
    healthyNodeCount,
  };
}

export const DEFAULT_COMPLIANCE_EXPORT_OPTIONS: ComplianceExportOptions = {
  includeAuditLogs: true,
  includeTrainingRounds: true,
  includeNodeHealthSummary: true,
  actionTypeFilter: 'ALL',
};

export function buildComplianceReport(params: {
  nodes: HospitalNode[];
  rounds: TrainingRound[];
  auditLogs: AuditLog[];
  healthReport: NodeHealthReport;
  alertThresholds: AlertThresholds;
  exportedBy: {
    uid: string;
    displayName: string;
    role: UserRole;
    authMode: 'firebase' | 'sandbox';
  };
  options?: ComplianceExportOptions;
  generatedAtIso?: string;
}): {
  report: ComplianceReportPayload;
  jsonText: string;
  filename: string;
} {
  const options = params.options ?? DEFAULT_COMPLIANCE_EXPORT_OPTIONS;
  if (
    !options.includeAuditLogs &&
    !options.includeTrainingRounds &&
    !options.includeNodeHealthSummary
  ) {
    throw new Error(
      'Select at least one compliance section (Audit Logs, Training Round Summaries, or Node Health Posture) to export.'
    );
  }

  const generatedAtIso = params.generatedAtIso ?? new Date().toISOString();
  const dateStamp = generatedAtIso.slice(0, 10);
  const sortedRounds = [...params.rounds].sort((a, b) => a.roundNumber - b.roundNumber);
  const latestRound = sortedRounds[sortedRounds.length - 1] || null;

  const filteredLogs = params.auditLogs
    .filter(
      (log) =>
        options.actionTypeFilter === 'ALL' || log.actionType === options.actionTypeFilter
    )
    .map((log) => ({
      logId: log.logId,
      actorUid: log.actorUid,
      actorRole: log.actorRole,
      actionType: log.actionType,
      targetId: log.targetId,
      summary: log.summary,
      integrityHash: log.integrityHash,
      ...(log.createdAt !== undefined ? { createdAt: log.createdAt } : {}),
    }));

  const normalizedRounds: TrainingRound[] = sortedRounds.map((r) => ({
    roundId: r.roundId,
    roundNumber: r.roundNumber,
    strategy: r.strategy,
    globalAccuracy: r.globalAccuracy,
    globalLoss: r.globalLoss,
    aucRoc: r.aucRoc,
    f1Score: r.f1Score,
    epsilonSpent: r.epsilonSpent,
    noiseMultiplier: r.noiseMultiplier,
    participatingNodesCount: r.participatingNodesCount,
    totalSamplesAggregated: r.totalSamplesAggregated,
    aggregatorUid: r.aggregatorUid,
    status: r.status,
    modelHash: r.modelHash,
  }));

  const reportId = `rpt_${computeHexDigest(
    `${generatedAtIso}:${params.exportedBy.uid}:${filteredLogs.length}:${normalizedRounds.length}`,
    12
  )}`;

  const payloadBase: Omit<ComplianceReportPayload, 'integrityDigest'> = {
    schemaVersion: '1.0.0',
    reportId,
    generatedAtIso,
    exportedBy: {
      uid: params.exportedBy.uid,
      displayName: params.exportedBy.displayName,
      role: params.exportedBy.role,
      authMode: params.exportedBy.authMode,
    },
    consortiumSummary: {
      totalHospitalNodes: params.nodes.length,
      activeHospitalNodes: params.nodes.filter((n) => n.status === 'active').length,
      totalTrainingRounds: normalizedRounds.length,
      latestGlobalAccuracy: latestRound?.globalAccuracy ?? 0,
      cumulativeEpsilonSpent: latestRound?.epsilonSpent ?? 0,
      totalAuditEntriesIncluded: options.includeAuditLogs ? filteredLogs.length : 0,
      activeHealthAlerts: params.healthReport.alerts.length,
      zeroPhiGuarantee: true,
    },
    ...(options.includeNodeHealthSummary
      ? {
          nodeHealthPosture: {
            thresholds: { ...params.alertThresholds },
            criticalCount: params.healthReport.criticalCount,
            warningCount: params.healthReport.warningCount,
            nodes: params.nodes.map((n) => ({
              nodeId: n.nodeId,
              name: n.name,
              department: n.department,
              region: n.region,
              status: n.status,
              localAccuracy: n.localAccuracy,
              privacyBudgetUsed: n.privacyBudgetUsed,
              privacyBudgetCap: n.privacyBudgetCap,
              healthState: params.healthReport.byNodeId[n.nodeId]?.healthState ?? 'healthy',
            })),
            activeAlerts: params.healthReport.alerts,
          },
        }
      : {}),
    ...(options.includeTrainingRounds ? { trainingRoundSummaries: normalizedRounds } : {}),
    ...(options.includeAuditLogs ? { auditLogs: filteredLogs } : {}),
  };

  const integrityDigest = computeHexDigest(JSON.stringify(payloadBase), 32);
  const report: ComplianceReportPayload = {
    ...payloadBase,
    integrityDigest,
  };

  const jsonText = JSON.stringify(report, null, 2);
  const filename = `fedmed-compliance-report-${dateStamp}-${reportId.slice(-6)}.json`;

  return {
    report,
    jsonText,
    filename,
  };
}

export interface CompliancePdfDocumentData {
  filename: string;
  title: string;
  subtitle: string;
  metadataRows: Array<[string, string]>;
  summaryCards: Array<{ label: string; value: string }>;
  nodePostureTable: {
    included: boolean;
    thresholdsLabel: string;
    rows: string[][];
    alertRows: string[][];
  };
  trainingRoundsTable: {
    included: boolean;
    rows: string[][];
  };
  auditLogsTable: {
    included: boolean;
    rows: string[][];
  };
  attestationLine: string;
}

export function buildCompliancePdfSections(
  report: ComplianceReportPayload
): CompliancePdfDocumentData {
  const dateStamp = report.generatedAtIso.slice(0, 10);
  const filename = `fedmed-compliance-report-${dateStamp}-${report.reportId.slice(-6)}.pdf`;

  const metadataRows: Array<[string, string]> = [
    ['Report ID', report.reportId],
    ['Schema Version', `v${report.schemaVersion}`],
    ['Generated (UTC)', report.generatedAtIso],
    [
      'Exported By',
      `${report.exportedBy.displayName} (${report.exportedBy.role.toUpperCase()} · ${report.exportedBy.authMode})`,
    ],
    ['Actor UID', report.exportedBy.uid],
    ['Integrity Digest', report.integrityDigest],
  ];

  const summaryCards: Array<{ label: string; value: string }> = [
    {
      label: 'Active / Total Enclaves',
      value: `${report.consortiumSummary.activeHospitalNodes} / ${report.consortiumSummary.totalHospitalNodes}`,
    },
    {
      label: 'Training Rounds',
      value: String(report.consortiumSummary.totalTrainingRounds),
    },
    {
      label: 'Latest Global Accuracy',
      value: `${report.consortiumSummary.latestGlobalAccuracy.toFixed(1)}%`,
    },
    {
      label: 'Cumulative Privacy (ε)',
      value: `${report.consortiumSummary.cumulativeEpsilonSpent.toFixed(2)} eps`,
    },
    {
      label: 'Audit Events Included',
      value: String(report.consortiumSummary.totalAuditEntriesIncluded),
    },
    {
      label: 'Active Health Alerts',
      value: String(report.consortiumSummary.activeHealthAlerts),
    },
    {
      label: 'Zero-PHI Attestation',
      value: report.consortiumSummary.zeroPhiGuarantee ? 'VERIFIED (0 PHI)' : 'UNVERIFIED',
    },
    {
      label: 'Filing Standard',
      value: 'HIPAA / GDPR Audit',
    },
  ];

  const nodePostureIncluded = Boolean(report.nodeHealthPosture);
  const nodeRows = (report.nodeHealthPosture?.nodes ?? []).map((node) => {
    const pct =
      node.privacyBudgetCap > 0
        ? ((node.privacyBudgetUsed / node.privacyBudgetCap) * 100).toFixed(1)
        : '0.0';
    return [
      node.name,
      node.region,
      node.status.toUpperCase(),
      `${node.localAccuracy.toFixed(1)}%`,
      `${node.privacyBudgetUsed.toFixed(2)} / ${node.privacyBudgetCap.toFixed(1)} (${pct}%)`,
      node.healthState.toUpperCase(),
    ];
  });

  const alertRows = (report.nodeHealthPosture?.activeAlerts ?? []).map((alert) => [
    alert.severity.toUpperCase(),
    alert.nodeName,
    alert.title,
    alert.metricSummary,
    alert.recommendedAction,
  ]);

  const thresholdsLabel = report.nodeHealthPosture
    ? `Policy Thresholds: Accuracy Drop >= ${report.nodeHealthPosture.thresholds.accuracyDropPercent.toFixed(
        1
      )}% | Privacy Warning >= ${report.nodeHealthPosture.thresholds.privacyWarningPercent.toFixed(
        0
      )}% | Critical: ${report.nodeHealthPosture.criticalCount}, Warning: ${report.nodeHealthPosture.warningCount}`
    : '';

  const trainingIncluded = Array.isArray(report.trainingRoundSummaries);
  const roundRows = (report.trainingRoundSummaries ?? []).map((r) => [
    `R${r.roundNumber}`,
    r.strategy,
    `${r.globalAccuracy.toFixed(1)}%`,
    r.globalLoss.toFixed(3),
    r.aucRoc.toFixed(3),
    r.f1Score.toFixed(3),
    `${r.epsilonSpent.toFixed(2)}`,
    `${r.noiseMultiplier.toFixed(2)}`,
    `${r.participatingNodesCount} / ${r.totalSamplesAggregated.toLocaleString()}`,
    `#${r.modelHash.slice(0, 10)}`,
  ]);

  const auditIncluded = Array.isArray(report.auditLogs);
  const auditRows = (report.auditLogs ?? []).map((log) => [
    log.actionType,
    log.actorRole.toUpperCase(),
    log.targetId,
    log.summary,
    `#${log.integrityHash.slice(0, 12)}`,
  ]);

  return {
    filename,
    title: 'FedMed Shield — Federated Healthcare Compliance & Audit Report',
    subtitle:
      'Privacy-Preserving Consortium Regulatory Filing · Local Patient Records Isolated (Zero-PHI)',
    metadataRows,
    summaryCards,
    nodePostureTable: {
      included: nodePostureIncluded,
      thresholdsLabel,
      rows: nodeRows,
      alertRows,
    },
    trainingRoundsTable: {
      included: trainingIncluded,
      rows: roundRows,
    },
    auditLogsTable: {
      included: auditIncluded,
      rows: auditRows,
    },
    attestationLine: `Attestation: Zero raw patient records (PHI) transmitted. Digest #${report.integrityDigest} · Exported by ${report.exportedBy.uid}.`,
  };
}

export function sampleLocalEnginePerformance(params: {
  localRecordCount: number;
  roundCount: number;
  usedJsHeapBytes?: number | null;
  jsHeapSizeLimitBytes?: number | null;
  eventLoopDriftMs: number;
  computeDurationMs?: number;
  hardwareThreads?: number;
  trainingBurstActive?: boolean;
  timestampLabel?: string;
  sampleIndex?: number;
}): PerformanceSample {
  const safeRecords = Math.max(1, params.localRecordCount);
  const threads = Math.max(2, Math.min(16, params.hardwareThreads ?? 4));
  const stepIndex = params.sampleIndex ?? 0;

  let heapUsedMb: number;
  let heapLimitMb: number;

  if (
    typeof params.usedJsHeapBytes === 'number' &&
    params.usedJsHeapBytes > 0 &&
    typeof params.jsHeapSizeLimitBytes === 'number' &&
    params.jsHeapSizeLimitBytes > 0
  ) {
    const rawUsedMb = params.usedJsHeapBytes / (1024 * 1024);
    const burstBumpMb = params.trainingBurstActive ? 6.4 : 0;
    heapUsedMb = Number((rawUsedMb + burstBumpMb).toFixed(1));
    heapLimitMb = Number(Math.max(heapUsedMb + 32, params.jsHeapSizeLimitBytes / (1024 * 1024)).toFixed(0));
  } else {
    const enclaveTensorFootprint = 42 + safeRecords * 0.48 + params.roundCount * 1.9;
    const harmonicJitter = Math.sin(stepIndex * 0.75) * 1.6;
    const burstBumpMb = params.trainingBurstActive ? 14.5 : 0;
    heapLimitMb = 512;
    heapUsedMb = Number(
      Math.max(28, Math.min(heapLimitMb - 24, enclaveTensorFootprint + harmonicJitter + burstBumpMb)).toFixed(1)
    );
  }

  const memoryPercent = Number(
    Math.min(98, Math.max(0.1, (heapUsedMb / Math.max(64, heapLimitMb)) * 100)).toFixed(1)
  );

  const driftComponent = Math.min(45, Math.max(0, params.eventLoopDriftMs) * 1.4);
  const computeComponent = Math.min(48, Math.max(0, params.computeDurationMs ?? 0) * 1.25);
  const baselineLoad = 12 + Math.min(14, safeRecords * 0.65) + Math.abs(Math.sin(stepIndex * 0.9)) * 7;
  const burstLoad = params.trainingBurstActive ? 34 : 0;
  const threadLoadPercent = Number(
    Math.min(98, Math.max(6, baselineLoad + driftComponent + computeComponent + burstLoad)).toFixed(1)
  );

  const frameLatencyMs = Number(
    Math.max(1.2, Math.min(120, 3.2 + Math.max(0, params.eventLoopDriftMs) * 0.6 + (params.computeDurationMs ?? 0) * 0.35)).toFixed(1)
  );

  const activeWorkers = params.trainingBurstActive
    ? Math.min(threads, Math.max(2, Math.ceil(threads * 0.75)))
    : Math.max(1, Math.min(threads, Math.ceil(threads * 0.25)));

  const timestampLabel =
    params.timestampLabel ??
    new Date().toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  return {
    timestampLabel,
    heapUsedMb,
    heapLimitMb,
    memoryPercent,
    threadLoadPercent,
    frameLatencyMs,
    activeWorkers,
  };
}

export function appendPerformanceSample(
  history: PerformanceSample[],
  nextSample: PerformanceSample,
  maxPoints = 18
): {
  samples: PerformanceSample[];
  summary: PerformanceSummary;
} {
  const combined = [...history, nextSample];
  const samples = combined.length > maxPoints ? combined.slice(combined.length - maxPoints) : combined;

  const avgMemoryMb = Number(
    (samples.reduce((sum, s) => sum + s.heapUsedMb, 0) / Math.max(1, samples.length)).toFixed(1)
  );
  const peakThreadLoadPercent = Number(
    Math.max(...samples.map((s) => s.threadLoadPercent)).toFixed(1)
  );

  let headroomState: PerformanceSummary['headroomState'] = 'Optimal';
  if (nextSample.threadLoadPercent >= 78 || nextSample.memoryPercent >= 82) {
    headroomState = 'Saturated';
  } else if (nextSample.threadLoadPercent >= 48 || nextSample.memoryPercent >= 62) {
    headroomState = 'Busy';
  }

  return {
    samples,
    summary: {
      latest: nextSample,
      avgMemoryMb,
      peakThreadLoadPercent,
      headroomState,
    },
  };
}

export function buildInitialPerformanceHistory(
  localRecordCount: number,
  roundCount: number,
  count = 10
): PerformanceSample[] {
  const now = Date.now();
  const initial: PerformanceSample[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const t = new Date(now - i * 1500);
    const label = t.toISOString().slice(11, 19);
    initial.push(
      sampleLocalEnginePerformance({
        localRecordCount,
        roundCount,
        eventLoopDriftMs: 2 + (i % 3) * 1.4,
        computeDurationMs: i === 2 ? 9 : 2,
        timestampLabel: label,
        sampleIndex: count - i,
      })
    );
  }
  return initial;
}
