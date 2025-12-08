import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  getAnalyticsSummary,
  downloadEncountersCsv,
  PracticeAnalyticsSummary,
} from '../api/analytics';
import { PracticeNpsPrompt } from '../components/PracticeNpsPrompt';

export const AnalyticsPage: React.FC = () => {
  const { token, user } = useAuth();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [summary, setSummary] = useState<PracticeAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Initialize dates (30 days ago to today)
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    setToDate(today.toISOString().split('T')[0]);
    setFromDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  // Fetch summary when dates change or on mount
  useEffect(() => {
    if (!token || !fromDate || !toDate) return;

    setIsLoading(true);
    setError(null);
    getAnalyticsSummary(token, { fromDate, toDate })
      .then((data) => {
        setSummary(data);
      })
      .catch((err: Error) => {
        setError(err.message || 'Failed to load analytics');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token, fromDate, toDate]);

  const handleRefresh = () => {
    if (!token || !fromDate || !toDate) return;

    setIsLoading(true);
    setError(null);
    getAnalyticsSummary(token, { fromDate, toDate })
      .then((data) => {
        setSummary(data);
      })
      .catch((err: Error) => {
        setError(err.message || 'Failed to load analytics');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleDownloadCsv = async () => {
    if (!token || !fromDate || !toDate) return;

    setIsDownloading(true);
    setDownloadError(null);

    try {
      const blob = await downloadEncountersCsv(token, { fromDate, toDate });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `codeloom-encounters-${fromDate}-${toDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setDownloadError(err.message || 'Failed to download CSV');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Analytics</h1>
      {(user?.role === 'biller' || user?.role === 'admin') && <PracticeNpsPrompt />}

      {/* Filters */}
      <div className="mb-6 flex gap-4 items-end">
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
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="bg-slate-900 text-white px-4 py-2 rounded text-sm hover:bg-slate-800 disabled:opacity-60"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {isLoading && !summary ? (
        <div className="text-center py-8 text-slate-600">Loading analytics...</div>
      ) : summary ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Encounters */}
            <div className="border border-slate-200 rounded p-4 bg-white">
              <h3 className="text-sm font-medium text-slate-600 mb-1">Total Encounters</h3>
              <div className="text-3xl font-bold text-slate-900">{summary.encounterCount}</div>
              <div className="text-sm text-slate-600 mt-1">
                Finalized: {summary.finalizedCount}
              </div>
            </div>

            {/* AI Usage */}
            <div className="border border-slate-200 rounded p-4 bg-white">
              <h3 className="text-sm font-medium text-slate-600 mb-1">AI Usage</h3>
              <div className="text-3xl font-bold text-slate-900">
                {summary.aiSuggestedCount}
              </div>
              <div className="text-sm text-slate-600 mt-1">
                Usage rate: {Math.round(summary.aiUsageRate * 100)}%
              </div>
            </div>

            {/* Overrides */}
            <div className="border border-slate-200 rounded p-4 bg-white">
              <h3 className="text-sm font-medium text-slate-600 mb-1">Overrides</h3>
              <div className="text-3xl font-bold text-slate-900">
                {Math.round(summary.overrideRate * 100)}%
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Percent of AI-suggested E/M codes that were changed
              </div>
            </div>

            {/* Time to Finalize */}
            <div className="border border-slate-200 rounded p-4 bg-white">
              <h3 className="text-sm font-medium text-slate-600 mb-1">Time to Finalize</h3>
              {summary.avgTimeToFinalizeMinutes !== null ? (
                <>
                  <div className="text-3xl font-bold text-slate-900">
                    {summary.avgTimeToFinalizeMinutes.toFixed(1)}
                  </div>
                  <div className="text-sm text-slate-600 mt-1">minutes (avg)</div>
                </>
              ) : (
                <div className="text-sm text-slate-500">No finalized encounters</div>
              )}
            </div>
          </div>

          {/* Training Metrics */}
          <div className="border border-slate-200 rounded p-4 bg-white mb-6">
            <h2 className="font-medium mb-3">Training Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-slate-600">Training attempts: </span>
                <span className="font-medium">{summary.trainingAttemptsCount}</span>
              </div>
              <div>
                {summary.avgTrainingScorePercent !== null ? (
                  <>
                    <span className="text-sm text-slate-600">Avg training score: </span>
                    <span className="font-medium">
                      {summary.avgTrainingScorePercent.toFixed(1)}%
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-slate-500">No training attempts yet</span>
                )}
              </div>
            </div>
          </div>

          {/* Export Section */}
          <div className="border border-slate-200 rounded p-4 bg-white">
            <h2 className="font-medium mb-3">Export Data</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={handleDownloadCsv}
                disabled={isDownloading}
                className="bg-slate-900 text-white px-4 py-2 rounded text-sm hover:bg-slate-800 disabled:opacity-60"
              >
                {isDownloading ? 'Downloading...' : 'Download encounters CSV'}
              </button>
              <p className="text-sm text-slate-600">
                Exports all encounters in this date range for your practice.
              </p>
            </div>
            {downloadError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {downloadError}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
};

