import React from 'react';
import { AppShell } from '../components/layout/AppShell';

interface Props {
  children: React.ReactNode;
}

export const RootLayout: React.FC<Props> = ({ children }) => {
  return <AppShell>{children}</AppShell>;
};
