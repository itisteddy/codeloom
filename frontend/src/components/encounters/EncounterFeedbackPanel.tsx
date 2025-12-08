import React, { useEffect, useState } from 'react';
import { getEncounterFeedback, submitEncounterFeedback, EncounterFeedback } from '../../api/feedback';
import { useAuth } from '../../auth/AuthContext';

interface Props {
  encounterId: string;
}

export const EncounterFeedbackPanel: React.FC<Props> = ({ encounterId }) => {
  const { token } = useAuth();
  const [feedback, setFeedback] = useState<EncounterFeedback | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!token) return;

    setIsLoading(true);
    getEncounterFeedback(token, encounterId)
      .then((data) => {
        if (data) {
          setFeedback(data);
          setHelpful(data.helpful);
          setComment(data.comment || '');
        }
      })
      .catch((err: Error) => {
        // Silently fail - feedback is optional
        console.error('Failed to load feedback:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token, encounterId]);

  const handleSubmit = async () => {
    if (!token || helpful === null) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await submitEncounterFeedback(token, encounterId, {
        helpful,
        comment: comment.trim() || null,
      });
      // Reload feedback
      const updated = await getEncounterFeedback(token, encounterId);
      if (updated) {
        setFeedback(updated);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return null;
  }

  // If feedback already submitted, show read-only
  if (feedback) {
    return (
      <div className="border border-slate-200 rounded p-4 mt-4">
        <h3 className="font-medium mb-2">Feedback</h3>
        <div className="text-sm">
          <div className="mb-2">
            <span className="text-slate-600">Was this helpful?</span>{' '}
            <span className="font-medium">{feedback.helpful ? 'Yes' : 'No'}</span>
          </div>
          {feedback.comment && (
            <div className="mb-2">
              <span className="text-slate-600">Comment:</span>
              <p className="mt-1 text-slate-700">{feedback.comment}</p>
            </div>
          )}
          {feedback.createdAt && (
            <div className="text-xs text-slate-500">
              Submitted on {new Date(feedback.createdAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded p-4 mt-4">
      <h3 className="font-medium mb-3">Was this suggestion helpful?</h3>
      <div className="space-y-4">
        {/* Yes/No Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setHelpful(true)}
            className={`flex-1 px-4 py-2 rounded border ${
              helpful === true
                ? 'bg-green-50 border-green-500 text-green-700'
                : 'bg-white border-slate-300 hover:bg-slate-50'
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setHelpful(false)}
            className={`flex-1 px-4 py-2 rounded border ${
              helpful === false
                ? 'bg-red-50 border-red-500 text-red-700'
                : 'bg-white border-slate-300 hover:bg-slate-50'
            }`}
          >
            No
          </button>
        </div>

        {/* Comments */}
        <div>
          <label className="block text-sm font-medium mb-1">Any comment? (optional)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Any additional feedback..."
            rows={3}
            className="border rounded px-3 py-2 w-full text-sm"
          />
        </div>

        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || helpful === null}
          className="bg-slate-900 text-white px-4 py-2 rounded text-sm hover:bg-slate-800 disabled:opacity-60"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </div>
    </div>
  );
};
