import React, { useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Cpu,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import type { HospitalNode, UserRole } from '../types/federated';
import { DEMO_ACCOUNTS } from '../utils/federatedEngine';

interface AuthPortalProps {
  nodes: HospitalNode[];
  authLoading: boolean;
  authError: string | null;
  onClearError: () => void;
  onGoogleLogin: (portalRole: UserRole, selectedNodeId: string) => Promise<void>;
  onDemoLogin: (username: string, password: string, selectedNodeId: string) => boolean;
}

export const AuthPortal: React.FC<AuthPortalProps> = ({
  nodes,
  authLoading,
  authError,
  onClearError,
  onGoogleLogin,
  onDemoLogin,
}) => {
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const [selectedPortalRole, setSelectedPortalRole] = useState<UserRole>('user');
  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    nodes[0]?.nodeId || 'node_st_jude_cardio'
  );
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const activeNodes = nodes.filter((n) => n.status === 'active');
  const nodeChoices = activeNodes.length > 0 ? activeNodes : nodes;

  const userDemo = DEMO_ACCOUNTS.find((a) => a.role === 'user') || DEMO_ACCOUNTS[0];
  const adminDemo = DEMO_ACCOUNTS.find((a) => a.role === 'admin') || DEMO_ACCOUNTS[1];

  const openSignInWithRole = (role?: UserRole, prefillDemo = false) => {
    onClearError();
    const nextRole = role || selectedPortalRole;
    setSelectedPortalRole(nextRole);
    if (prefillDemo) {
      const target = nextRole === 'admin' ? adminDemo : userDemo;
      setUsername(target.username);
      setPassword(target.password);
    }
    setSignInModalOpen(true);
  };

  const handleFillDemo = (role: UserRole) => {
    onClearError();
    setSelectedPortalRole(role);
    const target = role === 'admin' ? adminDemo : userDemo;
    setUsername(target.username);
    setPassword(target.password);
  };

  const handleCredentialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onDemoLogin(username, password, selectedNodeId);
  };

  return (
    <div className="min-h-screen bg-[#f4f7f6] flex flex-col">
      {/* Top Single-Row Navigation */}
      <header className="w-full bg-white border-b border-slate-200 px-6 lg:px-10 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <ShieldCheck className="w-5 h-5 text-teal-700" aria-hidden="true" />
            <span className="font-display text-lg font-bold tracking-tight text-slate-900">
              FedMed Shield
            </span>
          </div>

          <nav
            aria-label="Platform overview"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
          >
            <a href="#workflow" className="hover:text-teal-800 whitespace-nowrap shrink-0">
              How It Works
            </a>
            <a href="#guarantees" className="hover:text-teal-800 whitespace-nowrap shrink-0">
              Privacy Guarantees
            </a>
            <a href="#demo-access" className="hover:text-teal-800 whitespace-nowrap shrink-0">
              Demo Credentials
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => openSignInWithRole('user', false)}
              className="px-4 py-2 text-sm font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-10 py-10 lg:py-14 space-y-12">
        {/* Hero Split Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-5">
            <p className="text-xs font-medium text-teal-700">
              Federated Healthcare Analytics · Zero-PHI Consortium
            </p>
            <h1 className="font-display text-3xl lg:text-5xl font-bold tracking-tight text-slate-900 text-balance leading-tight">
              Train clinical AI across hospitals while patient records stay locked locally
            </h1>
            <p className="text-base text-slate-600 leading-relaxed max-w-xl">
              FedMed Shield keeps every patient record inside its local hospital vault. Only
              clipped, differentially private weight updates are shared to improve global cardiac
              and metabolic risk detection.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => openSignInWithRole('user', false)}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors cursor-pointer"
              >
                <span>Sign In to Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => openSignInWithRole('admin', true)}
                className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-teal-800 bg-white border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>Try Admin Demo</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="rounded-lg overflow-hidden bg-slate-100 aspect-[4/3] w-full">
                {!imageFailed ? (
                  <img
                    src="/src/assets/images/federated_healthcare_network_1795437391577.jpg"
                    alt="Isometric architecture diagram showing four hospital enclaves keeping patient records locked locally while transmitting encrypted model weights to a central shield coordinator"
                    referrerPolicy="no-referrer"
                    onError={() => setImageFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-100">
                    <Database className="w-8 h-8 text-teal-700 mb-2" />
                    <p className="text-sm font-medium text-slate-800">
                      Decentralized Hospital Enclave Topology
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Plain-English 3-Step Guided Overview */}
        <section id="workflow" className="space-y-4">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">
              How Privacy-Preserving Training Works
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Three simple stages ensure compliance with HIPAA, GDPR, and institutional review
              boards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2.5">
              <div className="flex items-center gap-2 text-teal-700 font-semibold text-sm">
                <Database className="w-4 h-4" />
                <span>Step 1 · Keep Records Local</span>
              </div>
              <p className="text-sm font-semibold text-slate-900">
                On-Device Patient Enclave
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hospital clinicians manage EHR biomarkers and run risk predictions inside their own
                browser/node vault. Zero patient rows ever upload to the cloud.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2.5">
              <div className="flex items-center gap-2 text-teal-700 font-semibold text-sm">
                <Cpu className="w-4 h-4" />
                <span>Step 2 · Train &amp; Add Noise</span>
              </div>
              <p className="text-sm font-semibold text-slate-900">
                Differential Privacy Guard
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Local epochs compute model adjustments, clip L2 norms, inject calibrated Gaussian
                noise, and pass an automated Zero-PHI packet scanner.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2.5">
              <div className="flex items-center gap-2 text-teal-700 font-semibold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>Step 3 · Aggregate Safely</span>
              </div>
              <p className="text-sm font-semibold text-slate-900">
                FedAvg &amp; FedProx Consortium
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Consortium Admins combine anonymized weight deltas from multiple hospitals, monitor
                privacy budget heat maps, and stress-test attack resilience.
              </p>
            </div>
          </div>
        </section>

        {/* Demo Credentials Quick Access Cards */}
        <section
          id="demo-access"
          className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900">
                Quick Demo Access &amp; Role Portals
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                Use these built-in demo credentials in the Sign In dialog, or authenticate with
                Google SSO.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openSignInWithRole('user', false)}
              className="px-4 py-2 text-sm font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 cursor-pointer"
            >
              Open Sign In Form
            </button>
          </div>

          <div id="guarantees" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 font-display font-bold text-slate-900">
                    <UserCheck className="w-4 h-4 text-teal-700" />
                    <span>Hospital User Account</span>
                  </span>
                  <span className="text-xs font-mono text-teal-700">Role: user</span>
                </div>
                <p className="text-xs text-slate-600">
                  Manage local patient records, run What-If risk inference, train local epochs, and
                  test DP attack resilience.
                </p>
                <div className="pt-2 font-mono text-xs text-slate-800 space-y-1">
                  <div>
                    Username: <strong>{userDemo.username}</strong>
                  </div>
                  <div>
                    Password: <strong>{userDemo.password}</strong>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openSignInWithRole('user', true)}
                className="w-full px-4 py-2 text-xs font-semibold text-teal-800 bg-white border border-teal-300 rounded-lg hover:bg-teal-50 cursor-pointer"
              >
                Sign In with Demo User Credentials
              </button>
            </div>

            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 font-display font-bold text-slate-900">
                    <KeyRound className="w-4 h-4 text-teal-700" />
                    <span>Consortium Admin Account</span>
                  </span>
                  <span className="text-xs font-mono text-teal-700">Role: admin</span>
                </div>
                <p className="text-xs text-slate-600">
                  Orchestrate FedAvg/FedProx rounds, auto-run multi-round simulations, approve nodes,
                  and manage RBAC &amp; audit logs.
                </p>
                <div className="pt-2 font-mono text-xs text-slate-800 space-y-1">
                  <div>
                    Username: <strong>{adminDemo.username}</strong>
                  </div>
                  <div>
                    Password: <strong>{adminDemo.password}</strong>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openSignInWithRole('admin', true)}
                className="w-full px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 cursor-pointer"
              >
                Sign In with Demo Admin Credentials
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Sign-In Modal with Demo Username/Password Login + Google SSO */}
      {signInModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="signin-modal-title"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-teal-700 mb-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Role-Based Access Control</span>
                </div>
                <h2 id="signin-modal-title" className="font-display text-xl font-bold text-slate-900">
                  Sign In to FedMed Shield
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close sign in dialog"
                onClick={() => {
                  onClearError();
                  setSignInModalOpen(false);
                }}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Demo Auto-Fill Role Buttons */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-700">
                1-Click Demo Credentials Auto-Fill:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleFillDemo('user')}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    selectedPortalRole === 'user' && username === userDemo.username
                      ? 'bg-teal-50 text-teal-800 border-teal-300'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Fill Demo User
                </button>
                <button
                  type="button"
                  onClick={() => handleFillDemo('admin')}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    selectedPortalRole === 'admin' && username === adminDemo.username
                      ? 'bg-teal-50 text-teal-800 border-teal-300'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Fill Demo Admin
                </button>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-600 space-y-0.5">
                <div>User: {userDemo.username} / {userDemo.password}</div>
                <div>Admin: {adminDemo.username} / {adminDemo.password}</div>
              </div>
            </div>

            {authError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800"
              >
                {authError}
              </div>
            )}

            <form onSubmit={handleCredentialSubmit} className="space-y-3.5">
              <div>
                <label
                  htmlFor="login-username"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Username or Email
                </label>
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  placeholder="user@hospital.org or admin@fedmed.org"
                  value={username}
                  onChange={(e) => {
                    if (authError) onClearError();
                    setUsername(e.target.value);
                  }}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter password (e.g. user123)"
                    value={password}
                    onChange={(e) => {
                      if (authError) onClearError();
                      setPassword(e.target.value);
                    }}
                    className="w-full pl-3 pr-10 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-node-select"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Assigned Hospital Enclave
                </label>
                <select
                  id="login-node-select"
                  value={selectedNodeId}
                  onChange={(e) => setSelectedNodeId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {nodeChoices.map((node) => (
                    <option key={node.nodeId} value={node.nodeId}>
                      {node.name} ({node.region})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Sign In with Credentials</span>
              </button>
            </form>

            <div className="relative flex items-center">
              <div className="flex-grow border-t border-slate-200" />
              <span className="shrink-0 mx-3 text-xs text-slate-400">or live cloud sync</span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            <button
              type="button"
              disabled={authLoading}
              onClick={() => void onGoogleLogin(selectedPortalRole, selectedNodeId)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-60 transition-colors cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-teal-700 shrink-0" />
              <span>{authLoading ? 'Verifying Google SSO...' : 'Continue with Google SSO'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
