import React from 'react';
import { AuditEventDto } from '../../api/encounters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  error: string | null;
  events: AuditEventDto[];
}

export const AuditTrailModal: React.FC<Props> = ({
  isOpen,
  onClose,
  isLoading,
  error,
  events,
}) => {
  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatPayload = (payload: any) => {
    const str = JSON.stringify(payload);
    return str.length > 120 ? str.substring(0, 120) + '...' : str;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Audit Trail</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 text-xl"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center py-8 text-slate-600">Loading audit trail…</div>
          ) : error ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No audit events found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 px-4 py-2 text-left text-sm font-medium">
                      Time
                    </th>
                    <th className="border border-slate-300 px-4 py-2 text-left text-sm font-medium">
                      User
                    </th>
                    <th className="border border-slate-300 px-4 py-2 text-left text-sm font-medium">
                      Action
                    </th>
                    <th className="border border-slate-300 px-4 py-2 text-left text-sm font-medium">
                      Summary
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-slate-50">
                      <td className="border border-slate-300 px-4 py-2 text-sm">
                        {formatDate(event.createdAt)}
                      </td>
                      <td className="border border-slate-300 px-4 py-2 text-sm">
                        {event.userName || 'Unknown'} ({event.userRole})
                      </td>
                      <td className="border border-slate-300 px-4 py-2 text-sm">
                        {event.action.replace(/_/g, ' ')}
                      </td>
                      <td className="border border-slate-300 px-4 py-2 text-sm font-mono text-xs">
                        {formatPayload(event.payload)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

