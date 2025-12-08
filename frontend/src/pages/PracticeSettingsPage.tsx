import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getPracticeConfig, updatePracticeConfig, PracticeConfig } from '../api/practiceConfig';

export const PracticeSettingsPage: React.FC = () => {
  const { token, user } = useAuth();
  const [config, setConfig] = useState<PracticeConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form state
  const [llmMode, setLlmMode] = useState('mock');
  const [enabledSpecialties, setEnabledSpecialties] = useState<string[]>([]);
  const [providerCanEditCodes, setProviderCanEditCodes] = useState(false);
  const [newSpecialty, setNewSpecialty] = useState('');

  useEffect(() => {
    if (!token || (user?.role !== 'biller' && user?.role !== 'admin')) {
      return;
    }

    setIsLoading(true);
    setError(null);
    getPracticeConfig(token)
      .then((data) => {
        setConfig(data);
        setLlmMode(data.llmMode);
        setEnabledSpecialties(data.enabledSpecialties);
        setProviderCanEditCodes(data.providerCanEditCodes);
      })
      .catch((err: Error) => {
        setError(err.message || 'Failed to load practice configuration');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token, user]);

  const handleSave = async () => {
    if (!token) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const updated = await updatePracticeConfig(token, {
        llmMode,
        enabledSpecialties,
        providerCanEditCodes,
      });
      setConfig(updated);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSpecialty = () => {
    if (newSpecialty.trim() && !enabledSpecialties.includes(newSpecialty.trim())) {
      setEnabledSpecialties([...enabledSpecialties, newSpecialty.trim()]);
      setNewSpecialty('');
    }
  };

  const handleRemoveSpecialty = (specialty: string) => {
    setEnabledSpecialties(enabledSpecialties.filter((s) => s !== specialty));
  };

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
        <div className="text-center py-8 text-slate-600">Loading practice settings...</div>
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Practice Settings</h1>

      {saveError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {saveError}
        </div>
      )}

      <div className="space-y-6">
        {/* LLM Mode */}
        <div className="border border-slate-200 rounded p-6">
          <h2 className="text-lg font-medium mb-4">AI Model Configuration</h2>
          <div>
            <label className="block text-sm font-medium mb-2">LLM Mode</label>
            <select
              value={llmMode}
              onChange={(e) => setLlmMode(e.target.value)}
              className="border rounded px-3 py-2 w-full text-sm"
            >
              <option value="mock">Mock (Testing)</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Select the AI model to use for generating coding suggestions
            </p>
          </div>
        </div>

        {/* Enabled Specialties */}
        <div className="border border-slate-200 rounded p-6">
          <h2 className="text-lg font-medium mb-4">Enabled Specialties</h2>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newSpecialty}
                onChange={(e) => setNewSpecialty(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSpecialty();
                  }
                }}
                placeholder="e.g., primary_care, cardiology"
                className="border rounded px-3 py-2 flex-1 text-sm"
              />
              <button
                onClick={handleAddSpecialty}
                className="bg-slate-900 text-white px-4 py-2 rounded text-sm hover:bg-slate-800"
              >
                Add
              </button>
            </div>
            {enabledSpecialties.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {enabledSpecialties.map((specialty) => (
                  <span
                    key={specialty}
                    className="px-3 py-1 bg-slate-100 rounded text-sm flex items-center gap-2"
                  >
                    {specialty}
                    <button
                      onClick={() => handleRemoveSpecialty(specialty)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No specialties enabled</p>
            )}
          </div>
        </div>

        {/* Provider Permissions */}
        <div className="border border-slate-200 rounded p-6">
          <h2 className="text-lg font-medium mb-4">Provider Permissions</h2>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="providerCanEditCodes"
              checked={providerCanEditCodes}
              onChange={(e) => setProviderCanEditCodes(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="providerCanEditCodes" className="text-sm">
              Allow providers to edit final codes
            </label>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            If enabled, providers can modify final codes. Otherwise, only billers can edit codes.
          </p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-slate-900 text-white px-6 py-2 rounded text-sm hover:bg-slate-800 disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

