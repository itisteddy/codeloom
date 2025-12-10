import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { getBilling, BillingInfo } from '../../api/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';

export const BillingPage: React.FC = () => {
  const { token } = useAuth();
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    setIsLoading(true);
    setError(null);
    getBilling(token)
      .then((data) => {
        setBilling(data);
      })
      .catch((err: Error) => {
        setError(err.message || 'Failed to load billing info');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!billing) {
    return null;
  }

  const usagePercent = billing.monthlyEncounterLimit
    ? Math.min(100, (billing.encountersThisMonth / billing.monthlyEncounterLimit) * 100)
    : 0;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">Billing & Plan</h1>
        <p className="mt-1 text-sm text-semantic-muted">
          View your current plan and usage details.
        </p>
      </div>

      {/* Plan Card */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            Active since {formatDate(billing.planSince)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-semibold text-brand-ink">{billing.planName}</p>
              <p className="text-sm text-semantic-muted">Plan key: {billing.planKey}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                window.location.href = 'mailto:support@codeloom.ai?subject=Plan%20Upgrade%20Request';
              }}
            >
              Contact us to upgrade
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-semantic-border bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase text-semantic-muted">Max Providers</p>
              <p className="text-lg font-semibold text-brand-ink">{billing.maxProviders}</p>
            </div>
            <div className="rounded-lg border border-semantic-border bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase text-semantic-muted">Training</p>
              <Badge variant={billing.trainingEnabled ? 'success' : 'default'}>
                {billing.trainingEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="rounded-lg border border-semantic-border bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase text-semantic-muted">Analytics</p>
              <Badge variant={billing.analyticsEnabled ? 'success' : 'default'}>
                {billing.analyticsEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="rounded-lg border border-semantic-border bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase text-semantic-muted">Exports</p>
              <Badge variant={billing.exportsEnabled ? 'success' : 'default'}>
                {billing.exportsEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Card */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Usage</CardTitle>
          <CardDescription>Current billing period usage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Encounters Usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-brand-ink">Encounters</span>
              <span className="text-semantic-muted">
                {billing.encountersThisMonth} / {billing.monthlyEncounterLimit}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  usagePercent >= 90
                    ? 'bg-red-500'
                    : usagePercent >= 70
                    ? 'bg-amber-500'
                    : 'bg-brand-teal'
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <p className="text-xs text-semantic-muted">
              {Math.round(usagePercent)}% of monthly limit used
            </p>
          </div>

          {/* AI Suggest Calls */}
          <div className="rounded-lg border border-semantic-border bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-brand-ink">AI Suggestion Calls</p>
                <p className="text-xs text-semantic-muted">This billing period</p>
              </div>
              <p className="text-2xl font-semibold text-brand-ink">
                {billing.aiSuggestCallsThisMonth}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

