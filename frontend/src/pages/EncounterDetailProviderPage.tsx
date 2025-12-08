import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getEncounter, updateEncounterMetadata, runSuggestions, EncounterDto } from '../api/encounters';
import { EncounterSuggestionsPanel } from '../components/encounters/EncounterSuggestionsPanel';
import { EncounterFeedbackPanel } from '../components/encounters/EncounterFeedbackPanel';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';

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
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  if (error && !encounter) {
    return (
      <Card className="max-w-2xl">
        <CardContent>
          <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">{error}</div>
          <Button variant="ghost" className="mt-4 text-sm" onClick={() => navigate('/encounters')}>
            ← Back to Encounters
          </Button>
        </CardContent>
      </Card>
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
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/encounters')}>
        ← Back to Encounters
      </Button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Form */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Encounter Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              <Input
                label="Patient ID"
                value={patientPseudoId}
                onChange={(e) => setPatientPseudoId(e.target.value)}
              />
              <Input
                label="Encounter Date"
                type="date"
                value={encounterDate}
                onChange={(e) => setEncounterDate(e.target.value)}
              />
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Visit Type</span>
                <select
                  value={visitType}
                  onChange={(e) => setVisitType(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                >
                  <option value="office_established">Office - Established Patient</option>
                  <option value="office_new">Office - New Patient</option>
                </select>
              </label>
              <Input
                label="Specialty"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
              />
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Note Text</span>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={12}
                  className="thin-scrollbar w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-mono shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button onClick={handleSave} loading={isSaving} variant="secondary">
                  Save
                </Button>
                <div className="text-xs text-slate-500">
                  Last updated: {formatDate(encounter.updatedAt)}
                </div>
                <div className="flex items-center gap-2">
                  {suggestError && <span className="text-sm text-red-600">{suggestError}</span>}
                  <Button onClick={handleRunCodeloom} loading={isRunningSuggest}>
                    Run Codeloom
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
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

