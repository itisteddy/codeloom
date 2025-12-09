import React from 'react';
import { EncounterSummaryDto } from '../../api/encounters';
import { Badge } from '../ui/Badge';

interface Props {
  encounters: EncounterSummaryDto[];
  onRowClick: (id: string) => void;
}

export const EncounterTable: React.FC<Props> = ({ encounters, onRowClick }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatStatus = (status: string): { label: string; variant: 'default' | 'info' | 'success' } => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'info' | 'success' }> = {
      draft: { label: 'Draft', variant: 'default' },
      ai_suggested: { label: 'AI suggestion ready', variant: 'info' },
      finalized: { label: 'Finalized', variant: 'success' },
      billed: { label: 'Billed', variant: 'success' },
    };
    return statusMap[status] || { label: status.replace('_', ' '), variant: 'default' };
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="border-b border-semantic-border bg-slate-50 text-left text-sm font-medium text-semantic-muted">
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Patient ID</th>
            <th className="px-4 py-3">Visit Type</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">E/M Code</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-semantic-border">
          {encounters.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-semantic-muted">
                No encounters found
              </td>
            </tr>
          ) : (
            encounters.map((encounter) => {
              const statusInfo = formatStatus(encounter.status);
              return (
                <tr
                  key={encounter.id}
                  onClick={() => onRowClick(encounter.id)}
                  className="cursor-pointer transition-colors duration-150 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 text-sm text-brand-ink">
                    {formatDate(encounter.encounterDate)}
                  </td>
                  <td className="px-4 py-3 text-sm text-brand-ink">
                    {encounter.patientPseudoId}
                  </td>
                  <td className="px-4 py-3 text-sm text-brand-ink">
                    {encounter.visitType.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-brand-ink">
                    {encounter.finalEmCode || encounter.aiEmSuggested || '—'}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

