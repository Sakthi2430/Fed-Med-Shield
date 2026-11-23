import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Building2,
  Cpu,
  Database,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthPortal } from './components/AuthPortal';
import { ConvergenceChart } from './components/ConvergenceChart';
import { LocalPatientVault } from './components/LocalPatientVault';
import { LocalTrainingStudio } from './components/LocalTrainingStudio';
import { AdminOrchestrator } from './components/AdminOrchestrator';
import { NodeAndUserGovernance } from './components/NodeAndUserGovernance';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { PrivacyBudgetHeatmap } from './components/PrivacyBudgetHeatmap';
import { PrivacyLab } from './components/PrivacyLab';
import type {
  AggregationStrategy,
  AlertThresholds,
  AuditLog,
  AuthSession,
  GradientUpdate,
  HospitalNode,
  LocalPatientRecord,
  LocalTrainingResult,
  ModelWeights,
  NodeStatus,
  TrainingRound,
  UserProfile,
  UserRole,
} from './types/federated';
import {
  aggregateFedAvg,
  authenticateDemoCredentials,
  BOOTSTRAPPED_ADMIN_EMAIL,
  computeHexDigest,
  DEFAULT_ALERT_THRESHOLDS,
  evaluateNodeHealthAlerts,
  generateLocalCohortForNode,
  generateSyntheticPatientBatch,
  INITIAL_GLOBAL_WEIGHTS,
  runLocalTrainingEpoch,
  SEED_GRADIENT_UPDATES,
  SEED_HOSPITAL_NODES,
  SEED_SANDBOX_USERS,
  SEED_TRAINING_ROUNDS,
} from './utils/federatedEngine';

type WorkspaceTab =
  | 'overview'
  | 'vault'
  | 'training'
  | 'privacy'
  | 'orchestrator'
  | 'governance';

const TAB_LABELS: Record<WorkspaceTab, string> = {
  overview: 'Overview',
  vault: 'Patient Vault',
  training: 'Local Training',
  privacy: 'Privacy Lab',
  orchestrator: 'Orchestrator',
  governance: 'Governance',
};

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_');
  return (cleaned || 'id_01').slice(0, 120);
}

function getLocalStorageKey(nodeId: string): string {
  return `fedmed_local_enclave_records_v1_${nodeId}`;
}

function loadLocalRecords(nodeId: string): LocalPatientRecord[] {
  try {
    const raw = window.localStorage.getItem(getLocalStorageKey(nodeId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as LocalPatientRecord[];
      }
    }
  } catch {
    // Fallback to deterministic seed cohort
  }
  return generateLocalCohortForNode(nodeId);
}

function saveLocalRecords(nodeId: string, records: LocalPatientRecord[]) {
  try {
    window.localStorage.setItem(getLocalStorageKey(nodeId), JSON.stringify(records));
  } catch {
    // Ignore storage quota issues
  }
}

function AppContent() {
  const [session, setSession] = useState<AuthSession | null>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      const requestedRole = params.get('role') === 'admin' ? 'admin' : 'user';
      return {
        mode: 'sandbox',
        uid: requestedRole === 'admin' ? 'admin_coordinator_01' : 'clinician_cardio_01',
        email:
          requestedRole === 'admin'
            ? 'admin@fedmed.org'
            : 'user@hospital.org',
        displayName:
          requestedRole === 'admin'
            ? 'Dr. Elena Vance (Consortium Admin)'
            : 'Dr. Marcus Chen (Cardiology User)',
        role: requestedRole,
        hospitalNodeId: 'node_st_jude_cardio',
      };
    }
    return null;
  });

  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Consortium State
  const [nodes, setNodes] = useState<HospitalNode[]>(SEED_HOSPITAL_NODES);
  const [rounds, setRounds] = useState<TrainingRound[]>(SEED_TRAINING_ROUNDS);
  const [gradientUpdates, setGradientUpdates] =
    useState<GradientUpdate[]>(SEED_GRADIENT_UPDATES);
  const [users, setUsers] = useState<UserProfile[]>(SEED_SANDBOX_USERS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      logId: 'log_seed_001',
      actorUid: 'admin_coordinator_01',
      actorRole: 'admin',
      actionType: 'ROUND_AGGREGATED',
      targetId: 'round_005',
      summary: 'Round 5 completed via FedProx across 3 hospital enclaves (0 PHI rows transferred).',
      integrityHash: 'e2f94b10c83a56d719f2b48e3c70a6d5',
    },
  ]);

  const [globalWeights, setGlobalWeights] = useState<ModelWeights>(INITIAL_GLOBAL_WEIGHTS);
  const [alertThresholds, setAlertThresholds] = useState<AlertThresholds>(
    DEFAULT_ALERT_THRESHOLDS
  );

  // Strictly Local Patient Records (NEVER persisted to Firestore)
  const activeNodeId = session?.hospitalNodeId || 'node_st_jude_cardio';
  const [localRecords, setLocalRecords] = useState<LocalPatientRecord[]>(() =>
    loadLocalRecords(activeNodeId)
  );

  useEffect(() => {
    setLocalRecords(loadLocalRecords(activeNodeId));
  }, [activeNodeId]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setAuthReady(true);
        return;
      }

      try {
        const uid = sanitizeId(fbUser.uid);
        const email = fbUser.email || '';
        const isBootstrapped =
          fbUser.emailVerified && email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

        let isAdminUser = isBootstrapped;
        if (!isAdminUser) {
          try {
            const adminSnap = await getDoc(doc(db, 'admins', uid));
            if (adminSnap.exists()) {
              isAdminUser = true;
            }
          } catch {
            // Non-admin user cannot list admins; getDoc on own uid is permitted
          }
        }

        const userDocRef = doc(db, 'users', uid);
        let assignedNodeId = 'node_st_jude_cardio';
        let finalRole: UserRole = isAdminUser ? 'admin' : 'user';
        const displayName = fbUser.displayName || email.split('@')[0] || 'Clinical Researcher';

        const existingUser = await getDoc(userDocRef);
        if (!existingUser.exists()) {
          await setDoc(userDocRef, {
            uid,
            displayName: displayName.slice(0, 100),
            hospitalNodeId: assignedNodeId,
            role: finalRole,
            status: 'active',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          await setDoc(doc(db, 'users', uid, 'private', 'info'), {
            uid,
            email: email.slice(0, 160),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          const data = existingUser.data() as UserProfile;
          assignedNodeId = data.hospitalNodeId || assignedNodeId;
          finalRole = isAdminUser ? 'admin' : data.role || 'user';
        }

        // Seed consortium baseline in Firestore if admin signs in and nodes are empty
        if (finalRole === 'admin') {
          const existingNodes = await getDocs(
            query(
              collection(db, 'hospital_nodes'),
              where('status', 'in', ['active', 'pending', 'suspended'])
            )
          );
          if (existingNodes.empty) {
            const batch = writeBatch(db);
            for (const seedNode of SEED_HOSPITAL_NODES) {
              batch.set(doc(db, 'hospital_nodes', seedNode.nodeId), {
                ...seedNode,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }
            for (const seedRound of SEED_TRAINING_ROUNDS) {
              batch.set(doc(db, 'training_rounds', seedRound.roundId), {
                ...seedRound,
                aggregatorUid: uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }
            await batch.commit();
          }
        }

        setSession({
          mode: 'firebase',
          uid,
          email,
          displayName,
          role: finalRole,
          hospitalNodeId: assignedNodeId,
        });
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time Firestore listeners (ONLY when authenticated in Firebase mode)
  useEffect(() => {
    if (!authReady || !session || session.mode !== 'firebase') return;

    const nodesQuery = query(
      collection(db, 'hospital_nodes'),
      where('status', 'in', ['active', 'pending', 'suspended'])
    );
    const unsubNodes = onSnapshot(
      nodesQuery,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as HospitalNode);
        if (list.length > 0) setNodes(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'hospital_nodes')
    );

    const roundsQuery = query(
      collection(db, 'training_rounds'),
      where('status', 'in', ['open', 'aggregated'])
    );
    const unsubRounds = onSnapshot(
      roundsQuery,
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as TrainingRound)
          .sort((a, b) => a.roundNumber - b.roundNumber);
        if (list.length > 0) setRounds(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'training_rounds')
    );

    const updatesQuery =
      session.role === 'admin'
        ? collection(db, 'gradient_updates')
        : query(
            collection(db, 'gradient_updates'),
            where('submittedByUid', '==', session.uid)
          );
    const unsubUpdates = onSnapshot(
      updatesQuery,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as GradientUpdate);
        setGradientUpdates(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'gradient_updates')
    );

    const auditQuery =
      session.role === 'admin'
        ? collection(db, 'audit_logs')
        : query(collection(db, 'audit_logs'), where('actorUid', '==', session.uid));
    const unsubAudit = onSnapshot(
      auditQuery,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as AuditLog);
        setAuditLogs(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'audit_logs')
    );

    let unsubUsers = () => {};
    if (session.role === 'admin') {
      unsubUsers = onSnapshot(
        collection(db, 'users'),
        (snap) => {
          const list = snap.docs.map((d) => d.data() as UserProfile);
          setUsers(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'users')
      );
    }

    return () => {
      unsubNodes();
      unsubRounds();
      unsubUpdates();
      unsubAudit();
      unsubUsers();
    };
  }, [authReady, session]);

  const handleGoogleLogin = async (portalRole: UserRole, selectedNodeId: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const uid = sanitizeId(cred.user.uid);
      const email = cred.user.email || '';
      const isBootstrapped =
        cred.user.emailVerified && email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

      let isAdminUser = isBootstrapped;
      if (!isAdminUser) {
        try {
          const adminSnap = await getDoc(doc(db, 'admins', uid));
          isAdminUser = adminSnap.exists();
        } catch {
          isAdminUser = false;
        }
      }

      if (portalRole === 'admin' && !isAdminUser) {
        setAuthError(
          `Signed in as ${email} (Hospital User). This account is not yet in the Consortium Admin Registry; opening Hospital User workspace.`
        );
      }

      const userDocRef = doc(db, 'users', uid);
      const safeDisplayName = (
        cred.user.displayName ||
        email.split('@')[0] ||
        'Clinician'
      ).slice(0, 100);
      const safeNodeId = sanitizeId(selectedNodeId);

      const existingSnap = await getDoc(userDocRef);
      if (!existingSnap.exists()) {
        await setDoc(userDocRef, {
          uid,
          displayName: safeDisplayName,
          hospitalNodeId: safeNodeId,
          role: isAdminUser ? 'admin' : 'user',
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'users', uid, 'private', 'info'), {
          uid,
          email: email.slice(0, 160),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const existingData = existingSnap.data() as UserProfile;
        await updateDoc(userDocRef, {
          displayName: safeDisplayName,
          hospitalNodeId: safeNodeId,
          ...(isAdminUser && existingData.role !== 'admin' ? { role: 'admin' } : {}),
          updatedAt: serverTimestamp(),
        });
        setSession({
          mode: 'firebase',
          uid,
          email,
          displayName: safeDisplayName,
          role: isAdminUser ? 'admin' : existingData.role || 'user',
          hospitalNodeId: safeNodeId,
        });
      }
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setAuthError('Google sign-in popup was closed before completing authentication.');
      } else {
        const msg = err instanceof Error ? err.message : 'Google authentication failed.';
        setAuthError(msg);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDemoLogin = (
    usernameInput: string,
    passwordInput: string,
    selectedNodeId: string
  ): boolean => {
    const result = authenticateDemoCredentials(usernameInput, passwordInput);
    if (!result.ok) {
      setAuthError(result.error);
      return false;
    }

    setAuthError(null);
    setActiveTab('overview');
    setSession({
      mode: 'sandbox',
      uid: result.account.uid,
      email: result.account.username,
      displayName: result.account.displayName,
      role: result.account.role,
      hospitalNodeId: selectedNodeId || result.account.defaultNodeId,
    });
    return true;
  };

  const handleSwitchSandboxRole = (targetRole: UserRole) => {
    if (!session || session.mode !== 'sandbox') return;
    setActiveTab('overview');
    setSession({
      ...session,
      uid: targetRole === 'admin' ? 'admin_coordinator_01' : 'clinician_cardio_01',
      email: targetRole === 'admin' ? 'admin@fedmed.org' : 'user@hospital.org',
      displayName:
        targetRole === 'admin'
          ? 'Dr. Elena Vance (Consortium Admin)'
          : 'Dr. Marcus Chen (Cardiology User)',
      role: targetRole,
    });
  };

  const handleSignOut = async () => {
    if (session?.mode === 'firebase') {
      await signOut(auth);
    }
    setSession(null);
    setAuthError(null);
    setActiveTab('overview');
  };

  const activeNode = useMemo(() => {
    return (
      nodes.find((n) => n.nodeId === activeNodeId) ||
      nodes[0] ||
      SEED_HOSPITAL_NODES[0]
    );
  }, [nodes, activeNodeId]);

  const latestRound = useMemo(() => {
    if (rounds.length === 0) return null;
    return [...rounds].sort((a, b) => b.roundNumber - a.roundNumber)[0];
  }, [rounds]);

  const nodeHealthReport = useMemo(
    () => evaluateNodeHealthAlerts(nodes, rounds, gradientUpdates, alertThresholds),
    [nodes, rounds, gradientUpdates, alertThresholds]
  );

  const nextRoundNumber = (latestRound?.roundNumber || 0) + 1;

  // Local-only record creation
  const handleAddLocalRecord = (
    input: Omit<LocalPatientRecord, 'localId' | 'nodeId' | 'recordedDate'>
  ) => {
    const newRecord: LocalPatientRecord = {
      ...input,
      localId: `loc_${Date.now()}`,
      nodeId: activeNode.nodeId,
      recordedDate: new Date().toISOString().slice(0, 10),
    };
    const updated = [newRecord, ...localRecords];
    setLocalRecords(updated);
    saveLocalRecords(activeNode.nodeId, updated);
  };

  const handleBatchAddSynthetic = () => {
    const batch = generateSyntheticPatientBatch(activeNode.nodeId, localRecords.length + 1);
    const updated = [...batch, ...localRecords];
    setLocalRecords(updated);
    saveLocalRecords(activeNode.nodeId, updated);
  };

  // Submit DP Gradient Update
  const handleSubmitGradient = async (
    result: LocalTrainingResult,
    localEpochs: number,
    sampleCount: number
  ) => {
    if (!session) return;
    const updateId = `upd_r${nextRoundNumber}_${Date.now()}`;
    const newUpdate: GradientUpdate = {
      updateId,
      roundNumber: nextRoundNumber,
      nodeId: activeNode.nodeId,
      submittedByUid: session.uid,
      sampleCount,
      localEpochs,
      localAccuracy: result.localAccuracy,
      localLoss: result.localLoss,
      l2Norm: result.l2Norm,
      epsilonDelta: result.epsilonDelta,
      gradientDigest: result.gradientDigest,
      weightDeltas: result.clippedNoisedDeltas,
      phiScanPassed: result.phiScanPassed,
      status: 'pending',
    };

    const logId = `log_${Date.now()}`;
    const newLog: AuditLog = {
      logId,
      actorUid: session.uid,
      actorRole: session.role,
      actionType: 'GRADIENT_SUBMITTED',
      targetId: updateId,
      summary: `${activeNode.name} submitted zero-PHI gradient packet (+${result.epsilonDelta.toFixed(
        3
      )} ε) for Round ${nextRoundNumber}.`,
      integrityHash: result.gradientDigest,
    };

    if (session.mode === 'firebase') {
      try {
        await setDoc(doc(db, 'gradient_updates', updateId), {
          ...newUpdate,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'audit_logs', logId), {
          ...newLog,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `gradient_updates/${updateId}`);
      }
    } else {
      setGradientUpdates((prev) => [newUpdate, ...prev]);
      setAuditLogs((prev) => [newLog, ...prev]);
      setNodes((prev) =>
        prev.map((n) =>
          n.nodeId === activeNode.nodeId
            ? {
                ...n,
                localAccuracy: result.localAccuracy,
                privacyBudgetUsed: Number(
                  (n.privacyBudgetUsed + result.epsilonDelta).toFixed(3)
                ),
              }
            : n
        )
      );
    }
  };

  // Admin: Execute Single Global Aggregation Round
  const handleRunGlobalRound = async (
    strategy: AggregationStrategy,
    noiseMultiplier: number
  ) => {
    if (!session || session.role !== 'admin') return;
    const pending = gradientUpdates.filter((u) => u.status === 'pending');
    if (pending.length === 0) return;

    const { nextWeights, nextRound } = aggregateFedAvg({
      pendingUpdates: pending,
      currentWeights: globalWeights,
      lastRound: latestRound,
      strategy,
      noiseMultiplier,
      aggregatorUid: session.uid,
    });

    const logId = `log_agg_${Date.now()}`;
    const newLog: AuditLog = {
      logId,
      actorUid: session.uid,
      actorRole: 'admin',
      actionType: 'ROUND_AGGREGATED',
      targetId: nextRound.roundId,
      summary: `Round ${nextRound.roundNumber} (${strategy}) reached ${nextRound.globalAccuracy}% accuracy across ${nextRound.participatingNodesCount} enclaves.`,
      integrityHash: nextRound.modelHash,
    };

    if (session.mode === 'firebase') {
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'training_rounds', nextRound.roundId), {
          ...nextRound,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        for (const upd of pending) {
          batch.update(doc(db, 'gradient_updates', upd.updateId), {
            status: 'aggregated',
            updatedAt: serverTimestamp(),
          });
        }
        batch.set(doc(db, 'audit_logs', logId), {
          ...newLog,
          createdAt: serverTimestamp(),
        });
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `training_rounds/${nextRound.roundId}`);
      }
    } else {
      setRounds((prev) => [...prev, nextRound]);
      setGradientUpdates((prev) =>
        prev.map((u) =>
          u.status === 'pending' ? { ...u, status: 'aggregated' } : u
        )
      );
      setAuditLogs((prev) => [newLog, ...prev]);
    }

    setGlobalWeights(nextWeights);
  };

  // Admin: Multi-Round Automated Simulation across Active Nodes
  const handleAutoRunRounds = async (
    count: number,
    strategy: AggregationStrategy,
    noiseMultiplier: number
  ) => {
    if (!session || session.role !== 'admin') return;

    const activeNodes = nodes.filter((n) => n.status === 'active');
    const participating = activeNodes.length > 0 ? activeNodes : nodes.slice(0, 2);

    let runningWeights = globalWeights;
    let runningLastRound = latestRound;
    let runningNodes = [...nodes];
    const generatedRounds: TrainingRound[] = [];
    const generatedUpdates: GradientUpdate[] = [];
    const generatedLogs: AuditLog[] = [];

    for (let step = 0; step < count; step += 1) {
      const targetRoundNum = (runningLastRound?.roundNumber || 0) + 1;
      const roundPackets: GradientUpdate[] = participating.map((node, idx) => {
        const cohort = generateLocalCohortForNode(node.nodeId);
        const epochResult = runLocalTrainingEpoch(cohort, runningWeights, {
          localEpochs: 4,
          learningRate: 0.05,
          clippingNorm: 1.0,
          noiseMultiplier,
          targetEpsilon: Math.max(0.5, node.privacyBudgetCap - node.privacyBudgetUsed),
          nodeId: node.nodeId,
        });

        const upd: GradientUpdate = {
          updateId: `upd_sim_r${targetRoundNum}_${idx}_${Date.now()}`,
          roundNumber: targetRoundNum,
          nodeId: node.nodeId,
          submittedByUid: session.uid,
          sampleCount: node.localRecordCount,
          localEpochs: 4,
          localAccuracy: epochResult.localAccuracy,
          localLoss: epochResult.localLoss,
          l2Norm: epochResult.l2Norm,
          epsilonDelta: epochResult.epsilonDelta,
          gradientDigest: epochResult.gradientDigest,
          weightDeltas: epochResult.clippedNoisedDeltas,
          phiScanPassed: epochResult.phiScanPassed,
          status: 'aggregated',
        };

        runningNodes = runningNodes.map((n) =>
          n.nodeId === node.nodeId
            ? {
                ...n,
                localAccuracy: Number(
                  Math.min(97.5, Math.max(n.localAccuracy, epochResult.localAccuracy)).toFixed(1)
                ),
                privacyBudgetUsed: Number(
                  Math.min(100, n.privacyBudgetUsed + epochResult.epsilonDelta).toFixed(3)
                ),
                lastSyncRound: targetRoundNum,
              }
            : n
        );

        return upd;
      });

      const { nextWeights, nextRound } = aggregateFedAvg({
        pendingUpdates: roundPackets,
        currentWeights: runningWeights,
        lastRound: runningLastRound,
        strategy,
        noiseMultiplier,
        aggregatorUid: session.uid,
      });

      const logItem: AuditLog = {
        logId: `log_sim_r${targetRoundNum}_${Date.now()}`,
        actorUid: session.uid,
        actorRole: 'admin',
        actionType: 'ROUND_AGGREGATED',
        targetId: nextRound.roundId,
        summary: `Simulated Round ${nextRound.roundNumber} (${strategy}) reached ${nextRound.globalAccuracy}% accuracy across ${nextRound.participatingNodesCount} enclaves.`,
        integrityHash: nextRound.modelHash,
      };

      generatedRounds.push(nextRound);
      generatedUpdates.push(...roundPackets);
      generatedLogs.push(logItem);
      runningWeights = nextWeights;
      runningLastRound = nextRound;
    }

    if (session.mode === 'firebase') {
      try {
        const batch = writeBatch(db);
        for (const r of generatedRounds) {
          batch.set(doc(db, 'training_rounds', r.roundId), {
            ...r,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        for (const u of generatedUpdates) {
          batch.set(doc(db, 'gradient_updates', u.updateId), {
            ...u,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        for (const n of runningNodes) {
          batch.update(doc(db, 'hospital_nodes', n.nodeId), {
            localAccuracy: n.localAccuracy,
            privacyBudgetUsed: n.privacyBudgetUsed,
            lastSyncRound: n.lastSyncRound,
            updatedAt: serverTimestamp(),
          });
        }
        for (const l of generatedLogs) {
          batch.set(doc(db, 'audit_logs', l.logId), {
            ...l,
            createdAt: serverTimestamp(),
          });
        }
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'training_rounds');
      }
    } else {
      setRounds((prev) => [...prev, ...generatedRounds]);
      setGradientUpdates((prev) => [
        ...generatedUpdates,
        ...prev.map((u) => (u.status === 'pending' ? { ...u, status: 'aggregated' as const } : u)),
      ]);
      setNodes(runningNodes);
      setAuditLogs((prev) => [...generatedLogs.reverse(), ...prev]);
    }

    setGlobalWeights(runningWeights);
  };

  // Admin: Node Governance
  const handleUpdateNodeStatus = async (nodeId: string, status: NodeStatus) => {
    if (!session || session.role !== 'admin') return;
    const logId = `log_node_${Date.now()}`;
    const newLog: AuditLog = {
      logId,
      actorUid: session.uid,
      actorRole: 'admin',
      actionType: 'NODE_STATUS_CHANGED',
      targetId: nodeId,
      summary: `Consortium Admin updated node ${nodeId} status to ${status}.`,
      integrityHash: computeHexDigest(`${nodeId}:${status}:${logId}`),
    };

    if (session.mode === 'firebase') {
      try {
        await updateDoc(doc(db, 'hospital_nodes', nodeId), {
          status,
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'audit_logs', logId), {
          ...newLog,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `hospital_nodes/${nodeId}`);
      }
    } else {
      setNodes((prev) =>
        prev.map((n) => (n.nodeId === nodeId ? { ...n, status } : n))
      );
      setAuditLogs((prev) => [newLog, ...prev]);
    }
  };

  const handleExtendPrivacyCap = async (nodeId: string, deltaEpsilon: number) => {
    if (!session || session.role !== 'admin') return;
    const target = nodes.find((n) => n.nodeId === nodeId);
    if (!target) return;

    const nextCap = Number(Math.min(100, target.privacyBudgetCap + deltaEpsilon).toFixed(1));
    const logId = `log_cap_${Date.now()}`;
    const newLog: AuditLog = {
      logId,
      actorUid: session.uid,
      actorRole: 'admin',
      actionType: 'PRIVACY_CAP_EXTENDED',
      targetId: nodeId,
      summary: `Extended ${target.name} privacy cap from ${target.privacyBudgetCap.toFixed(1)} ε to ${nextCap.toFixed(1)} ε.`,
      integrityHash: computeHexDigest(`${nodeId}:${nextCap}:${logId}`),
    };

    if (session.mode === 'firebase') {
      try {
        await updateDoc(doc(db, 'hospital_nodes', nodeId), {
          privacyBudgetCap: nextCap,
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'audit_logs', logId), {
          ...newLog,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `hospital_nodes/${nodeId}`);
      }
    } else {
      setNodes((prev) =>
        prev.map((n) => (n.nodeId === nodeId ? { ...n, privacyBudgetCap: nextCap } : n))
      );
      setAuditLogs((prev) => [newLog, ...prev]);
    }
  };

  const handleSimulateNodeAnomaly = async (
    nodeId: string,
    mode: 'accuracy_drop' | 'budget_breach' | 'restore'
  ) => {
    if (!session || session.role !== 'admin') return;
    const target = nodes.find((n) => n.nodeId === nodeId);
    if (!target) return;

    const seedBaseline = SEED_HOSPITAL_NODES.find((n) => n.nodeId === nodeId);
    let nextAcc = target.localAccuracy;
    let nextUsed = target.privacyBudgetUsed;
    let nextCap = target.privacyBudgetCap;
    let nextStatus = target.status;
    let actionType = 'ANOMALY_TEST_INJECTED';
    let summary = '';

    if (mode === 'accuracy_drop') {
      nextAcc = Number(Math.max(68.0, (latestRound?.globalAccuracy ?? 92.1) - 12.4).toFixed(1));
      summary = `Health monitor test: ${target.name} local accuracy dropped to ${nextAcc.toFixed(1)}%.`;
    } else if (mode === 'budget_breach') {
      nextUsed = Number(Math.min(99.5, target.privacyBudgetCap + 0.85).toFixed(2));
      summary = `Health monitor test: ${target.name} exceeded privacy cap (${nextUsed.toFixed(2)} / ${target.privacyBudgetCap.toFixed(1)} ε).`;
    } else {
      actionType = 'NODE_BASELINE_RESTORED';
      nextAcc = seedBaseline?.localAccuracy ?? 91.2;
      nextUsed = Math.min(seedBaseline?.privacyBudgetUsed ?? 2.4, target.privacyBudgetCap * 0.55);
      nextCap = seedBaseline?.privacyBudgetCap ?? target.privacyBudgetCap;
      nextStatus = seedBaseline?.status ?? 'active';
      summary = `Restored healthy telemetry baseline for ${target.name}.`;
    }

    const logId = `log_anom_${Date.now()}`;
    const newLog: AuditLog = {
      logId,
      actorUid: session.uid,
      actorRole: 'admin',
      actionType,
      targetId: nodeId,
      summary,
      integrityHash: computeHexDigest(`${nodeId}:${mode}:${logId}`),
    };

    if (session.mode === 'firebase') {
      try {
        await updateDoc(doc(db, 'hospital_nodes', nodeId), {
          localAccuracy: nextAcc,
          privacyBudgetUsed: nextUsed,
          privacyBudgetCap: nextCap,
          status: nextStatus,
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'audit_logs', logId), {
          ...newLog,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `hospital_nodes/${nodeId}`);
      }
    } else {
      setNodes((prev) =>
        prev.map((n) =>
          n.nodeId === nodeId
            ? {
                ...n,
                localAccuracy: nextAcc,
                privacyBudgetUsed: nextUsed,
                privacyBudgetCap: nextCap,
                status: nextStatus,
              }
            : n
        )
      );
      setAuditLogs((prev) => [newLog, ...prev]);
    }
  };

  const handleRegisterNode = async (input: {
    name: string;
    department: string;
    region: string;
    privacyBudgetCap: number;
  }) => {
    if (!session || session.role !== 'admin') return;
    const nodeId = sanitizeId(`node_${input.name.toLowerCase().slice(0, 16)}_${Date.now()}`);
    const newNode: HospitalNode = {
      nodeId,
      name: input.name,
      department: input.department,
      region: input.region,
      ownerUid: session.uid,
      status: 'active',
      localRecordCount: 1850,
      localAccuracy: 88.4,
      privacyBudgetUsed: 0,
      privacyBudgetCap: input.privacyBudgetCap,
      nonIidSkew: 0.21,
      lastSyncRound: latestRound?.roundNumber || 0,
    };

    const logId = `log_reg_${Date.now()}`;
    const newLog: AuditLog = {
      logId,
      actorUid: session.uid,
      actorRole: 'admin',
      actionType: 'NODE_ONBOARDED',
      targetId: nodeId,
      summary: `Onboarded new active hospital enclave: ${input.name} (${input.region}).`,
      integrityHash: computeHexDigest(`${nodeId}:${input.name}`),
    };

    if (session.mode === 'firebase') {
      try {
        await setDoc(doc(db, 'hospital_nodes', nodeId), {
          ...newNode,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'audit_logs', logId), {
          ...newLog,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `hospital_nodes/${nodeId}`);
      }
    } else {
      setNodes((prev) => [...prev, newNode]);
      setAuditLogs((prev) => [newLog, ...prev]);
    }
  };

  // Admin: Toggle User Role
  const handleToggleUserRole = async (targetUid: string, nextRole: UserRole) => {
    if (!session || session.role !== 'admin') return;
    const logId = `log_rbac_${Date.now()}`;
    const newLog: AuditLog = {
      logId,
      actorUid: session.uid,
      actorRole: 'admin',
      actionType: 'RBAC_ROLE_UPDATED',
      targetId: targetUid,
      summary: `Updated account ${targetUid} role to ${nextRole}.`,
      integrityHash: computeHexDigest(`${targetUid}:${nextRole}:${logId}`),
    };

    if (session.mode === 'firebase') {
      try {
        await updateDoc(doc(db, 'users', targetUid), {
          role: nextRole,
          updatedAt: serverTimestamp(),
        });
        if (nextRole === 'admin') {
          await setDoc(doc(db, 'admins', targetUid), {
            uid: targetUid,
            grantedBy: session.uid,
            createdAt: serverTimestamp(),
          });
        } else {
          await deleteDoc(doc(db, 'admins', targetUid));
        }
        await setDoc(doc(db, 'audit_logs', logId), {
          ...newLog,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
      }
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.uid === targetUid ? { ...u, role: nextRole } : u))
      );
      setAuditLogs((prev) => [newLog, ...prev]);
    }
  };

  // Admin: Record Compliance JSON / PDF Export in Audit Ledger
  const handleRecordComplianceExport = async (meta: {
    reportId: string;
    summary: string;
    integrityHash: string;
    actionType?: 'COMPLIANCE_REPORT_EXPORTED' | 'COMPLIANCE_PDF_EXPORTED';
  }) => {
    if (!session || session.role !== 'admin') return;
    const logId = `log_exp_${Date.now()}`;
    const newLog: AuditLog = {
      logId,
      actorUid: session.uid,
      actorRole: 'admin',
      actionType: meta.actionType ?? 'COMPLIANCE_REPORT_EXPORTED',
      targetId: sanitizeId(meta.reportId),
      summary: meta.summary.slice(0, 280),
      integrityHash: meta.integrityHash,
    };

    if (session.mode === 'firebase') {
      try {
        await setDoc(doc(db, 'audit_logs', logId), {
          ...newLog,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `audit_logs/${logId}`);
      }
    } else {
      setAuditLogs((prev) => [newLog, ...prev]);
    }
  };

  if (!authReady && !session) {
    return (
      <div className="min-h-screen bg-[#f4f7f6] flex items-center justify-center">
        <div className="text-sm font-medium text-slate-600">
          Initializing FedMed Shield security context...
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <AuthPortal
        nodes={nodes}
        authLoading={authLoading}
        authError={authError}
        onClearError={() => setAuthError(null)}
        onGoogleLogin={handleGoogleLogin}
        onDemoLogin={handleDemoLogin}
      />
    );
  }

  const navItems: {
    id: WorkspaceTab;
    label: string;
    icon: React.ReactNode;
    adminOnly?: boolean;
  }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'vault',
      label: 'Patient Vault',
      icon: <Database className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'training',
      label: 'Local Training',
      icon: <Cpu className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'privacy',
      label: 'Privacy Lab',
      icon: <ShieldAlert className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'orchestrator',
      label: 'Orchestrator',
      icon: <SlidersHorizontal className="w-4 h-4 shrink-0" />,
      adminOnly: true,
    },
    {
      id: 'governance',
      label: 'Governance',
      icon: <Building2 className="w-4 h-4 shrink-0" />,
      adminOnly: true,
    },
  ];

  const visibleNavItems = navItems.filter(
    (item) => !item.adminOnly || session.role === 'admin'
  );

  const totalConsortiumRecords = nodes.reduce((acc, n) => acc + n.localRecordCount, 0);
  const activeEnclaveCount = nodes.filter((n) => n.status === 'active').length;
  const nodeUpdates = gradientUpdates.filter((u) => u.nodeId === activeNode.nodeId);

  return (
    <div className="min-h-screen bg-[#f4f7f6] flex flex-col">
      {/* Top Single-Row Command Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg cursor-pointer shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
              <ShieldCheck className="w-5 h-5 text-teal-700" aria-hidden="true" />
              <span className="font-display text-base font-bold tracking-tight text-slate-900">
                FedMed Shield
              </span>
            </div>

            <span className="hidden lg:inline text-slate-300">|</span>
            <span className="hidden lg:inline text-xs text-slate-600 truncate">
              {activeNode.name}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden xl:inline-flex items-center gap-1.5 text-xs font-mono text-emerald-700 whitespace-nowrap">
              <Lock className="w-3.5 h-3.5" />
              <span>Zero-PHI Mode Active</span>
            </span>

            <div className="hidden sm:block text-right leading-tight">
              <p className="text-xs font-semibold text-slate-900 whitespace-nowrap">
                {session.displayName}
              </p>
              <p className="text-[11px] font-mono text-teal-700 whitespace-nowrap">
                {session.role === 'admin' ? 'Consortium Admin' : 'Hospital User'}
              </p>
            </div>

            {session.mode === 'sandbox' && (
              <button
                type="button"
                onClick={() =>
                  handleSwitchSandboxRole(session.role === 'admin' ? 'user' : 'admin')
                }
                className="hidden sm:inline-flex px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Switch to {session.role === 'admin' ? 'User' : 'Admin'}
              </button>
            )}

            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Horizontal Command Tabs (Desktop & Tablet) */}
        <nav
          aria-label="Workspace navigation"
          className="hidden md:block border-t border-slate-100 bg-white"
        >
          <div className="max-w-7xl mx-auto px-4 lg:px-8 flex items-center gap-1 overflow-x-auto">
            {visibleNavItems.map((item) => {
              const isActive = activeTab === item.id;
              const alertSuffix =
                item.id === 'governance' && nodeHealthReport.alerts.length > 0
                  ? ` (${nodeHealthReport.alerts.length})`
                  : '';
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'border-teal-700 text-teal-800 bg-teal-50/40'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {item.icon}
                  <span>
                    {item.label}
                    {alertSuffix && (
                      <span
                        className={
                          nodeHealthReport.criticalCount > 0
                            ? 'text-rose-700 font-mono font-semibold'
                            : 'text-amber-700 font-mono font-semibold'
                        }
                      >
                        {alertSuffix}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative w-64 max-w-xs bg-white h-full border-r border-slate-200 flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <span className="font-display text-base font-bold text-slate-900">
                FedMed Shield
              </span>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileNavOpen(false)}
                className="p-1 text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {visibleNavItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileNavOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap cursor-pointer ${
                    activeTab === item.id
                      ? 'bg-teal-50 text-teal-800'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
            {session.mode === 'sandbox' && (
              <div className="p-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    handleSwitchSandboxRole(session.role === 'admin' ? 'user' : 'admin');
                    setMobileNavOpen(false);
                  }}
                  className="w-full px-3 py-2 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg cursor-pointer"
                >
                  Switch to {session.role === 'admin' ? 'Hospital User' : 'Admin'} View
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Workspace Canvas */}
      <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-display text-xl lg:text-2xl font-bold text-slate-900">
            {TAB_LABELS[activeTab]}
          </h1>
          <span className="text-xs font-mono text-slate-500">
            {activeNode.department} · {activeNode.region}
          </span>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            {session.role === 'admin' && nodeHealthReport.alerts.length > 0 && (
              <div
                role="status"
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  nodeHealthReport.criticalCount > 0
                    ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                    : 'bg-amber-50/80 border-amber-200 text-amber-900'
                }`}
              >
                <div className="text-xs leading-relaxed">
                  <strong className="font-semibold">
                    Node Health Alert System: {nodeHealthReport.alerts.length} active anomaly
                    alert(s)
                  </strong>{' '}
                  ({nodeHealthReport.criticalCount} critical, {nodeHealthReport.warningCount}{' '}
                  warning) detected across {nodeHealthReport.affectedNodeCount} hospital enclave(s).
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('governance')}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-slate-900 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Inspect Alerts in Governance
                </button>
              </div>
            )}

            {/* User-Friendly Guided 3-Step Federated Pipeline */}
            <section
              aria-label="Guided federated workflow"
              className="bg-white border border-slate-200 rounded-xl p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">
                    Privacy-Preserving Federated Workflow
                  </h2>
                  <p className="text-xs text-slate-600">
                    Follow these three steps to keep patient records safe while improving global
                    clinical predictions.
                  </p>
                </div>
                <span className="text-xs font-mono text-teal-700">
                  {localRecords.length} local records loaded
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('vault')}
                  className="text-left p-4 rounded-lg bg-slate-50 border border-slate-200 hover:border-teal-300 hover:bg-teal-50/40 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-teal-700 mb-1">
                    <span>Step 1 · Local Storage</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    Keep Patient Records Local
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    Add EHR rows, load synthetic batches, or test What-If patient risk locally.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('training')}
                  className="text-left p-4 rounded-lg bg-slate-50 border border-slate-200 hover:border-teal-300 hover:bg-teal-50/40 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-teal-700 mb-1">
                    <span>Step 2 · Differential Privacy</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    Train &amp; Protect Gradients
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    Run local SGD epochs, apply L2 clipping + noise, and verify Zero-PHI scan.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActiveTab(session.role === 'admin' ? 'orchestrator' : 'privacy')
                  }
                  className="text-left p-4 rounded-lg bg-slate-50 border border-slate-200 hover:border-teal-300 hover:bg-teal-50/40 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-teal-700 mb-1">
                    <span>
                      Step 3 · {session.role === 'admin' ? 'Global Merge' : 'Attack Stress Test'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {session.role === 'admin'
                      ? 'Aggregate FedAvg / FedProx'
                      : 'Test Privacy Lab & Fairness'}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {session.role === 'admin'
                      ? 'Combine multi-hospital weight deltas or auto-run 3 simulation rounds.'
                      : 'Measure membership inference resistance and cross-hospital accuracy lift.'}
                  </p>
                </button>
              </div>
            </section>

            {/* Top 4 KPI Metrics */}
            <section
              aria-label="Federated consortium telemetry"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-xs font-medium text-slate-500">
                  Global Model Accuracy
                </p>
                <p className="text-3xl font-mono font-bold tabular-nums text-slate-900 mt-1.5">
                  {(latestRound?.globalAccuracy ?? 80.0).toFixed(1)}%
                </p>
                <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                  Round {latestRound?.roundNumber ?? 0} · AUC {(latestRound?.aucRoc ?? 0.8).toFixed(3)}
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-xs font-medium text-slate-500">
                  Local Records Protected
                </p>
                <p className="text-3xl font-mono font-bold tabular-nums text-slate-900 mt-1.5">
                  {totalConsortiumRecords.toLocaleString()}
                </p>
                <p className="text-xs text-emerald-700 mt-1">
                  0 raw patient rows transmitted
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-xs font-medium text-slate-500">
                  Cumulative Privacy (ε)
                </p>
                <p className="text-3xl font-mono font-bold tabular-nums text-slate-900 mt-1.5">
                  {(latestRound?.epsilonSpent ?? 0).toFixed(2)} ε
                </p>
                <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                  σ = {(latestRound?.noiseMultiplier ?? 1.05).toFixed(2)} Gaussian DP
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-xs font-medium text-slate-500">
                  Active Hospital Enclaves
                </p>
                <p className="text-3xl font-mono font-bold tabular-nums text-slate-900 mt-1.5">
                  {activeEnclaveCount} / {nodes.length}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Assigned: {activeNode.department}
                </p>
              </div>
            </section>

            {/* Convergence Chart + Enclave Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Federated Learning Convergence
                    </h2>
                    <p className="text-xs text-slate-600">
                      Global model improvement across rounds without centralized patient storage
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    Strategy: {latestRound?.strategy ?? 'FedProx'}
                  </span>
                </div>
                <ConvergenceChart rounds={rounds} />
              </section>

              <section className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2 text-xs font-medium text-teal-700">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Enclave Quick Launch</span>
                </div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  {activeNode.name}
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your local cohort contains{' '}
                  <strong className="font-mono text-slate-900">{localRecords.length}</strong>{' '}
                  interactive records in-browser ({activeNode.localRecordCount.toLocaleString()}{' '}
                  total enclave volume).
                </p>

                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('vault')}
                    className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors cursor-pointer"
                  >
                    Open Patient Vault &amp; What-If Tool
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('training')}
                    className="w-full px-4 py-2.5 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Train Local Epoch &amp; Submit Gradient
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('privacy')}
                    className="w-full px-4 py-2.5 text-sm font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors cursor-pointer"
                  >
                    Open Privacy Lab &amp; Fairness Explorer
                  </button>
                  {session.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('orchestrator')}
                      className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Open Global Round Orchestrator
                    </button>
                  )}
                </div>
              </section>
            </div>

            {/* Privacy Budget Consumption Heat Map */}
            <PrivacyBudgetHeatmap
              nodes={nodes}
              rounds={rounds}
              gradientUpdates={gradientUpdates}
            />

            {/* Real-Time Local Training Engine Performance Monitor */}
            <PerformanceMonitor
              localRecords={localRecords}
              globalWeights={globalWeights}
              activeNodeId={activeNode.nodeId}
              roundCount={rounds.length}
            />

            {/* Participating Hospital Enclaves Summary */}
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-slate-900">
                  Participating Consortium Enclaves
                </h3>
                <span className="text-xs text-slate-500">
                  Aggregate telemetry only · Local EHR isolated
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                      <th className="py-2.5 px-4">Hospital Enclave</th>
                      <th className="py-2.5 px-3">Department · Region</th>
                      <th className="py-2.5 px-3 text-right">Local Samples</th>
                      <th className="py-2.5 px-3 text-right">Local Acc</th>
                      <th className="py-2.5 px-3 text-right">ε Budget Used</th>
                      <th className="py-2.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {nodes.map((node) => (
                      <tr key={node.nodeId} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-medium text-slate-900">
                          {node.name}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-slate-600">
                          {node.department} · {node.region}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                          {node.localRecordCount.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                          {node.localAccuracy.toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                          {node.privacyBudgetUsed.toFixed(2)} / {node.privacyBudgetCap.toFixed(1)}
                        </td>
                        <td className="py-2.5 px-4 text-xs font-medium">
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'vault' && (
          <LocalPatientVault
            nodeName={activeNode.name}
            nodeId={activeNode.nodeId}
            records={localRecords}
            globalWeights={globalWeights}
            onAddRecord={handleAddLocalRecord}
            onBatchAddSynthetic={handleBatchAddSynthetic}
          />
        )}

        {activeTab === 'training' && (
          <LocalTrainingStudio
            activeNode={activeNode}
            localRecords={localRecords}
            globalWeights={globalWeights}
            currentRoundNumber={nextRoundNumber}
            nodeUpdates={nodeUpdates}
            onSubmitGradient={handleSubmitGradient}
          />
        )}

        {activeTab === 'privacy' && (
          <PrivacyLab nodes={nodes} rounds={rounds} />
        )}

        {activeTab === 'orchestrator' && session.role === 'admin' && (
          <AdminOrchestrator
            nodes={nodes}
            rounds={rounds}
            gradientUpdates={gradientUpdates}
            auditLogs={auditLogs}
            onRunGlobalRound={handleRunGlobalRound}
            onAutoRunRounds={handleAutoRunRounds}
          />
        )}

        {activeTab === 'governance' && session.role === 'admin' && (
          <NodeAndUserGovernance
            nodes={nodes}
            rounds={rounds}
            users={users}
            auditLogs={auditLogs}
            currentUser={{
              uid: session.uid,
              displayName: session.displayName,
              role: session.role,
              authMode: session.mode,
            }}
            healthReport={nodeHealthReport}
            alertThresholds={alertThresholds}
            onUpdateAlertThresholds={setAlertThresholds}
            onUpdateNodeStatus={handleUpdateNodeStatus}
            onExtendPrivacyCap={handleExtendPrivacyCap}
            onSimulateNodeAnomaly={handleSimulateNodeAnomaly}
            onRegisterNode={handleRegisterNode}
            onToggleUserRole={handleToggleUserRole}
            onRecordComplianceExport={handleRecordComplianceExport}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
