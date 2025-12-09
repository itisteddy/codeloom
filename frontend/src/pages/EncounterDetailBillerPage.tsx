import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
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

  const addDiagnosisFromSuggestion = (diag: { code: string; description: string }) => {
    const exists = diagnosisCodes.some(
      (d) => d.code === diag.code && d.description === diag.description
    );
    if (!exists) {
      setDiagnosisCodes([
        ...diagnosisCodes,
        { code: diag.code, description: diag.description, source: 'ai' },
      ]);
    }
  };

  const addProcedureFromSuggestion = (proc: {
    code: string;
    description: string;
    modifiers?: string[];
  }) => {
    const exists = procedureCodes.some(
      (p) => p.code === proc.code && p.description === proc.description
    );
    if (!exists) {
      setProcedureCodes([
        ...procedureCodes,
        {
          code: proc.code,
          description: proc.description,
          modifiers: proc.modifiers || [],
          source: 'ai',
        },
      ]);
    }
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
            <Card>
              <CardHeader>
                <CardTitle>E/M Code</CardTitle>
                <CardDescription>Review AI guidance and set the final code</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  label="Final E/M code"
                  type="text"
                  value={emCode}
                  onChange={(e) => setEmCode(e.target.value)}
                  placeholder="e.g., 99213"
                />
                {encounter.aiEmSuggested && (
                  <div className="space-y-1 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Recommended:</span>
                      <span className="font-mono text-sm">{encounter.aiEmSuggested}</span>
                      {encounter.aiEmConfidence !== null &&
                        encounter.aiEmConfidence !== undefined && (
                          <span className="text-slate-500">
                            ({Math.round(encounter.aiEmConfidence * 100)}% confidence)
                          </span>
                        )}
                    </div>
                    {encounter.aiEmHighestSupportedCode &&
                      encounter.aiEmHighestSupportedCode !== encounter.aiEmSuggested && (
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="success">Highest supported</Badge>
                          <span className="font-mono text-sm">
                            {encounter.aiEmHighestSupportedCode}
                          </span>
                          {encounter.aiEmHighestSupportedConfidence !== null &&
                            encounter.aiEmHighestSupportedConfidence !== undefined && (
                              <span className="text-slate-500">
                                ({Math.round(encounter.aiEmHighestSupportedConfidence * 100)}% confidence)
                              </span>
                            )}
                        </div>
                      )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Diagnoses Section */}
            <Card>
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Final Diagnoses</CardTitle>
                  <CardDescription>These will be submitted for this encounter.</CardDescription>
                </div>
                <Button size="sm" variant="ghost" onClick={addDiagnosis}>
                  + Add diagnosis
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {diagnosisCodes.map((diag, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col gap-2 rounded border border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-start"
                    >
                      <Input
                        label="Code"
                        value={diag.code}
                        onChange={(e) => updateDiagnosis(idx, 'code', e.target.value)}
                        className="sm:w-32"
                      />
                      <Input
                        label="Description"
                        value={diag.description}
                        onChange={(e) => updateDiagnosis(idx, 'description', e.target.value)}
                        className="flex-1"
                      />
                      <div className="flex items-center gap-2">
                        <Badge variant={diag.source === 'ai' ? 'info' : 'secondary'}>
                          {diag.source.toUpperCase()}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeDiagnosis(idx)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                  {diagnosisCodes.length === 0 && (
                    <p className="text-sm text-slate-500">No diagnoses added yet.</p>
                  )}
                </div>

                {encounter.aiDiagnosisSuggestions && encounter.aiDiagnosisSuggestions.length > 0 && (
                  <div className="space-y-2 rounded border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase text-slate-500">AI suggestions</p>
                    </div>
                    <div className="space-y-1">
                      {encounter.aiDiagnosisSuggestions.map((diag, idx) => (
                        <div
                          key={`${diag.code}-${idx}`}
                          className="flex items-center justify-between rounded border border-slate-100 bg-white px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-900">{diag.code}</p>
                            {diag.description && (
                              <p className="text-xs text-slate-500">{diag.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500">
                              {Math.round(diag.confidence * 100)}%
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => addDiagnosisFromSuggestion(diag)}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Procedures Section */}
            <Card>
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Final Procedures</CardTitle>
                  <CardDescription>Procedures to submit for this encounter.</CardDescription>
                </div>
                <Button size="sm" variant="ghost" onClick={addProcedure}>
                  + Add procedure
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {procedureCodes.map((proc, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col gap-2 rounded border border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-start"
                    >
                      <Input
                        label="Code"
                        value={proc.code}
                        onChange={(e) => updateProcedure(idx, 'code', e.target.value)}
                        className="sm:w-32"
                      />
                      <Input
                        label="Description"
                        value={proc.description}
                        onChange={(e) => updateProcedure(idx, 'description', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        label="Modifiers (comma-separated)"
                        value={proc.modifiers?.join(',') || ''}
                        onChange={(e) =>
                          updateProcedure(
                            idx,
                            'modifiers',
                            e.target.value
                              .split(',')
                              .map((m) => m.trim())
                              .filter(Boolean)
                          )
                        }
                        className="sm:w-48"
                      />
                      <div className="flex items-center gap-2">
                        <Badge variant={proc.source === 'ai' ? 'info' : 'secondary'}>
                          {proc.source.toUpperCase()}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeProcedure(idx)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                  {procedureCodes.length === 0 && (
                    <p className="text-sm text-slate-500">No procedures added yet.</p>
                  )}
                </div>

                {encounter.aiProcedureSuggestions && encounter.aiProcedureSuggestions.length > 0 && (
                  <div className="space-y-2 rounded border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase text-slate-500">AI suggestions</p>
                    </div>
                    <div className="space-y-1">
                      {encounter.aiProcedureSuggestions.map((proc, idx) => (
                        <div
                          key={`${proc.code}-${idx}`}
                          className="flex items-center justify-between rounded border border-slate-100 bg-white px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-900">{proc.code}</p>
                            {proc.description && (
                              <p className="text-xs text-slate-500">{proc.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500">
                              {Math.round(proc.confidence * 100)}%
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => addProcedureFromSuggestion(proc)}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSaveCodes} disabled={isSavingCodes}>
                {isSavingCodes ? 'Saving...' : 'Save Codes'}
              </Button>
              {(user?.role === 'biller' || user?.role === 'admin') && (
                <>
                  <Button
                    onClick={handleFinalize}
                    disabled={encounter.status === 'finalized' || isFinalizing}
                    variant="secondary"
                  >
                    {isFinalizing ? 'Finalizing...' : 'Finalize Encounter'}
                  </Button>
                  <Button variant="ghost" onClick={handleOpenAudit}>
                    View Audit Trail
                  </Button>
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

