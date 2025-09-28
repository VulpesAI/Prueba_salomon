import { useEffect } from "react";
import { useRouter } from "next/router";

export default function LegacyDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return null;
}
