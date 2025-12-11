import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { getRoleLabel, UserRole } from '../types/roles';
import {
  getSettings,
  updateSettings,
  updateProfile,
  changePassword,
  UserSettings,
} from '../api/me';

type Theme = 'light' | 'dark' | 'system';
type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY';

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
  { value: 'UTC', label: 'UTC' },
];

export const SettingsPage: React.FC = () => {
  const { user, token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Profile state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Preferences state
  const [theme, setTheme] = useState<Theme>('system');
  const [timeZone, setTimeZone] = useState<string>('');
  const [dateFormat, setDateFormat] = useState<DateFormat>('MM/DD/YYYY');
  const [emailAssignments, setEmailAssignments] = useState(true);
  const [emailWeeklySummary, setEmailWeeklySummary] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  // Role-specific preferences
  const [rolePrefs, setRolePrefs] = useState<Record<string, unknown>>({});

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (!token || !user) return;

    // Initialize profile from auth context
    setFirstName(user.firstName);
    setLastName(user.lastName);

    // Fetch settings
    setIsLoading(true);
    getSettings(token)
      .then((settings) => {
        setTheme(settings.theme);
        setTimeZone(settings.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone);
        setDateFormat(settings.dateFormat);
        setEmailAssignments(settings.notificationPrefs?.emailAssignments ?? true);
        setEmailWeeklySummary(settings.notificationPrefs?.emailWeeklySummary ?? false);
        setRolePrefs(settings.rolePrefs || {});
      })
      .catch((err) => {
        // Settings might not exist yet, use defaults
        setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token, user]);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSaveProfile = async () => {
    if (!token) return;

    setIsSavingProfile(true);
    setError(null);

    try {
      await updateProfile(token, { firstName, lastName });
      showSuccess('Profile updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!token) return;

    setIsSavingPrefs(true);
    setError(null);

    try {
      await updateSettings(token, {
        theme,
        timeZone: timeZone || null,
        dateFormat,
        notificationPrefs: {
          emailAssignments,
          emailWeeklySummary,
        },
        rolePrefs,
      });
      showSuccess('Preferences saved successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to save preferences');
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleChangePassword = async () => {
    if (!token) return;

    // Validate
    setPasswordError(null);
    if (!currentPassword || !newPassword) {
      setPasswordError('Please fill in all password fields');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setIsChangingPassword(true);

    try {
      await changePassword(token, { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showSuccess('Password changed successfully');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">Settings</h1>
        <p className="mt-1 text-sm text-semantic-muted">
          Manage your personal profile and preferences.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Enter your first name"
            />
            <Input
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Enter your last name"
            />
          </div>
          <Input
            label="Email"
            value={user.email}
            disabled
            className="bg-slate-50"
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-semantic-muted">Role</label>
            <Badge variant="default">{getRoleLabel(user.role as UserRole)}</Badge>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} loading={isSavingProfile}>
              Save Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preferences Section */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Customize your Codeloom experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-brand-ink">Theme</label>
            <div className="flex gap-3">
              {(['system', 'light', 'dark'] as Theme[]).map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value={t}
                    checked={theme === t}
                    onChange={() => setTheme(t)}
                    className="h-4 w-4 border-gray-300 text-brand-teal focus:ring-brand-teal"
                  />
                  <span className="text-sm capitalize">{t}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Time Zone */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-brand-ink">Time Zone</label>
            <select
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
              className="w-full rounded-md border border-semantic-border bg-white px-3 py-2 text-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Format */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-brand-ink">Date Format</label>
            <div className="flex gap-3">
              {(['MM/DD/YYYY', 'DD/MM/YYYY'] as DateFormat[]).map((fmt) => (
                <label key={fmt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dateFormat"
                    value={fmt}
                    checked={dateFormat === fmt}
                    onChange={() => setDateFormat(fmt)}
                    className="h-4 w-4 border-gray-300 text-brand-teal focus:ring-brand-teal"
                  />
                  <span className="text-sm">{fmt}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-brand-ink">Notifications</label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailAssignments}
                onChange={(e) => setEmailAssignments(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-teal focus:ring-brand-teal"
              />
              <span className="text-sm">Email me when I'm assigned an encounter</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailWeeklySummary}
                onChange={(e) => setEmailWeeklySummary(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-teal focus:ring-brand-teal"
              />
              <span className="text-sm">Send me a weekly summary email</span>
            </label>
          </div>

          {/* Role-specific preferences */}
          {user.role === 'provider' && (
            <div className="space-y-3 border-t pt-4">
              <label className="block text-sm font-medium text-brand-ink">Provider Settings</label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(rolePrefs.autoRunCodeloom)}
                  onChange={(e) => setRolePrefs({ ...rolePrefs, autoRunCodeloom: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-brand-teal focus:ring-brand-teal"
                />
                <span className="text-sm">Run Codeloom automatically after saving note</span>
              </label>
            </div>
          )}

          {user.role === 'biller' && (
            <div className="space-y-3 border-t pt-4">
              <label className="block text-sm font-medium text-brand-ink">Biller Settings</label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(rolePrefs.autoOpenSuggestions)}
                  onChange={(e) => setRolePrefs({ ...rolePrefs, autoOpenSuggestions: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-brand-teal focus:ring-brand-teal"
                />
                <span className="text-sm">Auto-open Suggestions panel when opening an encounter</span>
              </label>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSavePreferences} loading={isSavingPrefs}>
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Change your password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {passwordError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {passwordError}
            </div>
          )}

          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
          />
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password (min 8 characters)"
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
          />

          <div className="flex justify-end">
            <Button
              onClick={handleChangePassword}
              loading={isChangingPassword}
              variant="secondary"
            >
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
