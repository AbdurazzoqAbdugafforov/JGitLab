"use client";

import React, { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { JGitLabLogoMark, JGitLabRefreshIcon } from "@/components/brand/JGitLabBrand";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    const errorDesc = searchParams.get("error_description");
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const next = searchParams.get("next") || "/dashboard";

    if (error) {
      router.replace(`/login?auth_error=${encodeURIComponent(error)}&auth_error_description=${encodeURIComponent(errorDesc || "")}`);
      return;
    }

    if (code && state) {
      // If code and state were sent to frontend callback instead of backend directly:
      // Redirect to backend OAuth handler
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      // Try to detect provider or default to github
      const provider = searchParams.get("provider") || "github";
      window.location.href = `${backendUrl}/auth/oauth/${provider}/callback?${searchParams.toString()}`;
      return;
    }

    // Default smooth fallback
    router.replace(next);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#0A0D14] flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="p-8 rounded-2xl bg-[#161B22] border border-[#30363D] shadow-2xl max-w-sm w-full space-y-4">
        <div className="flex justify-center">
          <JGitLabLogoMark size="lg" glow />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-[#F0F6FC]">
            Completing Authentication
          </h2>
          <p className="text-xs text-[#8B949E]">
            Verifying cryptographic token and redirecting to workspace...
          </p>
        </div>
        <div className="pt-2 flex justify-center">
          <JGitLabRefreshIcon size="md" spinning={true} />
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0D14] flex items-center justify-center">
          <JGitLabRefreshIcon size="md" spinning={true} />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
