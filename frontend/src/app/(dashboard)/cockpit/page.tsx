"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { JGitLabSplashLoader } from "@/components/brand/JGitLabBrand";

export default function CockpitRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/engineer");
  }, [router]);

  return <JGitLabSplashLoader label="Redirecting to Autonomous AI Engineer..." fullScreen />;
}
