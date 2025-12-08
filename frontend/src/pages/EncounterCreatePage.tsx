import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { createEncounter } from '../api/encounters';

export const EncounterCreatePage: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const [patientPseudoId, setPatientPseudoId] = useState('');
  const [encounterDate, setEncounterDate] = useState(today);
  const [visitType, setVisitType] = useState('office_established');
  const [specialty, setSpecialty] = useState('primary_care');
  const [noteText, setNoteText] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token || !user) {
      setError('You must be logged in to create an encounter');
      return;
    }

    if (!patientPseudoId.trim() || !noteText.trim()) {
      setError('Patient ID and note text are required');
      return;
    }

    setIsSubmitting(true);

    try {
      const encounter = await createEncounter(token, {
        patientPseudoId: patientPseudoId.trim(),
        encounterDate,
        visitType,
        specialty,
        noteText: noteText.trim(),
      });
      navigate(`/encounters/${encounter.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create encounter');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">New Encounter</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Patient ID <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={patientPseudoId}
            onChange={(e) => setPatientPseudoId(e.target.value)}
            className="border rounded px-3 py-2 w-full text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Encounter Date <span className="text-red-600">*</span>
          </label>
          <input
            type="date"
            value={encounterDate}
            onChange={(e) => setEncounterDate(e.target.value)}
            className="border rounded px-3 py-2 w-full text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Visit Type <span className="text-red-600">*</span>
          </label>
          <select
            value={visitType}
            onChange={(e) => setVisitType(e.target.value)}
            className="border rounded px-3 py-2 w-full text-sm"
            required
          >
            <option value="office_established">Office - Established Patient</option>
            <option value="office_new">Office - New Patient</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Specialty <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="border rounded px-3 py-2 w-full text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Note Text <span className="text-red-600">*</span>
          </label>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={10}
            className="border rounded px-3 py-2 w-full text-sm font-mono"
            required
            placeholder="Paste or type the clinical note here..."
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-slate-900 text-white px-4 py-2 rounded text-sm hover:bg-slate-800 disabled:opacity-60"
          >
            {isSubmitting ? 'Creating...' : 'Create Encounter'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/encounters')}
            className="border border-slate-300 px-4 py-2 rounded text-sm hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

