import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getPilotSummary, exportPilotSummary, PilotSummary } from '../api/pilotSummary';

export const PilotSummaryPage: React.FC = () => {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState<PilotSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    if (!token || user?.role !== 'admin') {
      return;
    }

    loadSummary();
  }, [token, user]);

  const loadSummary = async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await getPilotSummary(
        token,
        fromDate || undefined,
        toDate || undefined
      );
      setSummary(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load pilot summary');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!token) return;

    setIsExporting(true);
    try {
      await exportPilotSummary(token, fromDate || undefined, toDate || undefined);
    } catch (err: any) {
      setError(err.message || 'Failed to export summary');
    } finally {
      setIsExporting(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          Access denied. This page is only available to administrators.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-8 text-slate-600">Loading pilot summary...</div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">{error}</div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Pilot Summary</h1>
          {summary.pilotLabel && (
            <p className="text-sm text-slate-600 mt-1">{summary.pilotLabel}</p>
          )}
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="bg-slate-900 text-white px-4 py-2 rounded text-sm hover:bg-slate-800 disabled:opacity-60"
        >
          {isExporting ? 'Exporting...' : 'Export Summary'}
        </button>
      </div>

      {/* Date Range Filters */}
      <div className="mb-6 flex gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={loadSummary}
            className="bg-slate-900 text-white px-4 py-2 rounded text-sm hover:bg-slate-800"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Practice Info */}
      <div className="border border-slate-200 rounded p-6 mb-6">
        <h2 className="text-lg font-medium mb-4">Practice Information</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-600">Practice:</span>{' '}
            <span className="font-medium">{summary.practiceName}</span>
          </div>
          <div>
            <span className="text-slate-600">Plan:</span>{' '}
            <span className="font-medium">{summary.planKey}</span>
          </div>
          <div>
            <span className="text-slate-600">Period:</span>{' '}
            <span className="font-medium">
              {formatDate(summary.periodStart)} - {formatDate(summary.periodEnd)}
            </span>
          </div>
        </div>
      </div>

      {/* Usage Metrics */}
      <div className="border border-slate-200 rounded p-6 mb-6">
        <h2 className="text-lg font-medium mb-4">Usage Metrics</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-slate-600">Encounters Created:</span>{' '}
            <span className="font-medium">{summary.usage.encountersCreated}</span>
          </div>
          <div>
            <span className="text-slate-600">AI Suggestions:</span>{' '}
            <span className="font-medium">{summary.usage.aiSuggestCalls}</span>
          </div>
          <div>
            <span className="text-slate-600">Training Attempts:</span>{' '}
            <span className="font-medium">{summary.usage.trainingAttempts}</span>
          </div>
        </div>
      </div>

      {/* Analytics */}
      <div className="border border-slate-200 rounded p-6 mb-6">
        <h2 className="text-lg font-medium mb-4">Analytics</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-600">Encounters:</span>{' '}
            <span className="font-medium">
              {summary.analytics.encounterCount} / {summary.analytics.finalizedCount} finalized
            </span>
          </div>
          <div>
            <span className="text-slate-600">AI Usage Rate:</span>{' '}
            <span className="font-medium">
              {Math.round(summary.analytics.aiUsageRate * 100)}%
            </span>
          </div>
          <div>
            <span className="text-slate-600">Override Rate:</span>{' '}
            <span className="font-medium">
              {Math.round(summary.analytics.overrideRate * 100)}%
            </span>
          </div>
          {summary.analytics.avgTimeToFinalizeMinutes !== null && (
            <div>
              <span className="text-slate-600">Avg Time to Finalize:</span>{' '}
              <span className="font-medium">
                {summary.analytics.avgTimeToFinalizeMinutes} minutes
              </span>
            </div>
          )}
          {summary.analytics.avgTrainingScorePercent !== null && (
            <div>
              <span className="text-slate-600">Avg Training Score:</span>{' '}
              <span className="font-medium">
                {Math.round(summary.analytics.avgTrainingScorePercent)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Feedback */}
      <div className="border border-slate-200 rounded p-6 mb-6">
        <h2 className="text-lg font-medium mb-4">User Feedback</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-600">Encounter Feedback:</span>{' '}
            <span className="font-medium">{summary.feedback.encounterFeedbackCount}</span>
          </div>
          {summary.feedback.helpfulRate !== null && (
            <div>
              <span className="text-slate-600">Helpful Rate:</span>{' '}
              <span className="font-medium">
                {Math.round(summary.feedback.helpfulRate * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* NPS */}
      <div className="border border-slate-200 rounded p-6 mb-6">
        <h2 className="text-lg font-medium mb-4">NPS</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-600">Responses:</span>{' '}
            <span className="font-medium">{summary.nps.responseCount}</span>
          </div>
          {summary.nps.avgScore !== null && (
            <div>
              <span className="text-slate-600">Avg Score:</span>{' '}
              <span className="font-medium">{summary.nps.avgScore.toFixed(1)} / 10</span>
            </div>
          )}
        </div>
      </div>

      {/* Baseline Comparison */}
      {summary.baseline && (
        <div className="border border-slate-200 rounded p-6">
          <h2 className="text-lg font-medium mb-4">Baseline vs Pilot</h2>
          <div className="space-y-2 text-sm">
            {summary.baseline.avgTimePerClaimMinutes !== undefined && (
              <div>
                <span className="text-slate-600">Avg Time/Claim:</span>{' '}
                <span className="font-medium">
                  Baseline: {summary.baseline.avgTimePerClaimMinutes} min → Pilot:{' '}
                  {summary.analytics.avgTimeToFinalizeMinutes !== null
                    ? `${summary.analytics.avgTimeToFinalizeMinutes} min`
                    : 'N/A'}
                </span>
              </div>
            )}
            {summary.baseline.denialRatePercent !== undefined && (
              <div>
                <span className="text-slate-600">Denial Rate:</span>{' '}
                <span className="font-medium">
                  Baseline: {summary.baseline.denialRatePercent}% → Pilot: N/A
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
