import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { getRoleLabel, UserRole } from '../types/roles';

/**
 * Personal Settings page - accessible to all users
 * This is a minimal stub; will be expanded in Sub-phase C
 */
export const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">Settings</h1>
        <p className="mt-1 text-sm text-semantic-muted">
          Manage your personal profile and preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="First Name"
              value={user.firstName}
              disabled
              className="bg-slate-50"
            />
            <Input
              label="Last Name"
              value={user.lastName}
              disabled
              className="bg-slate-50"
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Customize your Codeloom experience</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-semantic-muted">
            User preferences (theme, notifications, etc.) will be available in a future update.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Manage your account security</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-semantic-muted">
            Password change and security options will be available in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

