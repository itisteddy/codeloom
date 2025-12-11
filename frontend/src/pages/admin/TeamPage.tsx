import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import {
  getTeam,
  inviteUser,
  changeUserRole,
  deactivateUser,
  activateUser,
  cancelInvite,
  TeamMember,
  PendingInvite,
  UserRole,
} from '../../api/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';

export const TeamPage: React.FC = () => {
  const { token, user } = useAuth();
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invite modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('provider');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const fetchTeam = async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await getTeam(token);
      setUsers(data.users);
      setInvites(data.pendingInvites);
    } catch (err: any) {
      setError(err.message || 'Failed to load team');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, [token]);

  const handleInvite = async () => {
    if (!token || !inviteEmail.trim()) return;

    setIsInviting(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      const result = await inviteUser(token, inviteEmail.trim(), inviteRole);
      setInviteSuccess(`Invite sent! Link: ${result.inviteLink}`);
      setInviteEmail('');
      setInviteRole('provider');
      await fetchTeam();
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invite');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!token) return;

    try {
      await changeUserRole(token, userId, newRole);
      await fetchTeam();
    } catch (err: any) {
      setError(err.message || 'Failed to change role');
    }
  };

  const handleDeactivate = async (userId: string) => {
    if (!token) return;

    try {
      await deactivateUser(token, userId);
      await fetchTeam();
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate user');
    }
  };

  const handleActivate = async (userId: string) => {
    if (!token) return;

    try {
      await activateUser(token, userId);
      await fetchTeam();
    } catch (err: any) {
      setError(err.message || 'Failed to activate user');
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!token) return;

    try {
      await cancelInvite(token, inviteId);
      await fetchTeam();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel invite');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getRoleBadgeVariant = (role: UserRole): 'info' | 'default' | 'warning' => {
    switch (role) {
      case 'practice_admin':
      case 'platform_admin':
        return 'warning';
      case 'biller':
        return 'info';
      default:
        return 'default';
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-ink">Team Management</h1>
          <p className="mt-1 text-sm text-semantic-muted">
            Manage your practice team members and invitations.
          </p>
        </div>
        <Button onClick={() => setIsInviteOpen(true)}>Invite User</Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Team Members Card */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>{users.length} members in your practice</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-semantic-border bg-slate-50 text-left text-sm font-medium text-semantic-muted">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-semantic-border">
                {users.map((member) => (
                  <tr key={member.id} className="transition-colors duration-150 hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-brand-ink">{member.name}</td>
                    <td className="px-4 py-3 text-sm text-semantic-muted">{member.email}</td>
                    <td className="px-4 py-3 text-sm">
                      {member.id === user?.id ? (
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          {member.role.toUpperCase()}
                        </Badge>
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as UserRole)}
                          className="rounded-md border border-semantic-border bg-white px-2 py-1 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-tealSoft"
                        >
                          <option value="provider">Provider</option>
                          <option value="biller">Biller</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant={member.isActive ? 'success' : 'default'}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-semantic-muted">
                      {formatDate(member.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {member.id !== user?.id && (
                        member.isActive ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeactivate(member.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleActivate(member.id)}
                            className="text-emerald-600 hover:text-emerald-700"
                          >
                            Activate
                          </Button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pending Invites Card */}
      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>{invites.length} pending invites</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-semantic-border bg-slate-50 text-left text-sm font-medium text-semantic-muted">
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Expires</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-semantic-border">
                  {invites.map((invite) => (
                    <tr key={invite.id} className="transition-colors duration-150 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-brand-ink">{invite.email}</td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={getRoleBadgeVariant(invite.role)}>
                          {invite.role.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-semantic-muted">
                        {formatDate(invite.expiresAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCancelInvite(invite.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Cancel
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Modal */}
      <Modal open={isInviteOpen} onClose={() => setIsInviteOpen(false)} title="Invite Team Member">
        <div className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="user@example.com"
          />

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-semantic-muted">Role</span>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
              className="w-full rounded-md border border-semantic-border bg-white px-3 py-2 text-sm text-brand-ink focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-tealSoft"
            >
              <option value="provider">Provider</option>
              <option value="biller">Biller</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          {inviteError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {inviteError}
            </div>
          )}

          {inviteSuccess && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {inviteSuccess}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} loading={isInviting} disabled={!inviteEmail.trim()}>
              Send Invite
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

