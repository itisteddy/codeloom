import React from 'react';
import { EncounterDto } from '../../api/encounters';

interface Props {
  encounter: EncounterDto;
  isRunning: boolean;
  onRunCodeloom: () => void;
  error?: string | null;
}

export const EncounterSuggestionsPanel: React.FC<Props> = ({
  encounter,
  isRunning,
  onRunCodeloom,
  error,
}) => {
  const hasSuggestions = encounter.aiEmSuggested !== null && encounter.aiEmSuggested !== undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Codeloom Suggestions</h2>
        <button
          onClick={onRunCodeloom}
          disabled={isRunning}
          className="bg-slate-900 text-white px-4 py-2 rounded text-sm hover:bg-slate-800 disabled:opacity-60"
        >
          {isRunning ? 'Running Codeloom...' : 'Run Codeloom'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Model & Safety Info */}
      {hasSuggestions && (
        <div className="space-y-2 text-sm">
          {encounter.aiModelId && (
            <div className="text-slate-600">
              Model: <span className="font-mono">{encounter.aiModelId}</span>
            </div>
          )}
          {encounter.aiSafetySummary &&
            (encounter.aiSafetySummary.hadInvalidCodes ||
              encounter.aiSafetySummary.filteredCodesCount > 0 ||
              encounter.aiSafetySummary.hadFormatIssues) && (
              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-xs">
                ⚠ Some suggestions were filtered by safety checks. Review carefully.
              </div>
            )}
          {encounter.aiConfidenceBucket && (
            <div
              className={`text-xs ${
                encounter.aiConfidenceBucket === 'low'
                  ? 'text-red-600'
                  : encounter.aiConfidenceBucket === 'medium'
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`}
            >
              {encounter.aiConfidenceBucket === 'low' && '⚠ Low confidence – double-check carefully.'}
              {encounter.aiConfidenceBucket === 'medium' && '⚠ Medium confidence – review recommended.'}
              {encounter.aiConfidenceBucket === 'high' && '✓ High confidence – still review before finalizing.'}
            </div>
          )}
        </div>
      )}

      {!hasSuggestions && encounter.status === 'draft' && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded text-sm text-slate-600">
          No suggestions yet. Paste your note and click Run Codeloom.
        </div>
      )}

      {hasSuggestions && (
        <div className="space-y-4">
          {/* E/M Card */}
          {encounter.aiEmSuggested && (
            <div className="border border-slate-200 rounded p-4">
              <h3 className="font-medium mb-2">E/M Code</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-lg font-semibold">{encounter.aiEmSuggested}</span>
                  {encounter.aiEmConfidence !== null && encounter.aiEmConfidence !== undefined && (
                    <span className="ml-2 text-sm text-slate-600">
                      ({Math.round(encounter.aiEmConfidence * 100)}% confidence)
                    </span>
                  )}
                </div>
                {encounter.aiEmAlternatives && encounter.aiEmAlternatives.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {encounter.aiEmAlternatives.map((alt) => (
                      <span
                        key={alt.code}
                        className={`px-2 py-1 rounded text-xs ${
                          alt.recommended
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {alt.code} - {alt.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Diagnoses Card */}
          {encounter.aiDiagnosisSuggestions && encounter.aiDiagnosisSuggestions.length > 0 && (
            <div className="border border-slate-200 rounded p-4">
              <h3 className="font-medium mb-2">Diagnoses</h3>
              <div className="space-y-2">
                {encounter.aiDiagnosisSuggestions.map((diag, idx) => (
                  <div key={idx} className="text-sm">
                    <div className="font-medium">
                      {diag.code} - {diag.description}
                    </div>
                    <div className="text-slate-600">
                      Confidence: {Math.round(diag.confidence * 100)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Procedures Card */}
          {encounter.aiProcedureSuggestions && encounter.aiProcedureSuggestions.length > 0 && (
            <div className="border border-slate-200 rounded p-4">
              <h3 className="font-medium mb-2">Procedures</h3>
              <div className="space-y-2">
                {encounter.aiProcedureSuggestions.map((proc, idx) => (
                  <div key={idx} className="text-sm">
                    <div className="font-medium">
                      {proc.code} - {proc.description}
                    </div>
                    <div className="text-slate-600">
                      Confidence: {Math.round(proc.confidence * 100)}%
                      {proc.withinCuratedSet ? (
                        <span className="ml-2 text-green-600">✓ Curated</span>
                      ) : (
                        <span className="ml-2 text-orange-600">⚠ Manual review</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Denial Risk Card */}
          <div className="border border-slate-200 rounded p-4">
            <h3 className="font-medium mb-2">Denial Risk & Hints</h3>
            <div className="space-y-2">
              {encounter.denialRiskLevel && (
                <div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      encounter.denialRiskLevel === 'low'
                        ? 'bg-green-100 text-green-800'
                        : encounter.denialRiskLevel === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {encounter.denialRiskLevel.toUpperCase()} Risk
                  </span>
                </div>
              )}
              {encounter.denialRiskReasons && encounter.denialRiskReasons.length > 0 && (
                <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                  {encounter.denialRiskReasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              )}
              {encounter.hadUndercodeHint && (
                <div className="text-sm text-orange-600">⚠ Undercoding hint detected</div>
              )}
              {encounter.hadMissedServiceHint && (
                <div className="text-sm text-blue-600">ℹ Missed service hint detected</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

