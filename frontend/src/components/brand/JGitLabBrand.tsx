"use client";

import React from "react";

export function JGitLabLogoMark({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const dims =
    size === "sm"
      ? "w-7 h-7 rounded-md"
      : size === "md"
      ? "w-8 h-8 rounded-lg"
      : size === "lg"
      ? "w-10 h-10 rounded-xl"
      : "w-16 h-16 rounded-2xl";

  return (
    <div
      className={`relative overflow-hidden border border-violet-500/40 bg-[#0D1021] shadow-[0_0_18px_rgba(139,92,246,0.28)] shrink-0 ${dims} ${className}`}
    >
      <img
        src="/jgitlab-logo.jpg"
        alt="JGitLab Logo"
        className="w-full h-full object-cover"
      />
    </div>
  );
}

export function JGitLabSplashLoader({
  label = "Refreshing JGitLab Workspace...",
  fullScreen = true,
}: {
  label?: string;
  fullScreen?: boolean;
}) {
  return (
    <div
      className={`${
        fullScreen ? "min-h-screen" : "min-h-[60vh]"
      } bg-[#06080D] flex flex-col items-center justify-center p-6 select-none`}
    >
      <div className="relative flex items-center justify-center">
        {/* Outer animated pulse ring */}
        <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-violet-600/25 via-cyan-400/20 to-orange-500/25 blur-xl animate-pulse" />
        {/* Spinning orbital border */}
        <div className="w-24 h-24 rounded-2xl p-[2px] bg-gradient-to-tr from-cyan-400 via-violet-500 to-orange-500 animate-spin [animation-duration:3s]">
          <div className="w-full h-full rounded-[14px] bg-[#06080D]" />
        </div>
        {/* Center JGitLab Logo */}
        <div className="absolute inset-1.5 rounded-xl overflow-hidden border border-white/15 shadow-2xl bg-[#0D1021]">
          <img
            src="/jgitlab-logo.jpg"
            alt="JGitLab"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Branded JGitLab Title */}
      <div className="mt-6 flex items-center gap-1.5 font-extrabold tracking-tight text-2xl">
        <span className="text-cyan-400 font-mono text-base">&lt;</span>
        <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
          J
        </span>
        <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-rose-500 bg-clip-text text-transparent">
          GitLab
        </span>
        <span className="text-cyan-400 font-mono text-base">/&gt;</span>
      </div>

      <p className="mt-2 text-xs font-mono text-gray-400 tracking-wide flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
        <span>{label}</span>
      </p>
    </div>
  );
}
