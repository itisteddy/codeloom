import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  getAnalyticsSummary,
  downloadEncountersCsv,
  PracticeAnalyticsSummary,
} from '../api/analytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const AnalyticsPage: React.FC = () => {
  const { token } = useAuth();
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">Analytics</h1>
        <p className="mt-1 text-sm text-semantic-muted">
          See how Codeloom is being used across your practice.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <Input
              label="From Date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-auto"
            />
            <Input
              label="To Date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-auto"
            />
            <Button onClick={handleRefresh} loading={isLoading}>
              {isLoading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading && !summary ? (
        <div className="text-center py-8 text-semantic-muted">Loading practice analytics...</div>
      ) : summary ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Encounters */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-sm font-medium text-semantic-muted mb-1">Practice Encounters</h3>
                <div className="text-3xl font-bold text-brand-ink">{summary.encounterCount}</div>
                <div className="text-sm text-semantic-muted mt-1">
                  Finalized: {summary.finalizedCount}
                </div>
              </CardContent>
            </Card>

            {/* AI Usage */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-sm font-medium text-semantic-muted mb-1">AI Suggestions Used</h3>
                <div className="text-3xl font-bold text-brand-ink">
                  {summary.aiSuggestedCount}
                </div>
                <div className="text-sm text-semantic-muted mt-1">
                  Practice usage rate: {Math.round(summary.aiUsageRate * 100)}%
                </div>
              </CardContent>
            </Card>

            {/* Overrides */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-sm font-medium text-semantic-muted mb-1">Override Rate</h3>
                <div className="text-3xl font-bold text-brand-ink">
                  {Math.round(summary.overrideRate * 100)}%
                </div>
                <div className="text-xs text-semantic-muted mt-1">
                  AI E/M codes changed by billers across practice
                </div>
              </CardContent>
            </Card>

            {/* Time to Finalize */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-sm font-medium text-semantic-muted mb-1">Avg Time to Finalize</h3>
                {summary.avgTimeToFinalizeMinutes !== null ? (
                  <>
                    <div className="text-3xl font-bold text-brand-ink">
                      {summary.avgTimeToFinalizeMinutes.toFixed(1)}
                    </div>
                    <div className="text-sm text-semantic-muted mt-1">minutes (practice avg)</div>
                  </>
                ) : (
                  <div className="text-sm text-semantic-muted">No finalized encounters</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Training Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Training Metrics</CardTitle>
              <CardDescription>Practice-wide training activity and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-semantic-muted">Total training attempts: </span>
                  <span className="font-medium text-brand-ink">{summary.trainingAttemptsCount}</span>
                </div>
                <div>
                  {summary.avgTrainingScorePercent !== null ? (
                    <>
                      <span className="text-sm text-semantic-muted">Avg training score: </span>
                      <span className="font-medium text-brand-ink">
                        {summary.avgTrainingScorePercent.toFixed(1)}%
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-semantic-muted">No training attempts yet</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Section */}
          <Card>
            <CardHeader>
              <CardTitle>Export Data</CardTitle>
              <CardDescription>Download encounter data for reporting and analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  onClick={handleDownloadCsv}
                  loading={isDownloading}
                  variant="secondary"
                >
                  {isDownloading ? 'Downloading...' : 'Download encounters CSV'}
                </Button>
                <p className="text-sm text-semantic-muted">
                  Exports all practice encounters in this date range.
                </p>
              </div>
              {downloadError && (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {downloadError}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
};

