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
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  if (isLoadingCase) {
    return <div className="text-center py-8 text-slate-600">Loading training case...</div>;
  }

  if (caseError || !trainingCase) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {caseError || 'Training case not found'}
        </div>
        <button
          onClick={() => navigate('/training')}
          className="mt-4 text-sm text-slate-600 hover:text-slate-900"
        >
          ← Back to Training
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-4">
        <button
          onClick={() => navigate('/training')}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← Back to Training
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Case Info */}
        <div>
          <div className="border border-slate-200 rounded p-4 mb-4">
            <h2 className="font-medium mb-3">Case Information</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-600">Title:</span> {trainingCase.title}
              </div>
              <div>
                <span className="text-slate-600">Specialty:</span>{' '}
                {trainingCase.specialty.replace('_', ' ')}
              </div>
              <div>
                <span className="text-slate-600">Difficulty:</span>{' '}
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(
                    trainingCase.difficulty
                  )}`}
                >
                  {trainingCase.difficulty.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded p-4">
            <h2 className="font-medium mb-3">Case Note</h2>
            <div className="bg-slate-50 border rounded p-3 max-h-96 overflow-y-auto">
              <pre className="text-sm font-mono whitespace-pre-wrap">{trainingCase.noteText}</pre>
            </div>
          </div>
        </div>

        {/* Right Column - Coding Form & Results */}
        <div>
          <div className="border border-slate-200 rounded p-4 mb-4">
            <h2 className="font-medium mb-3">Your Coding</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">E/M Code</label>
                <input
                  type="text"
                  value={emCode}
                  onChange={(e) => setEmCode(e.target.value)}
                  placeholder="e.g., 99213"
                  className="border rounded px-3 py-2 w-full text-sm"
                  disabled={!!attemptResult}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Diagnosis Codes (comma or newline separated)
                </label>
                <textarea
                  value={diagnosisText}
                  onChange={(e) => setDiagnosisText(e.target.value)}
                  placeholder="E11.9, I10"
                  rows={4}
                  className="border rounded px-3 py-2 w-full text-sm font-mono"
                  disabled={!!attemptResult}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Procedure Codes (comma or newline separated)
                </label>
                <textarea
                  value={procedureText}
                  onChange={(e) => setProcedureText(e.target.value)}
                  placeholder="J3420"
                  rows={4}
                  className="border rounded px-3 py-2 w-full text-sm font-mono"
                  disabled={!!attemptResult}
                />
              </div>

              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {submitError}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !!attemptResult}
                className="bg-slate-900 text-white px-4 py-2 rounded text-sm hover:bg-slate-800 disabled:opacity-60 w-full"
              >
                {isSubmitting ? 'Submitting...' : attemptResult ? 'Submitted' : 'Submit Attempt'}
              </button>
            </div>
          </div>

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

