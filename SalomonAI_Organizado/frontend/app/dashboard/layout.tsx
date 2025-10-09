import type { ReactNode } from "react";

import AuthenticatedLayoutClient from "@/app/(authenticated)/layout.client";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AuthenticatedLayoutClient dehydratedState={undefined}>{children}</AuthenticatedLayoutClient>;
}
