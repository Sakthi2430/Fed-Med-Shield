import React, { useMemo, useState } from 'react';
import {
  Activity,
  Download,
  Lock,
  Plus,
  Search,
  ShieldAlert,
  Sliders,
  Sparkles,
} from 'lucide-react';
import type {
  LocalPatientRecord,
  ModelWeights,
  RiskInferenceResult,
  RiskTier,
} from '../types/federated';
import { evaluateLocalPatientRisk } from '../utils/federatedEngine';

interface LocalPatientVaultProps {
  nodeName: string;
  nodeId: string;
  records: LocalPatientRecord[];
  globalWeights: ModelWeights;
  onAddRecord: (record: Omit<LocalPatientRecord, 'localId' | 'nodeId' | 'recordedDate'>) => void;
  onBatchAddSynthetic: () => void;
}

export const LocalPatientVault: React.FC<LocalPatientVaultProps> = ({
  nodeName,
  nodeId,
  records,
  globalWeights,
  onAddRecord,
  onBatchAddSynthetic,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | RiskTier>('ALL');
  const [selectedRecordId, setSelectedRecordId] = useState<string>(records[0]?.localId || '');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);

  // Add Record Form State
  const [patientCode, setPatientCode] = useState('');
  const [age, setAge] = useState('58');
  const [systolicBp, setSystolicBp] = useState('142');
  const [ldlCholesterol, setLdlCholesterol] = useState('154');
  const [hba1c, setHba1c] = useState('6.5');
  const [egfr, setEgfr] = useState('72');
  const [troponin, setTroponin] = useState('0.032');
  const [diagnosisLabel, setDiagnosisLabel] = useState<'0' | '1'>('1');
  const [formError, setFormError] = useState<string | null>(null);

  // What-If Clinical Simulator State
  const [simAge, setSimAge] = useState(62);
  const [simBp, setSimBp] = useState(148);
  const [simLdl, setSimLdl] = useState(160);
  const [simHba1c, setSimHba1c] = useState(7.1);
  const [simEgfr, setSimEgfr] = useState(64);
  const [simTroponin, setSimTroponin] = useState(0.048);

  const enrichedRecords = useMemo(() => {
    return records.map((rec) => ({
      record: rec,
      inference: evaluateLocalPatientRisk(rec, globalWeights),
    }));
  }, [records, globalWeights]);

  const filteredRecords = useMemo(() => {
    return enrichedRecords.filter(({ record, inference }) => {
      const matchesSearch = record.patientCode
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase());
      const matchesFilter = riskFilter === 'ALL' || inference.riskTier === riskFilter;
      return matchesSearch && matchesFilter;
    });
  }, [enrichedRecords, searchQuery, riskFilter]);

  const activeSelection = useMemo(() => {
    return (
      enrichedRecords.find((item) => item.record.localId === selectedRecordId) ||
      filteredRecords[0] ||
      enrichedRecords[0] ||
      null
    );
  }, [enrichedRecords, filteredRecords, selectedRecordId]);

  const whatIfInference = useMemo(() => {
    const virtualRecord: LocalPatientRecord = {
      localId: 'what_if_virtual',
      nodeId,
      patientCode: 'WHAT-IF-SIMULATOR',
      age: simAge,
      systolicBp: simBp,
      ldlCholesterol: simLdl,
      hba1c: simHba1c,
      egfr: simEgfr,
      troponin: simTroponin,
      diagnosisLabel: 1,
      recordedDate: new Date().toISOString().slice(0, 10),
    };
    return evaluateLocalPatientRisk(virtualRecord, globalWeights);
  }, [nodeId, simAge, simBp, simLdl, simHba1c, simEgfr, simTroponin, globalWeights]);

  const handleExportLocalCsv = () => {
    const header =
      'patientCode,age,systolicBp,ldlCholesterol,hba1c,egfr,troponin,diagnosisLabel,recordedDate';
    const rows = records.map((r) =>
      [
        r.patientCode,
        r.age,
        r.systolicBp,
        r.ldlCholesterol,
        r.hba1c,
        r.egfr,
        r.troponin,
        r.diagnosisLabel,
        r.recordedDate,
      ].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `local-enclave-${nodeId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const code = patientCode.trim();
    const numAge = Number(age);
    const numBp = Number(systolicBp);
    const numLdl = Number(ldlCholesterol);
    const numHba1c = Number(hba1c);
    const numEgfr = Number(egfr);
    const numTrop = Number(troponin);

    if (!code || code.length < 3) {
      setFormError('Enter an anonymized local enclave code (minimum 3 characters).');
      return;
    }
    if (
      Number.isNaN(numAge) ||
      numAge < 1 ||
      numAge > 120 ||
      Number.isNaN(numBp) ||
      numBp < 60 ||
      numBp > 260 ||
      Number.isNaN(numLdl) ||
      numLdl < 20 ||
      numLdl > 450 ||
      Number.isNaN(numHba1c) ||
      numHba1c < 3 ||
      numHba1c > 18 ||
      Number.isNaN(numEgfr) ||
      numEgfr < 5 ||
      numEgfr > 160 ||
      Number.isNaN(numTrop) ||
      numTrop < 0 ||
      numTrop > 10
    ) {
      setFormError('One or more clinical biomarkers fall outside valid physiological bounds.');
      return;
    }

    onAddRecord({
      patientCode: code.toUpperCase(),
      age: numAge,
      systolicBp: numBp,
      ldlCholesterol: numLdl,
      hba1c: numHba1c,
      egfr: numEgfr,
      troponin: numTrop,
      diagnosisLabel: diagnosisLabel === '1' ? 1 : 0,
    });

    setPatientCode('');
    setShowAddForm(false);
  };

  const renderRiskTextClass = (tier: RiskTier) => {
    switch (tier) {
      case 'Critical':
        return 'text-rose-700 font-semibold';
      case 'Elevated':
        return 'text-amber-700 font-semibold';
      case 'Moderate':
        return 'text-teal-700 font-medium';
      default:
        return 'text-emerald-700 font-medium';
    }
  };

  return (
    <div className="space-y-6">
      {/* Privacy Boundary Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 mb-1">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>Local Enclave Isolation · Never Transmitted to Cloud</span>
          </div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            {nodeName} — Local Patient Cohort Vault
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Records below stay strictly on this node. Global federated weights run locally
            in-browser for private risk evaluation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowWhatIf((prev) => !prev)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
              showWhatIf
                ? 'bg-teal-50 text-teal-800 border-teal-300'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{showWhatIf ? 'Hide What-If Simulator' : 'What-If Risk Simulator'}</span>
          </button>

          <button
            type="button"
            onClick={onBatchAddSynthetic}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Synthetic Batch (+3)</span>
          </button>

          <button
            type="button"
            onClick={handleExportLocalCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Local CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showAddForm ? 'Close Intake Form' : 'Add Local Patient Record'}</span>
          </button>
        </div>
      </div>

      {/* What-If Clinical Risk Simulator */}
      {showWhatIf && (
        <section
          aria-label="What-If Clinical Risk Simulator"
          className="bg-white border border-teal-200 rounded-xl p-6 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Interactive What-If Clinical Risk Simulator
              </h3>
              <p className="text-xs text-slate-600">
                Adjust patient biomarkers locally to test global model sensitivity in real time
                without saving or uploading PHI.
              </p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold tabular-nums text-slate-900">
                {whatIfInference.probabilityPercent.toFixed(1)}%
              </span>
              <span className={`text-sm ${renderRiskTextClass(whatIfInference.riskTier)}`}>
                {whatIfInference.riskTier} Risk
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="sim-age" className="font-medium text-slate-700">
                  Age (yrs)
                </label>
                <span className="font-mono tabular-nums text-slate-900">{simAge}</span>
              </div>
              <input
                id="sim-age"
                type="range"
                min={25}
                max={90}
                step={1}
                value={simAge}
                onChange={(e) => setSimAge(Number(e.target.value))}
                className="w-full accent-teal-700"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="sim-bp" className="font-medium text-slate-700">
                  Systolic BP (mmHg)
                </label>
                <span className="font-mono tabular-nums text-slate-900">{simBp}</span>
              </div>
              <input
                id="sim-bp"
                type="range"
                min={95}
                max={200}
                step={2}
                value={simBp}
                onChange={(e) => setSimBp(Number(e.target.value))}
                className="w-full accent-teal-700"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="sim-ldl" className="font-medium text-slate-700">
                  LDL Cholesterol (mg/dL)
                </label>
                <span className="font-mono tabular-nums text-slate-900">{simLdl}</span>
              </div>
              <input
                id="sim-ldl"
                type="range"
                min={60}
                max={240}
                step={5}
                value={simLdl}
                onChange={(e) => setSimLdl(Number(e.target.value))}
                className="w-full accent-teal-700"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="sim-hba1c" className="font-medium text-slate-700">
                  HbA1c (%)
                </label>
                <span className="font-mono tabular-nums text-slate-900">
                  {simHba1c.toFixed(1)}%
                </span>
              </div>
              <input
                id="sim-hba1c"
                type="range"
                min={4.5}
                max={11.0}
                step={0.1}
                value={simHba1c}
                onChange={(e) => setSimHba1c(Number(e.target.value))}
                className="w-full accent-teal-700"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="sim-egfr" className="font-medium text-slate-700">
                  eGFR Renal (mL/min)
                </label>
                <span className="font-mono tabular-nums text-slate-900">{simEgfr}</span>
              </div>
              <input
                id="sim-egfr"
                type="range"
                min={20}
                max={120}
                step={2}
                value={simEgfr}
                onChange={(e) => setSimEgfr(Number(e.target.value))}
                className="w-full accent-teal-700"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="sim-trop" className="font-medium text-slate-700">
                  Troponin I (ng/mL)
                </label>
                <span className="font-mono tabular-nums text-slate-900">
                  {simTroponin.toFixed(3)}
                </span>
              </div>
              <input
                id="sim-trop"
                type="range"
                min={0.002}
                max={0.15}
                step={0.002}
                value={simTroponin}
                onChange={(e) => setSimTroponin(Number(e.target.value))}
                className="w-full accent-teal-700"
              />
            </div>
          </div>
        </section>
      )}

      {/* Add Local Record Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateRecord}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-slate-900">
              New Local EHR Record (Stored On-Device Only)
            </h3>
            <span className="text-xs font-mono text-slate-500">Zero Cloud Upload</span>
          </div>

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
              <label htmlFor="rec-code" className="block text-xs font-medium text-slate-700 mb-1">
                Local Enclave Code
              </label>
              <input
                id="rec-code"
                type="text"
                placeholder="e.g. ENCLAVE-SJ-8409"
                value={patientCode}
                onChange={(e) => setPatientCode(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label htmlFor="rec-age" className="block text-xs font-medium text-slate-700 mb-1">
                Age (yrs)
              </label>
              <input
                id="rec-age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label htmlFor="rec-bp" className="block text-xs font-medium text-slate-700 mb-1">
                Systolic BP (mmHg)
              </label>
              <input
                id="rec-bp"
                type="number"
                value={systolicBp}
                onChange={(e) => setSystolicBp(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label htmlFor="rec-ldl" className="block text-xs font-medium text-slate-700 mb-1">
                LDL Cholesterol (mg/dL)
              </label>
              <input
                id="rec-ldl"
                type="number"
                value={ldlCholesterol}
                onChange={(e) => setLdlCholesterol(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label htmlFor="rec-hba1c" className="block text-xs font-medium text-slate-700 mb-1">
                HbA1c (%)
              </label>
              <input
                id="rec-hba1c"
                type="number"
                step="0.1"
                value={hba1c}
                onChange={(e) => setHba1c(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label htmlFor="rec-egfr" className="block text-xs font-medium text-slate-700 mb-1">
                eGFR (mL/min)
              </label>
              <input
                id="rec-egfr"
                type="number"
                value={egfr}
                onChange={(e) => setEgfr(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label htmlFor="rec-trop" className="block text-xs font-medium text-slate-700 mb-1">
                Troponin I (ng/mL)
              </label>
              <input
                id="rec-trop"
                type="number"
                step="0.001"
                value={troponin}
                onChange={(e) => setTroponin(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label htmlFor="rec-label" className="block text-xs font-medium text-slate-700 mb-1">
                Ground Truth Outcome
              </label>
              <select
                id="rec-label"
                value={diagnosisLabel}
                onChange={(e) => setDiagnosisLabel(e.target.value as '0' | '1')}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="1">Positive Risk Event (1)</option>
                <option value="0">Negative Control (0)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 cursor-pointer"
            >
              Save to Local Enclave
            </button>
          </div>
        </form>
      )}

      {/* Main Split: Cohort Table + On-Device Risk Attribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Table Section */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="Search local enclave patient codes"
                placeholder="Search local code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
              {(['ALL', 'Critical', 'Elevated', 'Moderate', 'Low'] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setRiskFilter(tier)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                    riskFilter === tier
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tier === 'ALL' ? 'All Records' : tier}
                </button>
              ))}
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No local enclave records match the active filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                    <th className="py-2.5 px-4">Enclave ID</th>
                    <th className="py-2.5 px-3 text-right">Age</th>
                    <th className="py-2.5 px-3 text-right">SBP</th>
                    <th className="py-2.5 px-3 text-right">HbA1c</th>
                    <th className="py-2.5 px-3 text-right">Troponin</th>
                    <th className="py-2.5 px-3 text-right">Local Risk</th>
                    <th className="py-2.5 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredRecords.map(({ record, inference }) => {
                    const isSelected = activeSelection?.record.localId === record.localId;
                    return (
                      <tr
                        key={record.localId}
                        className={`transition-colors ${
                          isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 px-4 font-mono text-xs font-medium text-slate-900">
                          {record.patientCode}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                          {record.age}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                          {record.systolicBp}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                          {record.hba1c.toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                          {record.troponin.toFixed(3)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          <span className={renderRiskTextClass(inference.riskTier)}>
                            {inference.probabilityPercent.toFixed(1)}% · {inference.riskTier}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <button
                            type="button"
                            onClick={() => setSelectedRecordId(record.localId)}
                            className="text-xs font-medium text-teal-700 hover:underline whitespace-nowrap cursor-pointer"
                          >
                            {isSelected ? 'Inspecting' : 'Evaluate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* On-Device Inference Card */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-teal-700 mb-1">
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span>On-Device Global Model Inference</span>
          </div>
          <h3 className="font-display text-base font-bold text-slate-900 mb-4">
            Biomarker Risk Attribution
          </h3>

          {activeSelection ? (
            <InferenceBreakdown
              patientCode={activeSelection.record.patientCode}
              recordedDate={activeSelection.record.recordedDate}
              inference={activeSelection.inference}
            />
          ) : (
            <div className="py-8 text-center text-sm text-slate-500">
              Select a local patient record to evaluate risk locally.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const InferenceBreakdown: React.FC<{
  patientCode: string;
  recordedDate: string;
  inference: RiskInferenceResult;
}> = ({ patientCode, recordedDate, inference }) => {
  return (
    <div className="space-y-4">
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-xs text-slate-500">{patientCode}</span>
          <span className="font-mono text-xs text-slate-500">{recordedDate}</span>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-3xl font-mono font-bold tabular-nums text-slate-900">
            {inference.probabilityPercent.toFixed(1)}%
          </span>
          <span
            className={`text-sm font-semibold ${
              inference.riskTier === 'Critical'
                ? 'text-rose-700'
                : inference.riskTier === 'Elevated'
                  ? 'text-amber-700'
                  : inference.riskTier === 'Moderate'
                    ? 'text-teal-700'
                    : 'text-emerald-700'
            }`}
          >
            {inference.riskTier} Risk
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
          Model Confidence: {inference.confidence.toFixed(1)}%
        </p>
      </div>

      <div className="space-y-2.5">
        <p className="text-xs font-medium text-slate-700">Top Biomarker Drivers</p>
        {inference.contributions.map((item) => {
          const barWidth = Math.min(100, Math.max(8, Math.abs(item.impactScore) * 75));
          return (
            <div key={item.feature} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-700 font-medium">
                  {item.feature}{' '}
                  <span className="text-slate-400 font-mono">({item.valueLabel})</span>
                </span>
                <span
                  className={`font-mono tabular-nums ${
                    item.direction === 'risk-increasing' ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  {item.impactScore >= 0 ? `+${item.impactScore}` : item.impactScore}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-sm overflow-hidden">
                <div
                  className={`h-full ${
                    item.direction === 'risk-increasing' ? 'bg-rose-600' : 'bg-emerald-600'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-3 border-t border-slate-200 flex items-start gap-2 text-xs text-slate-500">
        <ShieldAlert className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
        <span>
          Evaluated locally using synced global model weights. Zero patient identifiers left this
          device.
        </span>
      </div>
    </div>
  );
};
