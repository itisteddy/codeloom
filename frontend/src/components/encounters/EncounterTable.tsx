import React from 'react';
import { EncounterSummaryDto } from '../../api/encounters';

interface Props {
  encounters: EncounterSummaryDto[];
  onRowClick: (id: string) => void;
}

export const EncounterTable: React.FC<Props> = ({ encounters, onRowClick }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse border border-slate-300">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-300 px-4 py-2 text-left text-sm font-medium">Date</th>
            <th className="border border-slate-300 px-4 py-2 text-left text-sm font-medium">
              Patient ID
            </th>
            <th className="border border-slate-300 px-4 py-2 text-left text-sm font-medium">
              Visit Type
            </th>
            <th className="border border-slate-300 px-4 py-2 text-left text-sm font-medium">
              Status
            </th>
            <th className="border border-slate-300 px-4 py-2 text-left text-sm font-medium">
              E/M Code
            </th>
          </tr>
        </thead>
        <tbody>
          {encounters.length === 0 ? (
            <tr>
              <td colSpan={5} className="border border-slate-300 px-4 py-8 text-center text-slate-500">
                No encounters found
              </td>
            </tr>
          ) : (
            encounters.map((encounter) => (
              <tr
                key={encounter.id}
                onClick={() => onRowClick(encounter.id)}
                className="hover:bg-slate-50 cursor-pointer"
              >
                <td className="border border-slate-300 px-4 py-2 text-sm">
                  {formatDate(encounter.encounterDate)}
                </td>
                <td className="border border-slate-300 px-4 py-2 text-sm">
                  {encounter.patientPseudoId}
                </td>
                <td className="border border-slate-300 px-4 py-2 text-sm">
                  {encounter.visitType.replace('_', ' ')}
                </td>
                <td className="border border-slate-300 px-4 py-2 text-sm">
                  {formatStatus(encounter.status)}
                </td>
                <td className="border border-slate-300 px-4 py-2 text-sm">
                  {encounter.finalEmCode || encounter.aiEmSuggested || '-'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

