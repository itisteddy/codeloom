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

  const getDifficultyVariant = (difficulty: TrainingDifficulty): 'success' | 'warning' | 'danger' => {
    switch (difficulty) {
      case 'easy':
        return 'success';
      case 'medium':
        return 'warning';
      case 'hard':
        return 'danger';
      default:
        return 'success';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">Training Cases</h1>
        <p className="mt-1 text-sm text-semantic-muted">
          Practice coding on curated notes and compare with gold-standard answers.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-semantic-muted">Filters</span>
            <label className="block">
              <select
                value={filters.specialty || ''}
                onChange={(e) => setFilters({ ...filters, specialty: e.target.value || undefined })}
                className="rounded-md border border-semantic-border bg-white px-3 py-1.5 text-sm text-brand-ink focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-tealSoft"
              >
                <option value="">All specialties</option>
                <option value="primary_care">Primary Care</option>
              </select>
            </label>
            <label className="block">
              <select
                value={filters.difficulty || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    difficulty: (e.target.value || undefined) as TrainingDifficulty | undefined,
                  })
                }
                className="rounded-md border border-semantic-border bg-white px-3 py-1.5 text-sm text-brand-ink focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-tealSoft"
              >
                <option value="">All difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
          </div>
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
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <h3 className="text-lg font-semibold text-brand-ink mb-2">No training cases available</h3>
                <p className="text-sm text-semantic-muted">
                  Your admin can add cases in the Training section.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-left text-sm font-medium text-semantic-muted">
                    <th className="px-4 py-2">Title</th>
                    <th className="px-4 py-2">Specialty</th>
                    <th className="px-4 py-2">Difficulty</th>
                    <th className="px-4 py-2">Created</th>
                    <th className="px-4 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cases.map((case_) => (
                    <tr key={case_.id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-4 py-3 text-sm text-brand-ink">{case_.title}</td>
                      <td className="px-4 py-3 text-sm text-semantic-muted">
                        {case_.specialty.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={getDifficultyVariant(case_.difficulty)}>
                          {case_.difficulty.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-semantic-muted">
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

