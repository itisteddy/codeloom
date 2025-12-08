import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { listEncounters, EncounterSummaryDto } from '../api/encounters';
import { EncounterTable } from '../components/encounters/EncounterTable';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';

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

  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-3 text-lg font-semibold text-slate-900">No encounters yet</div>
      <p className="text-sm text-slate-600 max-w-md">
        Create your first encounter to see AI coding suggestions here.
      </p>
      <div className="mt-4">
        <Button onClick={() => navigate('/encounters/new')}>New Encounter</Button>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Encounters</CardTitle>
          <p className="text-sm text-slate-600">Review and manage recent encounters.</p>
        </div>
        <Button onClick={() => navigate('/encounters/new')}>New Encounter</Button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        ) : encounters.length === 0 ? (
          renderEmpty()
        ) : (
          <EncounterTable encounters={encounters} onRowClick={handleRowClick} />
        )}
      </CardContent>
    </Card>
  );
};

