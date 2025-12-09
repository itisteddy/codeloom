import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';

export const LoginPage: React.FC = () => {
  const { user, login, isLoading, error } = useAuth();
  const [email, setEmail] = useState('provider@example.com');
  const [password, setPassword] = useState('changeme123');
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* Left brand column */}
        <div className="hidden lg:flex flex-col justify-center gap-6 bg-slate-900 px-12 text-slate-100">
          <div>
            <Logo showText size="lg" variant="light" />
            <p className="mt-2 text-sm text-slate-300">
              AI-assisted medical coding for small practices.
            </p>
          </div>
          <div className="space-y-2 text-sm text-slate-200">
            <p>• Turn free-text notes into compliant, revenue-optimized codes.</p>
            <p>• Biller-first controls with audit trail ready.</p>
            <p>• Training mode to level-up providers.</p>
          </div>
        </div>

        {/* Right form column */}
        <div className="flex items-center justify-center px-6 py-12">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Sign in to Codeloom</CardTitle>
              <CardDescription>
                Use the seeded test account (e.g., provider@example.com / changeme123) for now.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" loading={isLoading}>
                  {isLoading ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

