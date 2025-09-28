import { useEffect } from "react";
import { useRouter } from "next/router";

export default function LegacyLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return null;
}
