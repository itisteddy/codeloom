import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { submitNps } from '../api/nps';

export const PracticeNpsPrompt: React.FC = () => {
  const { token } = useAuth();
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check localStorage to see if user has already submitted
  React.useEffect(() => {
    const submitted = localStorage.getItem('nps_submitted');
    if (submitted === 'true') {
      setIsSubmitted(true);
    }
  }, []);

  const handleSubmit = async () => {
    if (!token || score === null) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await submitNps(token, score, comment.trim() || undefined);
      localStorage.setItem('nps_submitted', 'true');
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit NPS');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return null; // Hide after submission
  }

  return (
    <div className="border border-blue-200 bg-blue-50 rounded p-4 mb-6">
      <h3 className="font-medium mb-2 text-blue-900">
        How likely are you to recommend Codeloom to a colleague? (0-10)
      </h3>
      <div className="space-y-3">
        {/* Score buttons */}
        <div className="flex flex-wrap gap-1">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setScore(num)}
              className={`w-10 h-10 rounded border text-sm ${
                score === num
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white border-slate-300 hover:bg-blue-100'
              }`}
            >
              {num}
            </button>
          ))}
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium mb-1 text-blue-900">
            Comment (optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Any feedback..."
            rows={2}
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
          disabled={isSubmitting || score === null}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-60"
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </div>
  );
};

