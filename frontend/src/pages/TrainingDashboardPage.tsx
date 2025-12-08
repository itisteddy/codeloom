import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  listTrainingCases,
  TrainingCaseSummary,
  TrainingDifficulty,
} from '../api/training';

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

  const getDifficultyColor = (difficulty: TrainingDifficulty) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Training Cases</h1>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Specialty</label>
          <select
            value={filters.specialty || ''}
            onChange={(e) =>
              setFilters({ ...filters, specialty: e.target.value || undefined })
            }
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="primary_care">Primary Care</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Difficulty</label>
          <select
            value={filters.difficulty || ''}
            onChange={(e) =>
              setFilters({
                ...filters,
                difficulty: (e.target.value || undefined) as TrainingDifficulty | undefined,
              })
            }
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-slate-600">Loading training cases...</div>
      ) : cases.length === 0 ? (
        <div className="text-center py-8 text-slate-500">No training cases found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-4 py-2 text-left text-sm font-medium">
                  Title
                </th>
                <th className="border border-slate-300 px-4 py-2 text-left text-sm font-medium">
                  Specialty
                </th>
                <th className="border border-slate-300 px-4 py-2 text-left text-sm font-medium">
                  Difficulty
                </th>
                <th className="border border-slate-300 px-4 py-2 text-left text-sm font-medium">
                  Created
                </th>
                <th className="border border-slate-300 px-4 py-2 text-left text-sm font-medium">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {cases.map((case_) => (
                <tr key={case_.id} className="hover:bg-slate-50">
                  <td className="border border-slate-300 px-4 py-2 text-sm">{case_.title}</td>
                  <td className="border border-slate-300 px-4 py-2 text-sm">
                    {case_.specialty.replace('_', ' ')}
                  </td>
                  <td className="border border-slate-300 px-4 py-2 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(
                        case_.difficulty
                      )}`}
                    >
                      {case_.difficulty.toUpperCase()}
                    </span>
                  </td>
                  <td className="border border-slate-300 px-4 py-2 text-sm">
                    {formatDate(case_.createdAt)}
                  </td>
                  <td className="border border-slate-300 px-4 py-2 text-sm">
                    <button
                      onClick={() => navigate(`/training/cases/${case_.id}`)}
                      className="bg-slate-900 text-white px-3 py-1 rounded text-sm hover:bg-slate-800"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

