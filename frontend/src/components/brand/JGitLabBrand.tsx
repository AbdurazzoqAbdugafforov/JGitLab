"use client";

import React from "react";

export function JGitLabLogoMark({
  size = "md",
  className = "",
  spinning = false,
  glow = false,
}: {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  spinning?: boolean;
  glow?: boolean;
}) {
  const dims =
    size === "xs"
      ? "w-4 h-4"
      : size === "sm"
      ? "w-6 h-6"
      : size === "md"
      ? "w-8 h-8"
      : size === "lg"
      ? "w-10 h-10"
      : size === "xl"
      ? "w-14 h-14"
      : "w-20 h-20";

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${dims} ${className}`}
    >
      {glow && (
        <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-[#FF5C36]/30 via-[#1F6FEB]/20 to-transparent blur-md pointer-events-none" />
      )}
      <img
        src="/jgitlab-mark.png"
        alt="JGitLab Logo Mark"
        className={`w-full h-full object-contain select-none transition-transform duration-300 ${
          spinning ? "animate-spin [animation-duration:0.85s]" : ""
        }`}
      />
    </div>
  );
}

export function JGitLabWordmark({
  size = "md",
  showBrackets = false,
  className = "",
}: {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showBrackets?: boolean;
  className?: string;
}) {
  const textClass =
    size === "xs"
      ? "text-xs font-semibold"
      : size === "sm"
      ? "text-sm font-semibold"
      : size === "md"
      ? "text-base font-bold tracking-tight"
      : size === "lg"
      ? "text-xl font-bold tracking-tight"
      : "text-2xl sm:text-3xl font-extrabold tracking-tight";

  return (
    <span className={`inline-flex items-center gap-0.5 select-none ${textClass} ${className}`}>
      {showBrackets && (
        <span className="text-[#58A6FF] font-mono text-[0.85em] font-normal mr-0.5">&lt;</span>
      )}
      <span className="text-[#FFFFFF] font-extrabold tracking-tight">JGit</span>
      <span className="text-[#FF5C36] font-bold tracking-tight drop-shadow-[0_0_12px_rgba(255,92,54,0.35)]">
        Lab
      </span>
      {showBrackets && (
        <span className="text-[#58A6FF] font-mono text-[0.85em] font-normal ml-0.5">&gt;</span>
      )}
    </span>
  );
}

export function JGitLabFullLogo({
  size = "md",
  showBrackets = false,
  className = "",
  spinningMark = false,
}: {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showBrackets?: boolean;
  className?: string;
  spinningMark?: boolean;
}) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <JGitLabLogoMark size={size} spinning={spinningMark} glow />
      <JGitLabWordmark size={size} showBrackets={showBrackets} />
    </div>
  );
}

/**
 * Universal JGitLab Refresh Component
 * Designed to replace or enhance refresh buttons, spinners, and sync indicators across the entire studio!
 */
export function JGitLabRefreshIcon({
  size = "sm",
  className = "",
  spinning = false,
}: {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  spinning?: boolean;
}) {
  const dim =
    size === "xs"
      ? "w-3.5 h-3.5"
      : size === "sm"
      ? "w-4 h-4"
      : size === "md"
      ? "w-5 h-5"
      : "w-6 h-6";

  return (
    <span
      className={`inline-flex items-center justify-center relative shrink-0 ${dim} ${className}`}
      title={spinning ? "Refreshing JGitLab..." : "Refresh"}
    >
      <img
        src="/jgitlab-mark.png"
        alt="JGitLab Refresh"
        className={`w-full h-full object-contain transition-all duration-300 ${
          spinning
            ? "animate-spin [animation-duration:0.8s] drop-shadow-[0_0_8px_rgba(255,92,54,0.7)] scale-110"
            : "hover:rotate-45"
        }`}
      />
    </span>
  );
}

export function JGitLabSplashLoader({
  label = "Loading JGitLab Studio...",
  fullScreen = true,
}: {
  label?: string;
  fullScreen?: boolean;
}) {
  return (
    <div
      className={`${
        fullScreen ? "min-h-screen" : "min-h-[62vh]"
      } bg-[#0A0D14] flex flex-col items-center justify-center p-6 select-none relative overflow-hidden`}
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-gradient-to-tr from-[#FF5C36]/15 via-[#1F6FEB]/15 to-transparent blur-3xl pointer-events-none" />

      <div className="relative flex items-center justify-center">
        {/* Glowing orbit ring */}
        <div className="w-24 h-24 rounded-full p-[2px] bg-gradient-to-tr from-[#FF5C36] via-[#1F6FEB] to-transparent animate-spin [animation-duration:1.5s]">
          <div className="w-full h-full rounded-full bg-[#0A0D14]" />
        </div>

        {/* Center Official JGitLab Rotating Origami Mark */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 p-1 rounded-2xl bg-[#161B22]/90 border border-[#30363D] shadow-2xl flex items-center justify-center">
            <img
              src="/jgitlab-mark.png"
              alt="JGitLab"
              className="w-10 h-10 object-contain animate-spin [animation-duration:2.5s] drop-shadow-[0_0_12px_rgba(255,92,54,0.5)]"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center">
        <JGitLabWordmark size="lg" />
        <div className="mt-3 flex items-center gap-2 px-3 py-1 rounded-full bg-[#161B22] border border-[#30363D] text-xs font-mono text-[#8B949E]">
          <span className="w-2 h-2 rounded-full bg-[#FF5C36] animate-ping" />
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
}
