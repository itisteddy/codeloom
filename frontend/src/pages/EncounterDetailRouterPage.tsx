import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { EncounterDetailProviderPage } from './EncounterDetailProviderPage';
import { EncounterDetailBillerPage } from './EncounterDetailBillerPage';

export const EncounterDetailRouterPage: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  if (user.role === 'provider') {
    return <EncounterDetailProviderPage />;
  }

  if (user.role === 'biller' || user.role === 'admin') {
    return <EncounterDetailBillerPage />;
  }

  return <div>Unknown user role</div>;
};

