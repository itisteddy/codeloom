import React from 'react';
import { EncounterDto } from '../../api/encounters';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';

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
  const emRecommended = encounter.aiEmSuggested
    ? { code: encounter.aiEmSuggested, confidence: encounter.aiEmConfidence }
    : null;
  const emHighestSupported = encounter.aiEmHighestSupportedCode
    ? {
        code: encounter.aiEmHighestSupportedCode,
        confidence: encounter.aiEmHighestSupportedConfidence,
      }
    : null;

  const hasSuggestions =
    !!emRecommended ||
    (encounter.aiDiagnosisSuggestions && encounter.aiDiagnosisSuggestions.length > 0) ||
    (encounter.aiProcedureSuggestions && encounter.aiProcedureSuggestions.length > 0);

  const formatConfidence = (conf?: number | null) =>
    conf === null || conf === undefined ? null : `${Math.round(conf * 100)}% confidence`;

  return (
    <Card>
      <CardHeader className="border-b border-semantic-border">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Codeloom Suggestions</CardTitle>
            {encounter.aiModelId && (
              <CardDescription className="text-xs">
                Model: <span className="font-mono">{encounter.aiModelId}</span>
              </CardDescription>
            )}
          </div>
          <Button size="sm" onClick={onRunCodeloom} disabled={isRunning}>
            {isRunning ? 'Running…' : 'Run Codeloom'}
          </Button>
        </div>
        {error && (
          <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            We couldn't fetch suggestions right now. Your note is safe — please try again in a moment.
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {isRunning && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Spinner />
            <p className="mt-3 text-sm text-semantic-muted">Running Codeloom on this note…</p>
          </div>
        )}

        {!hasSuggestions && encounter.status === 'draft' && !isRunning && (
          <div className="rounded-md border border-semantic-border bg-slate-50 px-4 py-3 text-sm text-semantic-muted">
            No suggestions yet. Paste your note and click Run Codeloom.
          </div>
        )}

        {hasSuggestions && !isRunning && (
          <div className="space-y-4">
            {/* Safety Info */}
            {encounter.aiSafetySummary &&
              (encounter.aiSafetySummary.hadInvalidCodes ||
                encounter.aiSafetySummary.filteredCodesCount > 0 ||
                encounter.aiSafetySummary.hadFormatIssues) && (
                <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  ⚠ Some suggestions were filtered by safety checks. Review carefully.
                </div>
              )}
            {encounter.aiConfidenceBucket && (
              <div
                className={`text-xs ${
                  encounter.aiConfidenceBucket === 'low'
                    ? 'text-red-600'
                    : encounter.aiConfidenceBucket === 'medium'
                    ? 'text-semantic-warning'
                    : 'text-semantic-success'
                }`}
              >
                {encounter.aiConfidenceBucket === 'low' && '⚠ Low confidence – double-check carefully.'}
                {encounter.aiConfidenceBucket === 'medium' && '⚠ Medium confidence – review recommended.'}
                {encounter.aiConfidenceBucket === 'high' && '✓ High confidence – still review before finalizing.'}
              </div>
            )}

            {/* E/M Section */}
            <div className="space-y-3 rounded-lg border border-semantic-border bg-white px-4 py-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-semantic-muted mb-2">E/M CODE</p>
                {emRecommended ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className="text-2xl font-semibold text-brand-ink">{emRecommended.code}</p>
                      {formatConfidence(emRecommended.confidence) && (
                        <span className="text-xs text-semantic-muted">
                          ({formatConfidence(emRecommended.confidence)})
                        </span>
                      )}
                    </div>
                    {emHighestSupported &&
                      emHighestSupported.code !== emRecommended.code && (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant="info" className="bg-brand-tealSoft text-brand-teal">
                            Highest supported
                          </Badge>
                          <span className="font-medium text-brand-ink">{emHighestSupported.code}</span>
                          {formatConfidence(emHighestSupported.confidence) && (
                            <span className="text-semantic-muted">
                              ({formatConfidence(emHighestSupported.confidence)})
                            </span>
                          )}
                        </div>
                      )}
                    {encounter.aiEmAlternatives && encounter.aiEmAlternatives.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {encounter.aiEmAlternatives.map((alt) => (
                          <Badge key={alt.code} variant={alt.recommended ? 'primary' : 'secondary'}>
                            {alt.code} · {alt.label}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-semantic-muted">No E/M recommendation available.</p>
                )}
              </div>
            </div>

            {/* Diagnoses */}
            <section className="space-y-2">
              <p className="text-xs font-medium uppercase text-slate-500">Diagnosis suggestions</p>
              {encounter.aiDiagnosisSuggestions && encounter.aiDiagnosisSuggestions.length > 0 ? (
                <ul className="space-y-1">
                  {encounter.aiDiagnosisSuggestions.map((diag, idx) => (
                    <li
                      key={`${diag.code}-${idx}`}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">{diag.code}</p>
                        {diag.description && (
                          <p className="text-xs text-slate-500">{diag.description}</p>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {Math.round(diag.confidence * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No diagnosis suggestions.</p>
              )}
            </section>

            {/* Procedures */}
            <section className="space-y-2">
              <p className="text-xs font-medium uppercase text-slate-500">Procedure suggestions</p>
              {encounter.aiProcedureSuggestions && encounter.aiProcedureSuggestions.length > 0 ? (
                <ul className="space-y-1">
                  {encounter.aiProcedureSuggestions.map((proc, idx) => (
                    <li
                      key={`${proc.code}-${idx}`}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">{proc.code}</p>
                        {proc.description && (
                          <p className="text-xs text-slate-500">{proc.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{Math.round(proc.confidence * 100)}%</span>
                        <span
                          className={
                            proc.withinCuratedSet ? 'text-emerald-600' : 'text-orange-600'
                          }
                        >
                          {proc.withinCuratedSet ? '✓ Curated' : 'Manual review'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No procedure suggestions.</p>
              )}
            </section>

            {/* Denial Risk */}
            <div className="space-y-3 rounded-lg border border-semantic-border bg-white px-4 py-3">
              <h3 className="text-sm font-semibold text-brand-ink">Denial Risk & Hints</h3>
              {encounter.denialRiskLevel && (
                <div>
                  <Badge
                    variant={
                      encounter.denialRiskLevel === 'low'
                        ? 'success'
                        : encounter.denialRiskLevel === 'medium'
                        ? 'warning'
                        : 'destructive'
                    }
                  >
                    {encounter.denialRiskLevel.toUpperCase()} RISK
                  </Badge>
                </div>
              )}
              {encounter.denialRiskReasons && encounter.denialRiskReasons.length > 0 && (
                <ul className="space-y-1.5 divide-y divide-slate-100">
                  {encounter.denialRiskReasons.map((reason, idx) => (
                    <li key={idx} className="pt-1.5 first:pt-0 text-sm text-semantic-muted">
                      • {reason}
                    </li>
                  ))}
                </ul>
              )}
              {encounter.hadUndercodeHint && (
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-semantic-warning">⚠</span>
                  <div>
                    <span className="font-semibold text-semantic-warning">Undercoding hint detected</span>
                    <p className="text-xs text-semantic-muted mt-0.5">
                      Documentation may support a higher level code. Review before finalizing.
                    </p>
                  </div>
                </div>
              )}
              {encounter.hadMissedServiceHint && (
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-blue-600">ℹ</span>
                  <div>
                    <span className="font-semibold text-blue-600">Missed service hint detected</span>
                    <p className="text-xs text-semantic-muted mt-0.5">
                      Additional services may be billable. Review documentation.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

