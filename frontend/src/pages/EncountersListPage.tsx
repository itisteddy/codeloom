import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { listEncounters, EncounterSummaryDto } from '../api/encounters';
import { EncounterTable } from '../components/encounters/EncounterTable';

export const EncountersListPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [encounters, setEncounters] = useState<EncounterSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    setIsLoading(true);
    setError(null);
    listEncounters(token)
      .then((data) => {
        setEncounters(data);
      })
      .catch((err: Error) => {
        setError(err.message || 'Failed to load encounters');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);

  const handleRowClick = (id: string) => {
    navigate(`/encounters/${id}`);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Encounters</h1>
        <button
          onClick={() => navigate('/encounters/new')}
          className="bg-slate-900 text-white px-4 py-2 rounded text-sm hover:bg-slate-800"
        >
          New Encounter
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-slate-600">Loading encounters...</div>
      ) : (
        <EncounterTable encounters={encounters} onRowClick={handleRowClick} />
      )}
    </div>
  );
};

