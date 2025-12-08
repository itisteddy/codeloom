import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  listTrainingCases,
  TrainingCaseSummary,
  TrainingDifficulty,
} from '../api/training';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';

export const TrainingDashboardPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<TrainingCaseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<{
    specialty?: string;
    difficulty?: TrainingDifficulty;
  }>({});

  useEffect(() => {
    if (!token) return;

    setIsLoading(true);
    setError(null);
    listTrainingCases(token, filters)
      .then((data) => {
        setCases(data);
      })
      .catch((err: Error) => {
        setError(err.message || 'Failed to load training cases');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token, filters]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getDifficultyVariant = (difficulty: TrainingDifficulty) => {
    switch (difficulty) {
      case 'easy':
        return 'success';
      case 'medium':
        return 'warning';
      case 'hard':
        return 'danger';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Training Cases</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Specialty</span>
            <select
              value={filters.specialty || ''}
              onChange={(e) => setFilters({ ...filters, specialty: e.target.value || undefined })}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              <option value="">All</option>
              <option value="primary_care">Primary Care</option>
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Difficulty</span>
            <select
              value={filters.difficulty || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  difficulty: (e.target.value || undefined) as TrainingDifficulty | undefined,
                })
              }
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              <option value="">All</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Cases</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No training cases found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-left text-sm font-medium text-slate-700">
                    <th className="px-4 py-2">Title</th>
                    <th className="px-4 py-2">Specialty</th>
                    <th className="px-4 py-2">Difficulty</th>
                    <th className="px-4 py-2">Created</th>
                    <th className="px-4 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {cases.map((case_) => (
                    <tr key={case_.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-900">{case_.title}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {case_.specialty.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={getDifficultyVariant(case_.difficulty)}>
                          {case_.difficulty.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatDate(case_.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/training/cases/${case_.id}`)}>
                          Open
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

