import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getEncounter, updateEncounterMetadata, runSuggestions, EncounterDto } from '../api/encounters';
import { EncounterSuggestionsPanel } from '../components/encounters/EncounterSuggestionsPanel';
import { EncounterFeedbackPanel } from '../components/encounters/EncounterFeedbackPanel';

export const EncounterDetailProviderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [encounter, setEncounter] = useState<EncounterDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunningSuggest, setIsRunningSuggest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  // Form state
  const [patientPseudoId, setPatientPseudoId] = useState('');
  const [encounterDate, setEncounterDate] = useState('');
  const [visitType, setVisitType] = useState('office_established');
  const [specialty, setSpecialty] = useState('primary_care');
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    if (!id || !token) return;

    setIsLoading(true);
    setError(null);
    getEncounter(token, id)
      .then((data) => {
        setEncounter(data);
        setPatientPseudoId(data.patientPseudoId);
        setEncounterDate(data.encounterDate.split('T')[0]);
        setVisitType(data.visitType);
        setSpecialty(data.specialty);
        setNoteText(data.noteText);
      })
      .catch((err: Error) => {
        setError(err.message || 'Failed to load encounter');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id, token]);

  const handleSave = async () => {
    if (!id || !token || !encounter) return;

    setIsSaving(true);
    setError(null);

    try {
      const updated = await updateEncounterMetadata(token, id, {
        patientPseudoId,
        encounterDate,
        visitType,
        specialty,
        noteText,
      });
      setEncounter(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to update encounter');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunCodeloom = async () => {
    if (!id || !token) return;

    setIsRunningSuggest(true);
    setSuggestError(null);

    try {
      const updated = await runSuggestions(token, id);
      setEncounter(updated);
      // Update form fields if needed
      setPatientPseudoId(updated.patientPseudoId);
      setEncounterDate(updated.encounterDate.split('T')[0]);
      setVisitType(updated.visitType);
      setSpecialty(updated.specialty);
      setNoteText(updated.noteText);
    } catch (err: any) {
      setSuggestError(err.message || 'Failed to generate suggestions');
    } finally {
      setIsRunningSuggest(false);
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
    return date.toLocaleString();
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Form */}
        <div className="lg:col-span-2">
          <h1 className="text-2xl font-semibold mb-4">Encounter Details</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Patient ID</label>
              <input
                type="text"
                value={patientPseudoId}
                onChange={(e) => setPatientPseudoId(e.target.value)}
                className="border rounded px-3 py-2 w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Encounter Date</label>
              <input
                type="date"
                value={encounterDate}
                onChange={(e) => setEncounterDate(e.target.value)}
                className="border rounded px-3 py-2 w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Visit Type</label>
              <select
                value={visitType}
                onChange={(e) => setVisitType(e.target.value)}
                className="border rounded px-3 py-2 w-full text-sm"
              >
                <option value="office_established">Office - Established Patient</option>
                <option value="office_new">Office - New Patient</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Specialty</label>
              <input
                type="text"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="border rounded px-3 py-2 w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Note Text</label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={15}
                className="border rounded px-3 py-2 w-full text-sm font-mono"
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-slate-900 text-white px-4 py-2 rounded text-sm hover:bg-slate-800 disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <div className="text-xs text-slate-500">
                Last updated: {formatDate(encounter.updatedAt)}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Suggestions */}
        <div className="lg:col-span-1 space-y-4">
          <EncounterSuggestionsPanel
            encounter={encounter}
            isRunning={isRunningSuggest}
            onRunCodeloom={handleRunCodeloom}
            error={suggestError}
          />
          {encounter.status === 'ai_suggested' || encounter.status === 'finalized' ? (
            <EncounterFeedbackPanel encounterId={encounter.id} />
          ) : null}
        </div>
      </div>
    </div>
  );
};

