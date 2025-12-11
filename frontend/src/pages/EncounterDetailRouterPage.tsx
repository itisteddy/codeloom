import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { EncounterDetailProviderPage } from './EncounterDetailProviderPage';
import { EncounterDetailBillerPage } from './EncounterDetailBillerPage';
import { canFinalize } from '../types/roles';

export const EncounterDetailRouterPage: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  if (user.role === 'provider') {
    return <EncounterDetailProviderPage />;
  }

  // Billers and admins use the biller view (with finalization capabilities)
  if (canFinalize(user.role)) {
    return <EncounterDetailBillerPage />;
  }

  return <div>Unknown user role</div>;
};

