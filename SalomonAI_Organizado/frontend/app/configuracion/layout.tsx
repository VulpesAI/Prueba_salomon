import type { ReactNode } from 'react';

import ConfiguracionLayoutClient from './layout.client';

export default function ConfiguracionLayout({ children }: { children: ReactNode }) {
  return <ConfiguracionLayoutClient>{children}</ConfiguracionLayoutClient>;
}
