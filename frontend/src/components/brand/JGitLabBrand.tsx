"use client";

import React from "react";

export function JGitLabLogoMark({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}) {
  const dims =
    size === "sm"
      ? "w-7 h-7 rounded-lg"
      : size === "md"
      ? "w-9 h-9 rounded-xl"
      : size === "lg"
      ? "w-11 h-11 rounded-xl"
      : size === "xl"
      ? "w-16 h-16 rounded-2xl"
      : "w-24 h-24 rounded-3xl";

  return (
    <div
      className={`relative p-[1.5px] bg-gradient-to-tr from-cyan-400 via-violet-500 to-orange-500 shadow-[0_0_24px_rgba(139,92,246,0.38)] shrink-0 ${dims} ${className}`}
    >
      <div className="w-full h-full rounded-[inherit] overflow-hidden bg-[#060918]">
        <img
          src="/jgitlab-logo.jpg"
          alt="JGitLab Logo"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
}

export function JGitLabWordmark({
  size = "md",
  showBrackets = true,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  showBrackets?: boolean;
}) {
  const textClass =
    size === "sm"
      ? "text-sm"
      : size === "md"
      ? "text-base"
      : size === "lg"
      ? "text-xl"
      : "text-2xl";

  return (
    <span className={`inline-flex items-center gap-0.5 font-extrabold tracking-tight ${textClass}`}>
      {showBrackets && <span className="text-cyan-400 font-mono text-[0.75em] mr-0.5">&lt;&gt;</span>}
      <span className="bg-gradient-to-b from-cyan-300 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
        J
      </span>
      <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text text-transparent">
        GitLab
      </span>
      {showBrackets && <span className="text-orange-400 font-mono text-[0.72em] ml-0.5">&gt;_</span>}
    </span>
  );
}

export function JGitLabSplashLoader({
  label = "Refreshing JGitLab Studio...",
  fullScreen = true,
}: {
  label?: string;
  fullScreen?: boolean;
}) {
  return (
    <div
      className={`${
        fullScreen ? "min-h-screen" : "min-h-[62vh]"
      } bg-[#04060E] bg-hero-glow flex flex-col items-center justify-center p-6 select-none`}
    >
      <div className="relative flex items-center justify-center">
        {/* Outer cosmic aura */}
        <div className="absolute -inset-6 rounded-full bg-gradient-to-tr from-cyan-500/30 via-violet-600/30 to-orange-500/30 blur-2xl animate-pulse" />
        {/* Spinning infinity ring */}
        <div className="w-28 h-28 rounded-3xl p-[2.5px] bg-gradient-to-tr from-cyan-400 via-violet-500 to-orange-500 animate-spin [animation-duration:2.8s]">
          <div className="w-full h-full rounded-[21px] bg-[#04060E]" />
        </div>
        {/* Center Official JGitLab Emblem */}
        <div className="absolute inset-2 rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-[#070B19]">
          <img
            src="/jgitlab-logo.jpg"
            alt="JGitLab"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="mt-7">
        <JGitLabWordmark size="xl" showBrackets />
      </div>

      <div className="mt-2.5 flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-gray-300">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        <span>{label}</span>
      </div>
    </div>
  );
}
