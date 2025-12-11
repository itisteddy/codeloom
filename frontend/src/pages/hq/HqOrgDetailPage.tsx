/**
 * Codeloom HQ Organization Detail Page
 * 
 * Shows detailed information about a specific organization
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { getHqOrgDetail, HqOrgDetail } from '../../api/hq';
import { format } from 'date-fns';

export const HqOrgDetailPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<HqOrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !orgId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getHqOrgDetail(token, orgId);
        setData(response);
      } catch (err: any) {
        setError(err.message || 'Failed to load organization details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, orgId]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'TRIALING':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELED':
        return 'bg-gray-100 text-gray-800';
      case 'PAST_DUE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading organization details...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="text-red-600">Error: {error || 'Organization not found'}</div>
        <button
          onClick={() => navigate('/hq')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back to Overview
        </button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/hq')}
          className="mb-4 text-blue-600 hover:text-blue-800"
        >
          ← Back to Overview
        </button>
        <h1 className="text-3xl font-bold text-gray-900">{data.org.name}</h1>
        <div className="mt-4 flex gap-4 items-center">
          <span
            className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(data.org.status)}`}
          >
            {data.org.status}
          </span>
          <span className="text-gray-600">
            {data.org.planType.toUpperCase()} / {data.org.billingCycle.toUpperCase()}
          </span>
          <span className="text-gray-600">
            Started: {formatDate(data.org.startDate)}
          </span>
          {data.org.renewalDate && (
            <span className="text-gray-600">
              Renews: {formatDate(data.org.renewalDate)}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Practices Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Practices</h2>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Practice
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Specialty
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Providers
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Billers
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Admins
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    AI Encounters
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Last Activity
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.practices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-4 text-center text-gray-500">
                      No practices found
                    </td>
                  </tr>
                ) : (
                  data.practices.map((practice) => (
                    <tr key={practice.id}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{practice.name}</div>
                        {practice.timeZone && (
                          <div className="text-xs text-gray-500">{practice.timeZone}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {practice.specialty || '–'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {practice.providerCount}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {practice.billerCount}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {practice.adminCount}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {practice.usage.encountersWithAiSuggestions}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(practice.usage.lastActivityAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* NPS & Feedback Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">NPS & Feedback</h2>
          {data.nps ? (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="mb-4">
                <div className="text-4xl font-bold text-gray-900">
                  {data.nps.averageScore?.toFixed(1) || '–'}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Average NPS Score ({data.nps.responsesCount} responses)
                </div>
              </div>

              {data.nps.latestComments.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Latest Comments</h3>
                  <div className="space-y-3">
                    {data.nps.latestComments.map((comment) => (
                      <div key={comment.id} className="border-l-4 border-blue-500 pl-4 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            Score: {comment.score}/10
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        {comment.comment && (
                          <p className="text-sm text-gray-700">{comment.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
              No NPS data yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

