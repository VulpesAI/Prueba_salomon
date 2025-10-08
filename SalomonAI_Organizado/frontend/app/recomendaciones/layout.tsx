import type { ReactNode } from "react";
import RecomendacionesLayoutClient from "./layout.client";

export default function RecomendacionesLayout({ children }: { children: ReactNode }) {
  return <RecomendacionesLayoutClient>{children}</RecomendacionesLayoutClient>;
}
