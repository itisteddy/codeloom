import React, { useEffect, useState } from 'react';
import { getEncounterFeedback, submitEncounterFeedback, EncounterFeedback } from '../../api/feedback';
import { useAuth } from '../../auth/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

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
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Was this suggestion helpful?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Segmented Control */}
        <div className="inline-flex rounded-full border border-semantic-border bg-slate-50 p-0.5">
          <button
            type="button"
            onClick={() => setHelpful(true)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-150',
              helpful === true
                ? 'bg-brand-teal text-white'
                : 'bg-transparent text-semantic-muted hover:text-brand-ink'
            )}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setHelpful(false)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-150',
              helpful === false
                ? 'bg-brand-teal text-white'
                : 'bg-transparent text-semantic-muted hover:text-brand-ink'
            )}
          >
            No
          </button>
        </div>

        {/* Comments */}
        <div>
          <label className="block text-xs font-medium text-semantic-muted mb-1.5">
            Any comment? (optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Any additional feedback..."
            rows={2}
            className="w-full rounded-md border border-semantic-border bg-white px-3 py-2 text-sm text-brand-ink placeholder:text-semantic-muted focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-tealSoft"
          />
        </div>

        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || helpful === null}
          size="sm"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </CardContent>
    </Card>
  );
};
