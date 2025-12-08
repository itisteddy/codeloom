import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getPlanInfo, PlanInfo } from '../api/plan';

export const PlanUsagePage: React.FC = () => {
  const { token, user } = useAuth();
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || (user?.role !== 'biller' && user?.role !== 'admin')) {
      return;
    }

    setIsLoading(true);
    setError(null);
    getPlanInfo(token)
      .then((data) => {
        setPlanInfo(data);
      })
      .catch((err: Error) => {
        setError(err.message || 'Failed to load plan information');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token, user]);

  if (user?.role !== 'biller' && user?.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          Access denied. This page is only available to billers and administrators.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-8 text-slate-600">Loading plan information...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">{error}</div>
      </div>
    );
  }

  if (!planInfo) {
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const encountersProgress = Math.min(
    (planInfo.currentUsage.encountersCreated / planInfo.maxEncountersPerMonth) * 100,
    100
  );

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Plan & Usage</h1>

      {/* Current Plan Section */}
      <div className="border border-slate-200 rounded p-6 mb-6">
        <h2 className="text-lg font-medium mb-4">Current Plan</h2>
        <div className="space-y-3">
          <div>
            <span className="text-slate-600">Plan:</span>{' '}
            <span className="font-semibold">{planInfo.planName}</span>{' '}
            <span className="text-sm text-slate-500">({planInfo.planKey})</span>
          </div>
          <div>
            <span className="text-slate-600">Max Providers:</span>{' '}
            <span className="font-medium">{planInfo.maxProviders}</span>
          </div>
          <div>
            <span className="text-slate-600">Max Encounters/Month:</span>{' '}
            <span className="font-medium">{planInfo.maxEncountersPerMonth}</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <span
              className={`px-3 py-1 rounded text-sm ${
                planInfo.trainingEnabled
                  ? 'bg-green-100 text-green-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {planInfo.trainingEnabled ? '✓ Training' : '✗ Training'}
            </span>
            <span
              className={`px-3 py-1 rounded text-sm ${
                planInfo.analyticsEnabled
                  ? 'bg-green-100 text-green-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {planInfo.analyticsEnabled ? '✓ Analytics' : '✗ Analytics'}
            </span>
            <span
              className={`px-3 py-1 rounded text-sm ${
                planInfo.exportsEnabled
                  ? 'bg-green-100 text-green-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {planInfo.exportsEnabled ? '✓ Exports' : '✗ Exports'}
            </span>
          </div>
        </div>
      </div>

      {/* Usage Section */}
      <div className="border border-slate-200 rounded p-6">
        <h2 className="text-lg font-medium mb-4">Usage This Period</h2>
        <div className="space-y-4">
          <div className="text-sm text-slate-600">
            Period: {formatDate(planInfo.currentUsage.periodStart)} -{' '}
            {formatDate(planInfo.currentUsage.periodEnd)}
          </div>

          {/* Encounters Usage */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Encounters Created</span>
              <span className="text-sm text-slate-600">
                {planInfo.currentUsage.encountersCreated} / {planInfo.maxEncountersPerMonth}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  encountersProgress >= 90
                    ? 'bg-red-500'
                    : encountersProgress >= 75
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${encountersProgress}%` }}
              />
            </div>
          </div>

          {/* AI Suggestions */}
          <div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">AI Suggestions</span>
              <span className="text-sm text-slate-600">
                {planInfo.currentUsage.aiSuggestCalls}
              </span>
            </div>
          </div>

          {/* Training Attempts */}
          <div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Training Attempts</span>
              <span className="text-sm text-slate-600">
                {planInfo.currentUsage.trainingAttempts}
                {!planInfo.trainingEnabled && (
                  <span className="ml-2 text-orange-600">(Training disabled)</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

