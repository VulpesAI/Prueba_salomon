import type { ReactNode } from 'react';

import PronosticosLayoutClient from './layout.client';

export default function PronosticosLayout({ children }: { children: ReactNode }) {
  return <PronosticosLayoutClient>{children}</PronosticosLayoutClient>;
}
