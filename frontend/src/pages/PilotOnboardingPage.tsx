import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getPilotConfig, updatePilotConfig } from '../api/pilotConfig';
import { createInvite, listInvites, UserInvite } from '../api/invitations';
import { getPlanInfo } from '../api/plan';
import { isAdmin } from '../types/roles';

const SPECIALTY_OPTIONS = [
  'primary_care',
  'cardiology',
  'behavioral_health',
  'orthopedics',
  'dermatology',
  'pediatrics',
  'internal_medicine',
];

interface TeamMember {
  email: string;
  role: 'provider' | 'biller' | 'admin';
  firstName: string;
  lastName: string;
}

export const PilotOnboardingPage: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Practice basics
  const [pilotLabel, setPilotLabel] = useState('');
  const [pilotStartDate, setPilotStartDate] = useState('');
  const [planKey, setPlanKey] = useState('plan_a');

  // Step 2: Team
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<UserInvite[]>([]);

  // Step 3: Specialties
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);

  // Step 4: Pilot config
  const [llmModeOverride, setLlmModeOverride] = useState<string | null>(null);
  const [providerCanFinalize, setProviderCanFinalize] = useState(true);

  useEffect(() => {
    if (!token || !isAdmin(user?.role)) {
      navigate('/encounters');
      return;
    }

    // Load existing config if available
    loadConfig();
  }, [token, user, navigate]);

  const loadConfig = async () => {
    if (!token) return;

    try {
      const config = await getPilotConfig(token);
      if (config.pilotLabel) {
        setPilotLabel(config.pilotLabel);
      }
      if (config.pilotStartDate) {
        setPilotStartDate(config.pilotStartDate.split('T')[0]);
      }
      if (config.enabledSpecialties) {
        setSelectedSpecialties(config.enabledSpecialties);
      }
      setLlmModeOverride(config.llmModeOverride);
      setProviderCanFinalize(config.providerCanFinalize);

      // Load existing invites
      const existingInvites = await listInvites(token, user!.practiceId);
      setInvites(existingInvites);
    } catch (err) {
      // Config might not exist yet, that's okay
      console.error('Failed to load config:', err);
    }
  };

  const handleAddTeamMember = () => {
    setTeamMembers([
      ...teamMembers,
      { email: '', role: 'provider', firstName: '', lastName: '' },
    ]);
  };

  const handleRemoveTeamMember = (index: number) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
  };

  const handleUpdateTeamMember = (index: number, field: keyof TeamMember, value: string) => {
    const updated = [...teamMembers];
    updated[index] = { ...updated[index], [field]: value };
    setTeamMembers(updated);
  };

  const handleCreateInvites = async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const newInvites: UserInvite[] = [];
      for (const member of teamMembers) {
        if (member.email && member.firstName && member.lastName) {
          const invite = await createInvite(token, user!.practiceId, member.email, member.role);
          newInvites.push(invite);
        }
      }
      setInvites([...invites, ...newInvites]);
      setTeamMembers([]);
    } catch (err: any) {
      setError(err.message || 'Failed to create invites');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveStep1 = async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      await updatePilotConfig(token, {
        pilotLabel: pilotLabel || null,
        pilotStartDate: pilotStartDate || null,
      });
      setCurrentStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to save practice basics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveStep3 = async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      await updatePilotConfig(token, {
        enabledSpecialties: selectedSpecialties.length > 0 ? selectedSpecialties : null,
      });
      setCurrentStep(4);
    } catch (err: any) {
      setError(err.message || 'Failed to save specialties');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveStep4 = async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      await updatePilotConfig(token, {
        llmModeOverride: llmModeOverride as 'mock' | 'openai' | null,
        providerCanFinalize,
      });
      setCurrentStep(5);
    } catch (err: any) {
      setError(err.message || 'Failed to save pilot config');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin(user?.role)) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Pilot Onboarding</h1>

      {/* Progress indicator */}
      <div className="mb-8 flex items-center justify-between">
        {[1, 2, 3, 4, 5].map((step) => (
          <div key={step} className="flex items-center flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step <= currentStep
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {step}
            </div>
            {step < 5 && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  step < currentStep ? 'bg-slate-900' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Practice Basics */}
      {currentStep === 1 && (
        <div className="border border-slate-200 rounded p-6">
          <h2 className="text-lg font-medium mb-4">Step 1: Practice Basics</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Pilot Label</label>
              <input
                type="text"
                value={pilotLabel}
                onChange={(e) => setPilotLabel(e.target.value)}
                placeholder="e.g., Pilot – Smith Family Practice"
                className="border rounded px-3 py-2 w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Pilot Start Date</label>
              <input
                type="date"
                value={pilotStartDate}
                onChange={(e) => setPilotStartDate(e.target.value)}
                className="border rounded px-3 py-2 w-full text-sm"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSaveStep1}
                disabled={isLoading}
                className="bg-slate-900 text-white px-6 py-2 rounded text-sm hover:bg-slate-800 disabled:opacity-60"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Team & Invites */}
      {currentStep === 2 && (
        <div className="border border-slate-200 rounded p-6">
          <h2 className="text-lg font-medium mb-4">Step 2: Team & Invites</h2>
          <div className="space-y-4">
            {teamMembers.map((member, index) => (
              <div key={index} className="border rounded p-4 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={member.firstName}
                    onChange={(e) => handleUpdateTeamMember(index, 'firstName', e.target.value)}
                    className="border rounded px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={member.lastName}
                    onChange={(e) => handleUpdateTeamMember(index, 'lastName', e.target.value)}
                    className="border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="email"
                    placeholder="Email"
                    value={member.email}
                    onChange={(e) => handleUpdateTeamMember(index, 'email', e.target.value)}
                    className="border rounded px-3 py-2 text-sm"
                  />
                  <select
                    value={member.role}
                    onChange={(e) =>
                      handleUpdateTeamMember(index, 'role', e.target.value as any)
                    }
                    className="border rounded px-3 py-2 text-sm"
                  >
                    <option value="provider">Provider</option>
                    <option value="biller">Biller</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button
                  onClick={() => handleRemoveTeamMember(index)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={handleAddTeamMember}
              className="border border-slate-300 px-4 py-2 rounded text-sm hover:bg-slate-50"
            >
              + Add Team Member
            </button>
            {teamMembers.length > 0 && (
              <button
                onClick={handleCreateInvites}
                disabled={isLoading}
                className="bg-slate-900 text-white px-4 py-2 rounded text-sm hover:bg-slate-800 disabled:opacity-60"
              >
                {isLoading ? 'Creating...' : 'Create Invites'}
              </button>
            )}
            {invites.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">Invite Links</h3>
                <div className="space-y-2">
                  {invites.map((invite) => (
                    <div key={invite.id} className="border rounded p-2 text-sm">
                      <div className="font-medium">{invite.email}</div>
                      <div className="text-xs text-slate-600 break-all">{invite.inviteUrl}</div>
                      {invite.acceptedAt ? (
                        <span className="text-xs text-green-600">Accepted</span>
                      ) : (
                        <span className="text-xs text-orange-600">Pending</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="border border-slate-300 px-4 py-2 rounded text-sm hover:bg-slate-50"
              >
                ← Back
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="bg-slate-900 text-white px-6 py-2 rounded text-sm hover:bg-slate-800"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Specialties */}
      {currentStep === 3 && (
        <div className="border border-slate-200 rounded p-6">
          <h2 className="text-lg font-medium mb-4">Step 3: Enabled Specialties</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              {SPECIALTY_OPTIONS.map((specialty) => (
                <label key={specialty} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedSpecialties.includes(specialty)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSpecialties([...selectedSpecialties, specialty]);
                      } else {
                        setSelectedSpecialties(selectedSpecialties.filter((s) => s !== specialty));
                      }
                    }}
                  />
                  <span className="text-sm">{specialty.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(2)}
                className="border border-slate-300 px-4 py-2 rounded text-sm hover:bg-slate-50"
              >
                ← Back
              </button>
              <button
                onClick={handleSaveStep3}
                disabled={isLoading}
                className="bg-slate-900 text-white px-6 py-2 rounded text-sm hover:bg-slate-800 disabled:opacity-60"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Pilot Config */}
      {currentStep === 4 && (
        <div className="border border-slate-200 rounded p-6">
          <h2 className="text-lg font-medium mb-4">Step 4: Pilot Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">LLM Mode Override</label>
              <select
                value={llmModeOverride || ''}
                onChange={(e) =>
                  setLlmModeOverride(e.target.value === '' ? null : e.target.value)
                }
                className="border rounded px-3 py-2 w-full text-sm"
              >
                <option value="">Use Global Config</option>
                <option value="mock">Mock</option>
                <option value="openai">OpenAI</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="providerCanFinalize"
                checked={providerCanFinalize}
                onChange={(e) => setProviderCanFinalize(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="providerCanFinalize" className="text-sm">
                Allow providers to finalize codes
              </label>
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(3)}
                className="border border-slate-300 px-4 py-2 rounded text-sm hover:bg-slate-50"
              >
                ← Back
              </button>
              <button
                onClick={handleSaveStep4}
                disabled={isLoading}
                className="bg-slate-900 text-white px-6 py-2 rounded text-sm hover:bg-slate-800 disabled:opacity-60"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Summary */}
      {currentStep === 5 && (
        <div className="border border-slate-200 rounded p-6">
          <h2 className="text-lg font-medium mb-4">Step 5: Review & Finish</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Practice Info</h3>
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-slate-600">Pilot Label:</span> {pilotLabel || 'Not set'}
                </div>
                <div>
                  <span className="text-slate-600">Start Date:</span>{' '}
                  {pilotStartDate || 'Not set'}
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Invites Created</h3>
              <div className="text-sm">
                {invites.length} invite{invites.length !== 1 ? 's' : ''} created
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Specialties Enabled</h3>
              <div className="text-sm">
                {selectedSpecialties.length > 0
                  ? selectedSpecialties.join(', ')
                  : 'All specialties enabled'}
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Pilot Settings</h3>
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-slate-600">LLM Mode:</span>{' '}
                  {llmModeOverride || 'Global config'}
                </div>
                <div>
                  <span className="text-slate-600">Provider Can Finalize:</span>{' '}
                  {providerCanFinalize ? 'Yes' : 'No'}
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(4)}
                className="border border-slate-300 px-4 py-2 rounded text-sm hover:bg-slate-50"
              >
                ← Back
              </button>
              <button
                onClick={() => navigate('/admin/pilot/summary')}
                className="bg-green-600 text-white px-6 py-2 rounded text-sm hover:bg-green-700"
              >
                Finish & View Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

