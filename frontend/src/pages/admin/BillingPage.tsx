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

  // Calculate usage percentage
  const encounterLimit = billing.includedLimits?.maxEncountersPerMonth || billing.monthlyEncounterLimit || 0;
  const encountersUsed = billing.currentUsage?.encountersWithAiSuggestions || billing.encountersThisMonth || 0;
  const usagePercent = encounterLimit > 0 ? Math.min(100, (encountersUsed / encounterLimit) * 100) : 0;

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getPlanTypeLabel = (planType: string) => {
    switch (planType) {
      case 'starter':
        return 'Starter';
      case 'growth':
        return 'Growth';
      case 'enterprise':
        return 'Enterprise';
      default:
        return planType;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'trialing':
        return <Badge variant="info">Trial</Badge>;
      case 'past_due':
        return <Badge variant="warning">Past Due</Badge>;
      case 'canceled':
        return <Badge variant="danger">Canceled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">Billing & Plan</h1>
        <p className="mt-1 text-sm text-semantic-muted">
          View your current plan, usage, and renewal information.
        </p>
      </div>

      {/* Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                Active since {formatDate(billing.planSince)}
              </CardDescription>
            </div>
            {getStatusBadge(billing.subscriptionStatus)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-semibold text-brand-ink">
                {getPlanTypeLabel(billing.planType)}
              </p>
              <p className="text-sm text-semantic-muted">
                {billing.billingCycle === 'annual' ? 'Annual billing' : 'Monthly billing'}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                window.location.href = 'mailto:support@codeloom.ai?subject=Plan%20Upgrade%20Request';
              }}
            >
              Contact us to change plan
            </Button>
          </div>

          {/* Renewal Date */}
          {billing.renewalDate && (
            <div className="rounded-lg border border-semantic-border bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase text-semantic-muted">Renewal Date</p>
              <p className="text-lg font-semibold text-brand-ink">{formatDate(billing.renewalDate)}</p>
            </div>
          )}

          {/* Features */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-semantic-border bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase text-semantic-muted">Max Providers</p>
              <p className="text-lg font-semibold text-brand-ink">
                {billing.includedLimits?.maxProviders || billing.maxProviders || 'Unlimited'}
              </p>
            </div>
            <div className="rounded-lg border border-semantic-border bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase text-semantic-muted">Training</p>
              <Badge variant={billing.features?.trainingEnabled || billing.trainingEnabled ? 'success' : 'default'}>
                {billing.features?.trainingEnabled || billing.trainingEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="rounded-lg border border-semantic-border bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase text-semantic-muted">Analytics</p>
              <Badge variant={billing.features?.analyticsEnabled || billing.analyticsEnabled ? 'success' : 'default'}>
                {billing.features?.analyticsEnabled || billing.analyticsEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="rounded-lg border border-semantic-border bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase text-semantic-muted">Exports</p>
              <Badge variant={billing.features?.exportsEnabled || billing.exportsEnabled ? 'success' : 'default'}>
                {billing.features?.exportsEnabled || billing.exportsEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Card */}
      <Card>
        <CardHeader>
          <CardTitle>Current Period Usage</CardTitle>
          <CardDescription>
            {billing.currentUsage ? (
              <>
                {formatDate(billing.currentUsage.periodStart)} – {formatDate(billing.currentUsage.periodEnd)}
              </>
            ) : (
              'Current billing period'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Encounters Usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-brand-ink">Encounters with AI Suggestions</span>
              <span className="text-semantic-muted">
                {encountersUsed} / {encounterLimit || '∞'}
              </span>
            </div>
            {encounterLimit > 0 && (
              <>
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
              </>
            )}
          </div>

          {/* Detailed Usage Stats */}
          {billing.currentUsage && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-semantic-border bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase text-semantic-muted">Encounters Created</p>
                <p className="text-lg font-semibold text-brand-ink">{billing.currentUsage.encountersCreated}</p>
              </div>
              <div className="rounded-lg border border-semantic-border bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase text-semantic-muted">Finalized</p>
                <p className="text-lg font-semibold text-brand-ink">{billing.currentUsage.encountersFinalized}</p>
              </div>
              <div className="rounded-lg border border-semantic-border bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase text-semantic-muted">AI Calls</p>
                <p className="text-lg font-semibold text-brand-ink">{billing.currentUsage.aiSuggestCalls}</p>
              </div>
              <div className="rounded-lg border border-semantic-border bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase text-semantic-muted">Training Attempts</p>
                <p className="text-lg font-semibold text-brand-ink">{billing.currentUsage.trainingAttempts}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Section */}
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col items-center text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <p className="font-medium text-brand-ink">Need to change your plan?</p>
              <p className="text-sm text-semantic-muted">
                Contact us to upgrade, downgrade, or discuss custom options.
              </p>
            </div>
            <Button
              variant="primary"
              className="mt-4 sm:mt-0"
              onClick={() => {
                window.location.href = 'mailto:support@codeloom.ai?subject=Plan%20Inquiry';
              }}
            >
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
