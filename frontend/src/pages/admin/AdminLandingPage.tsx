import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const adminSections = [
  {
    title: 'Team',
    description: 'Invite and manage users, assign roles, and control access.',
    to: '/admin/team',
    icon: '👥',
  },
  {
    title: 'Billing & Plan',
    description: 'View your current plan, usage limits, and renewal information.',
    to: '/admin/billing',
    icon: '💳',
  },
  {
    title: 'Security & Data',
    description: 'Configure PHI retention, storage settings, and security preferences.',
    to: '/admin/security',
    icon: '🔒',
  },
];

export const AdminLandingPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">Admin</h1>
        <p className="mt-1 text-sm text-semantic-muted">
          Manage your practice's team, billing, and security.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {adminSections.map((section) => (
          <Card key={section.to} className="hover:shadow-md transition-shadow duration-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{section.icon}</span>
                <CardTitle>{section.title}</CardTitle>
              </div>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to={section.to}>
                <Button variant="secondary" size="sm" className="w-full">
                  Manage
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

