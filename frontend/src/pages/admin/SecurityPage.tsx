import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import {
  getSecuritySettings,
  updateSecuritySettings,
  applyPhiRetention,
  SecuritySettings,
} from '../../api/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { IS_DEV } from '../../version';

export const SecurityPage: React.FC = () => {
  const { token, user } = useAuth();
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isApplyingRetention, setIsApplyingRetention] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [phiRetentionDays, setPhiRetentionDays] = useState<number | null>(null);
  const [storePhiAtRest, setStorePhiAtRest] = useState(true);

  useEffect(() => {
    if (!token) return;

    setIsLoading(true);
    setError(null);
    getSecuritySettings(token)
      .then((data) => {
        setSettings(data);
        setPhiRetentionDays(data.phiRetentionDays);
        setStorePhiAtRest(data.storePhiAtRest);
      })
      .catch((err: Error) => {
        setError(err.message || 'Failed to load security settings');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);

  const handleSave = async () => {
    if (!token) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateSecuritySettings(token, {
        phiRetentionDays,
        storePhiAtRest,
      });
      setSettings(updated);
      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyRetention = async () => {
    if (!token || !user?.practiceId) return;

    setIsApplyingRetention(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await applyPhiRetention(token, user.practiceId);
      setSuccess(result.message || 'PHI retention applied successfully');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to apply PHI retention');
    } finally {
      setIsApplyingRetention(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">Security & Data</h1>
        <p className="mt-1 text-sm text-semantic-muted">
          Manage PHI retention and storage settings for your practice.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>PHI Retention & Storage</CardTitle>
          <CardDescription>
            Configure how long to retain PHI and whether to store it at rest.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* PHI Retention Days */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-semantic-muted">
              PHI Retention Period
            </label>
            <select
              value={phiRetentionDays === null ? 'null' : phiRetentionDays.toString()}
              onChange={(e) => {
                const value = e.target.value;
                setPhiRetentionDays(value === 'null' ? null : parseInt(value, 10));
              }}
              className="w-full rounded-md border border-semantic-border bg-white px-3 py-2 text-sm text-brand-ink focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-tealSoft"
            >
              <option value="null">Keep until deleted</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="180">180 days</option>
              <option value="365">365 days</option>
            </select>
            <p className="text-xs text-semantic-muted">
              {phiRetentionDays === null
                ? 'PHI will be retained indefinitely until manually deleted.'
                : `PHI will be automatically redacted after ${phiRetentionDays} days.`}
            </p>
          </div>

          {/* Store PHI at Rest */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-semantic-muted">
                Store PHI at Rest
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={storePhiAtRest}
                  onChange={(e) => setStorePhiAtRest(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-teal rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-teal"></div>
              </label>
            </div>
            <p className="text-xs text-semantic-muted">
              {storePhiAtRest
                ? 'PHI is stored at rest. Encounter notes and patient data are retained in the database.'
                : 'When disabled, encounter note text will be redacted after processing. You will not be able to re-run suggestions unless you re-enter the note.'}
            </p>
            {!storePhiAtRest && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                ⚠️ Warning: Disabling PHI at rest will redact note text from all encounters. This cannot be undone.
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} loading={isSaving} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dev Tools Section */}
      {IS_DEV && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="text-amber-900">Dev Tools</CardTitle>
            <CardDescription className="text-amber-800">
              Development-only controls for testing PHI retention.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-amber-800">
                Manually trigger PHI retention for the current practice. This will redact note text
                and patient identifiers according to your retention settings.
              </p>
              <Button
                variant="secondary"
                onClick={handleApplyRetention}
                loading={isApplyingRetention}
                disabled={isApplyingRetention}
              >
                {isApplyingRetention ? 'Applying...' : 'Apply Retention Now'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

