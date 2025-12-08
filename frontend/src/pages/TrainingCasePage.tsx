import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  getTrainingCase,
  submitTrainingAttempt,
  TrainingCaseDetail,
  TrainingAttemptResult,
  TrainingDifficulty,
} from '../api/training';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';

export const TrainingCasePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [trainingCase, setTrainingCase] = useState<TrainingCaseDetail | null>(null);
  const [isLoadingCase, setIsLoadingCase] = useState(false);
  const [caseError, setCaseError] = useState<string | null>(null);

  // Form state
  const [emCode, setEmCode] = useState('');
  const [diagnosisText, setDiagnosisText] = useState('');
  const [procedureText, setProcedureText] = useState('');

  // Attempt result
  const [attemptResult, setAttemptResult] = useState<TrainingAttemptResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !token) return;

    setIsLoadingCase(true);
    setCaseError(null);
    getTrainingCase(token, id)
      .then((data) => {
        setTrainingCase(data);
        setEmCode('');
        setDiagnosisText('');
        setProcedureText('');
        setAttemptResult(null);
      })
      .catch((err: Error) => {
        setCaseError(err.message || 'Failed to load training case');
      })
      .finally(() => {
        setIsLoadingCase(false);
      });
  }, [id, token]);

  const parseCodeList = (text: string): string[] => {
    return text
      .split(/[,\n]/)
      .map((c) => c.trim())
      .filter(Boolean);
  };

  const handleSubmit = async () => {
    if (!id || !token) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const userDiagnosisCodes = parseCodeList(diagnosisText);
    const userProcedureCodes = parseCodeList(procedureText);

    try {
      const result = await submitTrainingAttempt(token, id, {
        userEmCode: emCode.trim(),
        userDiagnosisCodes,
        userProcedureCodes,
      });
      setAttemptResult(result);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit attempt');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDifficultyColor = (difficulty: TrainingDifficulty) => {
    switch (difficulty) {
      case 'easy':
        return 'success';
      case 'medium':
        return 'warning';
      case 'hard':
        return 'danger';
      default:
        return 'default';
    }
  };

  if (isLoadingCase) {
    return (
      <Card>
        <CardContent className="flex justify-center py-10">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  if (caseError || !trainingCase) {
    return (
      <Card className="max-w-2xl">
        <CardContent>
          <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
            {caseError || 'Training case not found'}
          </div>
          <Button variant="ghost" className="mt-4 text-sm" onClick={() => navigate('/training')}>
            ← Back to Training
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/training')}>
        ← Back to Training
      </Button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column - Case Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Case Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-slate-600">Title:</span> {trainingCase.title}
              </div>
              <div>
                <span className="text-slate-600">Specialty:</span>{' '}
                {trainingCase.specialty.replace('_', ' ')}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-600">Difficulty:</span>
                <Badge variant={getDifficultyColor(trainingCase.difficulty)}>
                  {trainingCase.difficulty.toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Case Note</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="thin-scrollbar max-h-96 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4">
                <pre className="whitespace-pre-wrap font-mono text-sm text-slate-900">
                  {trainingCase.noteText}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Coding Form & Results */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Coding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="E/M Code"
                value={emCode}
                onChange={(e) => setEmCode(e.target.value)}
                placeholder="e.g., 99213"
                disabled={!!attemptResult}
              />
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">
                  Diagnosis Codes (comma or newline separated)
                </span>
                <textarea
                  value={diagnosisText}
                  onChange={(e) => setDiagnosisText(e.target.value)}
                  placeholder="E11.9, I10"
                  rows={4}
                  disabled={!!attemptResult}
                  className="thin-scrollbar w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-mono shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">
                  Procedure Codes (comma or newline separated)
                </span>
                <textarea
                  value={procedureText}
                  onChange={(e) => setProcedureText(e.target.value)}
                  placeholder="J3420"
                  rows={4}
                  disabled={!!attemptResult}
                  className="thin-scrollbar w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-mono shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </label>

              {submitError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {submitError}
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !!attemptResult}
                loading={isSubmitting}
                className="w-full"
              >
                {attemptResult ? 'Submitted' : 'Submit Attempt'}
              </Button>
            </CardContent>
          </Card>

          {/* Results Card */}
          {attemptResult && (
            <div className="border border-slate-200 rounded p-4">
              <h2 className="font-medium mb-3">Results</h2>
              <div className="space-y-4">
                {/* Score */}
                <div className="text-center py-4 bg-slate-50 rounded">
                  <div className="text-4xl font-bold text-slate-900">
                    {attemptResult.scorePercent}%
                  </div>
                  <div className="text-sm text-slate-600 mt-1">Score</div>
                </div>

                {/* E/M Results */}
                <div>
                  <h3 className="font-medium mb-2">E/M Code</h3>
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="text-slate-600">Correct:</span>{' '}
                      <span className="font-medium">{attemptResult.correctEmCode}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Your answer:</span>{' '}
                      <span className="font-medium">{attemptResult.userEmCode}</span>
                      {attemptResult.matchSummary.em.isExact && (
                        <span className="ml-2 text-green-600">✓ Exact match</span>
                      )}
                      {attemptResult.matchSummary.em.isNear && (
                        <span className="ml-2 text-yellow-600">⚠ Near match</span>
                      )}
                      {!attemptResult.matchSummary.em.isExact &&
                        !attemptResult.matchSummary.em.isNear && (
                          <span className="ml-2 text-red-600">✗ Incorrect</span>
                        )}
                    </div>
                  </div>
                </div>

                {/* Diagnoses Results */}
                <div>
                  <h3 className="font-medium mb-2">Diagnoses</h3>
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="text-slate-600">Correct codes:</span>{' '}
                      {attemptResult.correctDiagnosisCodes.length > 0
                        ? attemptResult.correctDiagnosisCodes.join(', ')
                        : 'None'}
                    </div>
                    <div>
                      <span className="text-slate-600">Your codes:</span>{' '}
                      {attemptResult.userDiagnosisCodes.length > 0
                        ? attemptResult.userDiagnosisCodes.join(', ')
                        : 'None'}
                    </div>
                    <div>
                      You got {attemptResult.matchSummary.diagnoses.correctCount} of{' '}
                      {attemptResult.matchSummary.diagnoses.totalCorrect} correct
                    </div>
                    {attemptResult.matchSummary.diagnoses.missingCodes.length > 0 && (
                      <div className="text-red-600">
                        Missing: {attemptResult.matchSummary.diagnoses.missingCodes.join(', ')}
                      </div>
                    )}
                    {attemptResult.matchSummary.diagnoses.extraCodes.length > 0 && (
                      <div className="text-orange-600">
                        Extra: {attemptResult.matchSummary.diagnoses.extraCodes.join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Procedures Results */}
                <div>
                  <h3 className="font-medium mb-2">Procedures</h3>
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="text-slate-600">Correct codes:</span>{' '}
                      {attemptResult.correctProcedureCodes.length > 0
                        ? attemptResult.correctProcedureCodes.join(', ')
                        : 'None'}
                    </div>
                    <div>
                      <span className="text-slate-600">Your codes:</span>{' '}
                      {attemptResult.userProcedureCodes.length > 0
                        ? attemptResult.userProcedureCodes.join(', ')
                        : 'None'}
                    </div>
                    <div>
                      You got {attemptResult.matchSummary.procedures.correctCount} of{' '}
                      {attemptResult.matchSummary.procedures.totalCorrect} correct
                    </div>
                    {attemptResult.matchSummary.procedures.missingCodes.length > 0 && (
                      <div className="text-red-600">
                        Missing: {attemptResult.matchSummary.procedures.missingCodes.join(', ')}
                      </div>
                    )}
                    {attemptResult.matchSummary.procedures.extraCodes.length > 0 && (
                      <div className="text-orange-600">
                        Extra: {attemptResult.matchSummary.procedures.extraCodes.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

