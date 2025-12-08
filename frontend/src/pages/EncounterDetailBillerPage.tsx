import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  getEncounter,
  updateEncounterCodes,
  finalizeEncounter,
  getEncounterAudit,
  EncounterDto,
  FinalDiagnosisCode,
  FinalProcedureCode,
  AuditEventDto,
} from '../api/encounters';
import { AuditTrailModal } from '../components/encounters/AuditTrailModal';
import { EncounterFeedbackPanel } from '../components/encounters/EncounterFeedbackPanel';

export const EncounterDetailBillerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [encounter, setEncounter] = useState<EncounterDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Code editing state
  const [emCode, setEmCode] = useState('');
  const [diagnosisCodes, setDiagnosisCodes] = useState<FinalDiagnosisCode[]>([]);
  const [procedureCodes, setProcedureCodes] = useState<FinalProcedureCode[]>([]);
  const [isSavingCodes, setIsSavingCodes] = useState(false);
  const [codesError, setCodesError] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);

  // Audit trail state
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditEvents, setAuditEvents] = useState<AuditEventDto[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !token) return;

    setIsLoading(true);
    setError(null);
    getEncounter(token, id)
      .then((data) => {
        setEncounter(data);
        // Initialize code editing state
        setEmCode(data.finalEmCode || data.aiEmSuggested || '');
        
        // Initialize diagnosis codes
        if (data.finalDiagnosisCodes && data.finalDiagnosisCodes.length > 0) {
          setDiagnosisCodes(data.finalDiagnosisCodes);
        } else if (data.aiDiagnosisSuggestions && data.aiDiagnosisSuggestions.length > 0) {
          setDiagnosisCodes(
            data.aiDiagnosisSuggestions.map((diag) => ({
              code: diag.code,
              description: diag.description,
              source: 'ai' as const,
            }))
          );
        } else {
          setDiagnosisCodes([]);
        }

        // Initialize procedure codes
        if (data.finalProcedureCodes && data.finalProcedureCodes.length > 0) {
          setProcedureCodes(data.finalProcedureCodes);
        } else if (data.aiProcedureSuggestions && data.aiProcedureSuggestions.length > 0) {
          setProcedureCodes(
            data.aiProcedureSuggestions.map((proc) => ({
              code: proc.code,
              description: proc.description,
              modifiers: [],
              source: 'ai' as const,
            }))
          );
        } else {
          setProcedureCodes([]);
        }
      })
      .catch((err: Error) => {
        setError(err.message || 'Failed to load encounter');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id, token]);

  const handleSaveCodes = async () => {
    if (!id || !token) return;

    setIsSavingCodes(true);
    setCodesError(null);

    try {
      const updated = await updateEncounterCodes(token, id, {
        finalEmCode: emCode || null,
        finalEmCodeSource: 'biller',
        finalDiagnosisCodes: diagnosisCodes,
        finalProcedureCodes: procedureCodes,
      });
      setEncounter(updated);
    } catch (err: any) {
      setCodesError(err.message || 'Failed to save codes');
    } finally {
      setIsSavingCodes(false);
    }
  };

  const handleFinalize = async () => {
    if (!id || !token) return;

    setIsFinalizing(true);
    setFinalizeError(null);

    try {
      const updated = await finalizeEncounter(token, id);
      setEncounter(updated);
    } catch (err: any) {
      setFinalizeError(err.message || 'Failed to finalize encounter');
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleOpenAudit = async () => {
    if (!id || !token) return;

    setIsAuditOpen(true);
    
    if (auditEvents.length === 0) {
      setIsLoadingAudit(true);
      setAuditError(null);
      try {
        const events = await getEncounterAudit(token, id);
        setAuditEvents(events);
      } catch (err: any) {
        setAuditError(err.message || 'Failed to load audit trail');
      } finally {
        setIsLoadingAudit(false);
      }
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-slate-600">Loading encounter...</div>;
  }

  if (error && !encounter) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">{error}</div>
        <button
          onClick={() => navigate('/encounters')}
          className="mt-4 text-sm text-slate-600 hover:text-slate-900"
        >
          ← Back to Encounters
        </button>
      </div>
    );
  }

  if (!encounter) {
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const addDiagnosis = () => {
    setDiagnosisCodes([...diagnosisCodes, { code: '', description: '', source: 'user' }]);
  };

  const removeDiagnosis = (index: number) => {
    setDiagnosisCodes(diagnosisCodes.filter((_, i) => i !== index));
  };

  const updateDiagnosis = (index: number, field: keyof FinalDiagnosisCode, value: string) => {
    const updated = [...diagnosisCodes];
    updated[index] = { ...updated[index], [field]: value };
    setDiagnosisCodes(updated);
  };

  const addProcedure = () => {
    setProcedureCodes([
      ...procedureCodes,
      { code: '', description: '', modifiers: [], source: 'user' },
    ]);
  };

  const removeProcedure = (index: number) => {
    setProcedureCodes(procedureCodes.filter((_, i) => i !== index));
  };

  const updateProcedure = (
    index: number,
    field: keyof FinalProcedureCode,
    value: string | string[]
  ) => {
    const updated = [...procedureCodes];
    updated[index] = { ...updated[index], [field]: value };
    setProcedureCodes(updated);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-4">
        <button
          onClick={() => navigate('/encounters')}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← Back to Encounters
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Encounter Coding</h1>
          <p className="text-sm text-slate-600 mt-1">
            Patient: {encounter.patientPseudoId} | Date: {formatDate(encounter.encounterDate)}
          </p>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            encounter.status === 'finalized'
              ? 'bg-green-100 text-green-800'
              : encounter.status === 'ai_suggested'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-slate-100 text-slate-800'
          }`}
        >
          {encounter.status.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Encounter Info */}
        <div className="lg:col-span-1">
          <div className="border border-slate-200 rounded p-4 space-y-4">
            <h2 className="font-medium">Encounter Info</h2>
            <div className="text-sm space-y-2">
              <div>
                <span className="text-slate-600">Date:</span>{' '}
                {formatDate(encounter.encounterDate)}
              </div>
              <div>
                <span className="text-slate-600">Provider ID:</span> {encounter.providerId}
              </div>
              <div>
                <span className="text-slate-600">Visit Type:</span>{' '}
                {encounter.visitType.replace('_', ' ')}
              </div>
              <div>
                <span className="text-slate-600">Specialty:</span> {encounter.specialty}
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Note</h3>
              <textarea
                readOnly
                value={encounter.noteText}
                rows={15}
                className="w-full border rounded px-3 py-2 text-sm font-mono bg-slate-50"
              />
            </div>
          </div>
        </div>

        {/* Right Column - Coding Panel */}
        <div className="lg:col-span-2">
          <div className="space-y-6">
            {/* E/M Code Section */}
            <div className="border border-slate-200 rounded p-4">
              <h2 className="font-medium mb-3">E/M Code</h2>
              <input
                type="text"
                value={emCode}
                onChange={(e) => setEmCode(e.target.value)}
                placeholder="e.g., 99213"
                className="border rounded px-3 py-2 w-full text-sm"
              />
              {encounter.aiEmSuggested && (
                <p className="mt-2 text-xs text-slate-600">
                  AI suggested: {encounter.aiEmSuggested}
                  {encounter.aiEmConfidence !== null &&
                    encounter.aiEmConfidence !== undefined &&
                    ` (confidence ${Math.round(encounter.aiEmConfidence * 100)}%)`}
                </p>
              )}
            </div>

            {/* Diagnoses Section */}
            <div className="border border-slate-200 rounded p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-medium">Diagnoses</h2>
                <button
                  onClick={addDiagnosis}
                  className="text-sm px-3 py-1 border rounded hover:bg-slate-50"
                >
                  + Add diagnosis
                </button>
              </div>
              <div className="space-y-3">
                {diagnosisCodes.map((diag, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <input
                      type="text"
                      value={diag.code}
                      onChange={(e) => updateDiagnosis(idx, 'code', e.target.value)}
                      placeholder="Code"
                      className="border rounded px-2 py-1 text-sm w-24"
                    />
                    <input
                      type="text"
                      value={diag.description}
                      onChange={(e) => updateDiagnosis(idx, 'description', e.target.value)}
                      placeholder="Description"
                      className="border rounded px-2 py-1 text-sm flex-1"
                    />
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        diag.source === 'ai'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {diag.source.toUpperCase()}
                    </span>
                    <button
                      onClick={() => removeDiagnosis(idx)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {diagnosisCodes.length === 0 && (
                  <p className="text-sm text-slate-500">No diagnoses added</p>
                )}
              </div>
            </div>

            {/* Procedures Section */}
            <div className="border border-slate-200 rounded p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-medium">Procedures</h2>
                <button
                  onClick={addProcedure}
                  className="text-sm px-3 py-1 border rounded hover:bg-slate-50"
                >
                  + Add procedure
                </button>
              </div>
              <div className="space-y-3">
                {procedureCodes.map((proc, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <input
                      type="text"
                      value={proc.code}
                      onChange={(e) => updateProcedure(idx, 'code', e.target.value)}
                      placeholder="Code"
                      className="border rounded px-2 py-1 text-sm w-24"
                    />
                    <input
                      type="text"
                      value={proc.description}
                      onChange={(e) => updateProcedure(idx, 'description', e.target.value)}
                      placeholder="Description"
                      className="border rounded px-2 py-1 text-sm flex-1"
                    />
                    <input
                      type="text"
                      value={proc.modifiers?.join(',') || ''}
                      onChange={(e) =>
                        updateProcedure(
                          idx,
                          'modifiers',
                          e.target.value.split(',').map((m) => m.trim()).filter(Boolean)
                        )
                      }
                      placeholder="Modifiers (comma-separated)"
                      className="border rounded px-2 py-1 text-sm w-32"
                    />
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        proc.source === 'ai'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {proc.source.toUpperCase()}
                    </span>
                    <button
                      onClick={() => removeProcedure(idx)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {procedureCodes.length === 0 && (
                  <p className="text-sm text-slate-500">No procedures added</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleSaveCodes}
                disabled={isSavingCodes}
                className="bg-slate-900 text-white px-4 py-2 rounded text-sm hover:bg-slate-800 disabled:opacity-60"
              >
                {isSavingCodes ? 'Saving...' : 'Save Codes'}
              </button>
              {(user?.role === 'biller' || user?.role === 'admin') && (
                <>
                  <button
                    onClick={handleFinalize}
                    disabled={encounter.status === 'finalized' || isFinalizing}
                    className="bg-green-700 text-white px-4 py-2 rounded text-sm hover:bg-green-800 disabled:opacity-60"
                  >
                    {isFinalizing ? 'Finalizing...' : 'Finalize Encounter'}
                  </button>
                  <button
                    onClick={handleOpenAudit}
                    className="border border-slate-300 px-4 py-2 rounded text-sm hover:bg-slate-50"
                  >
                    View Audit Trail
                  </button>
                </>
              )}
            </div>

            {/* Error Messages */}
            {codesError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {codesError}
              </div>
            )}
            {finalizeError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {finalizeError}
              </div>
            )}

            {/* Feedback Panel */}
            {encounter.status === 'ai_suggested' || encounter.status === 'finalized' ? (
              <EncounterFeedbackPanel encounterId={encounter.id} />
            ) : null}
          </div>
        </div>
      </div>

      {/* Audit Trail Modal */}
      <AuditTrailModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        isLoading={isLoadingAudit}
        error={auditError}
        events={auditEvents}
      />
    </div>
  );
};

