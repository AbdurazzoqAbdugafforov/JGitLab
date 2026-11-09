import React from "react";

interface FolderIconProps {
  name: string;
  isOpen: boolean;
  className?: string;
}

export function VSCodeFolderIcon({ name, isOpen, className = "w-4 h-4 shrink-0" }: FolderIconProps) {
  const lower = name.toLowerCase().trim();

  // Specialized folders with distinctive styling
  if (lower === "src" || lower === "source") {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d={isOpen ? "M1.5 3.5H6L7.5 5H14.5V13.5H1.5V3.5Z" : "M1.5 3.5H6L7.5 5H14.5V13.5H1.5V3.5Z"}
          fill={isOpen ? "#4daafc" : "#2b88d8"}
          opacity={isOpen ? 0.95 : 0.85}
        />
        <path d="M5.5 8L4 9.5L5.5 11M8.5 8L10 9.5L8.5 11" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (lower === "components" || lower === "ui") {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M1.5 3.5H6L7.5 5H14.5V13.5H1.5V3.5Z"
          fill={isOpen ? "#38bdf8" : "#0284c7"}
          opacity={0.9}
        />
        <rect x="5.5" y="7.5" width="5" height="4" rx="0.5" stroke="#ffffff" strokeWidth="1" fill="#38bdf8" fillOpacity="0.4" />
      </svg>
    );
  }

  if (lower === "app" || lower === "pages") {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M1.5 3.5H6L7.5 5H14.5V13.5H1.5V3.5Z"
          fill={isOpen ? "#a855f7" : "#7e22ce"}
          opacity={0.9}
        />
        <path d="M5 8.5H11M5 10.5H9" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
      </svg>
    );
  }

  if (lower === "public" || lower === "assets" || lower === "static") {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M1.5 3.5H6L7.5 5H14.5V13.5H1.5V3.5Z"
          fill={isOpen ? "#34d399" : "#059669"}
          opacity={0.9}
        />
        <circle cx="8" cy="9.5" r="2" stroke="#ffffff" strokeWidth="1" />
      </svg>
    );
  }

  if (lower === "api" || lower === "backend" || lower === "server") {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M1.5 3.5H6L7.5 5H14.5V13.5H1.5V3.5Z"
          fill={isOpen ? "#f59e0b" : "#d97706"}
          opacity={0.9}
        />
        <path d="M5.5 8.5L7 10L10.5 7" stroke="#ffffff" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (lower.includes("test") || lower === "__tests__" || lower === "spec") {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M1.5 3.5H6L7.5 5H14.5V13.5H1.5V3.5Z"
          fill={isOpen ? "#ec4899" : "#be185d"}
          opacity={0.9}
        />
        <path d="M7 7.5V10.5M9 7.5V10.5M6 11.5H10" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
      </svg>
    );
  }

  if (lower === ".git" || lower === ".github") {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M1.5 3.5H6L7.5 5H14.5V13.5H1.5V3.5Z"
          fill={isOpen ? "#f97316" : "#c2410c"}
          opacity={0.9}
        />
        <circle cx="6" cy="8.5" r="1" fill="#ffffff" />
        <circle cx="10" cy="8.5" r="1" fill="#ffffff" />
      </svg>
    );
  }

  if (lower === "node_modules") {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M1.5 3.5H6L7.5 5H14.5V13.5H1.5V3.5Z"
          fill="#64748b"
          opacity={0.8}
        />
        <rect x="5.5" y="8" width="5" height="3" stroke="#cbd5e1" strokeWidth="0.8" />
      </svg>
    );
  }

  // Classic VS Code Dark+ folder (open / closed)
  if (isOpen) {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M1.5 3.5C1.5 3.05 1.85 2.7 2.3 2.7H5.8L7.3 4.2H13.7C14.15 4.2 14.5 4.55 14.5 5V6.2H2.8C2.35 6.2 1.95 6.5 1.85 6.95L1.5 8.5V3.5Z"
          fill="#dcb67a"
        />
        <path
          d="M1.5 8.2L2.7 13.3C2.8 13.7 3.2 14 3.65 14H13.85C14.35 14 14.7 13.55 14.55 13.1L13.15 8.2C13.05 7.8 12.65 7.5 12.2 7.5H2.4C1.9 7.5 1.45 7.8 1.5 8.2Z"
          fill="#e6c994"
        />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M1.5 3.5C1.5 3.05 1.85 2.7 2.3 2.7H5.8L7.3 4.2H13.7C14.15 4.2 14.5 4.55 14.5 5V12.7C14.5 13.15 14.15 13.5 13.7 13.5H2.3C1.85 13.5 1.5 13.15 1.5 12.7V3.5Z"
        fill="#dcb67a"
      />
      <path
        d="M2.3 5H13.7V12.7H2.3V5Z"
        fill="#caa468"
        fillOpacity="0.4"
      />
    </svg>
  );
}

interface FileIconProps {
  path: string;
  className?: string;
}

export function VSCodeFileIcon({ path: filePath, className = "w-4 h-4 shrink-0" }: FileIconProps) {
  const fileName = filePath.split("/").pop() || filePath;
  const lower = fileName.toLowerCase();

  // TypeScript / TSX
  if (lower.endsWith(".tsx")) {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1.5" y="1.5" width="13" height="13" rx="2.5" fill="#3178c6" />
        <path d="M4 6H7.5M5.75 6V11.5" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M9 7.5L10.5 9.5M10.5 9.5L12 11.5M10.5 9.5L12 7.5M10.5 9.5L9 11.5" stroke="#61dafb" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  if (lower.endsWith(".ts")) {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1.5" y="1.5" width="13" height="13" rx="2.5" fill="#3178c6" />
        <path d="M4 6H8M6 6V11.5" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M12 7.5C11.5 7 10 7 9.5 7.5C9 8 9 9 10 9.5C11 10 11.5 10.5 11.5 11C11.5 11.5 10.5 12 9.5 11.5" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  // JavaScript / JSX
  if (lower.endsWith(".jsx")) {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1.5" y="1.5" width="13" height="13" rx="2.5" fill="#f7df1e" />
        <path d="M4 10.5C4.5 11.2 5.5 11.5 6 11C6.5 10.5 6.5 6 6.5 6" stroke="#000000" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M8.5 7.5L10 9.5M10 9.5L11.5 11.5M10 9.5L11.5 7.5M10 9.5L8.5 11.5" stroke="#0088cc" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }

  if (lower.endsWith(".js") || lower.endsWith(".mjs") || lower.endsWith(".cjs")) {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1.5" y="1.5" width="13" height="13" rx="2.5" fill="#f7df1e" />
        <path d="M5 9.8C5.5 10.6 6.5 10.8 7 10.4C7.5 10 7.5 6.5 7.5 6.5" stroke="#000000" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M12.5 7.5C12 6.8 10.5 6.8 10 7.3C9.5 7.8 9.5 8.7 10.5 9.2C11.5 9.7 12 10.2 12 10.8C12 11.4 11 11.8 10 11.4" stroke="#000000" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  // JSON
  if (lower.endsWith(".json")) {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1.5" y="1.5" width="13" height="13" rx="2.5" fill="#cbcb41" fillOpacity="0.15" stroke="#cbcb41" strokeWidth="1.2" />
        <text x="8" y="11" textAnchor="middle" fill="#cbcb41" fontSize="9" fontWeight="bold" fontFamily="monospace">{"{}"}</text>
      </svg>
    );
  }

  // HTML
  if (lower.endsWith(".html") || lower.endsWith(".htm")) {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1.5" y="1.5" width="13" height="13" rx="2.5" fill="#e34f26" />
        <path d="M4 8L6.5 5.5M4 8L6.5 10.5M12 8L9.5 5.5M12 8L9.5 10.5" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  // CSS / SCSS
  if (lower.endsWith(".css") || lower.endsWith(".scss") || lower.endsWith(".sass") || lower.endsWith(".less")) {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1.5" y="1.5" width="13" height="13" rx="2.5" fill="#42a5f5" />
        <path d="M4 6H12M4 8.5H10.5M4 11H8.5" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }

  // Markdown
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1.5" y="2" width="13" height="12" rx="2" fill="#519aba" fillOpacity="0.2" stroke="#519aba" strokeWidth="1.2" />
        <path d="M4 6V10M4 6L6 8L8 6M8 6V10M11 6V10M9.5 8.5L11 10L12.5 8.5" stroke="#519aba" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // Python
  if (lower.endsWith(".py") || lower.endsWith(".pyw")) {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7.8 2C5.5 2 5.5 3 5.5 3V5H8V5.8H4C4 5.8 2.5 5.7 2.5 7.7C2.5 9.7 3.7 9.6 3.7 9.6H5V8.5C5 7.5 6 7.5 6 7.5H8.5C9.5 7.5 9.5 6.5 9.5 6.5V3C9.5 3 9.5 2 7.8 2ZM6.8 3C7.2 3 7.5 3.3 7.5 3.7C7.5 4.1 7.2 4.4 6.8 4.4C6.4 4.4 6.1 4.1 6.1 3.7C6.1 3.3 6.4 3 6.8 3Z" fill="#3776ab" />
        <path d="M8.2 14C10.5 14 10.5 13 10.5 13V11H8V10.2H12C12 10.2 13.5 10.3 13.5 8.3C13.5 6.3 12.3 6.4 12.3 6.4H11V7.5C11 8.5 10 8.5 10 8.5H7.5C6.5 8.5 6.5 9.5 6.5 9.5V13C6.5 13 6.5 14 8.2 14ZM9.2 13C8.8 13 8.5 12.7 8.5 12.3C8.5 11.9 8.8 11.6 9.2 11.6C9.6 11.6 9.9 11.9 9.9 12.3C9.9 12.7 9.6 13 9.2 13Z" fill="#ffd343" />
      </svg>
    );
  }

  // Git / .gitignore
  if (lower.startsWith(".git") || lower.includes("git")) {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="5" cy="5" r="2" fill="#f05032" />
        <circle cx="11" cy="5" r="2" fill="#f05032" />
        <circle cx="5" cy="11" r="2" fill="#f05032" />
        <path d="M5 7V9M7 5H9" stroke="#f05032" strokeWidth="1.2" />
      </svg>
    );
  }

  // Docker
  if (lower === "dockerfile" || lower.startsWith("docker-compose") || lower.endsWith(".dockerfile")) {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 9.5C2.5 9.5 3 9.7 3.5 9.5C4.2 9.1 5 9.3 5.8 9.5C6.6 9.7 7.4 9.4 8.2 9.5C9 9.6 9.8 9.3 10.6 9.5C11.5 9.7 12.3 9.2 13 9.7C13.5 9.3 14 9.5 14.5 9.7C14.7 11.5 13.5 13.5 9.5 13.5C5.5 13.5 2.2 12.5 2 9.5Z" fill="#2496ed" />
        <rect x="4.5" y="7" width="1.5" height="1.5" fill="#2496ed" />
        <rect x="6.5" y="7" width="1.5" height="1.5" fill="#2496ed" />
        <rect x="8.5" y="7" width="1.5" height="1.5" fill="#2496ed" />
        <rect x="6.5" y="5" width="1.5" height="1.5" fill="#2496ed" />
      </svg>
    );
  }

  // YAML
  if (lower.endsWith(".yml") || lower.endsWith(".yaml")) {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1.5" y="1.5" width="13" height="13" rx="2.5" fill="#cb171e" fillOpacity="0.15" stroke="#cb171e" strokeWidth="1.2" />
        <text x="8" y="11" textAnchor="middle" fill="#cb171e" fontSize="7.5" fontWeight="bold" fontFamily="monospace">YML</text>
      </svg>
    );
  }

  // SQL / Database
  if (lower.endsWith(".sql") || lower.endsWith(".prisma")) {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="8" cy="4.5" rx="5.5" ry="2" fill="#00758f" />
        <path d="M2.5 4.5V11.5C2.5 12.6 5 13.5 8 13.5C11 13.5 13.5 12.6 13.5 11.5V4.5" stroke="#00758f" strokeWidth="1.2" fill="none" />
        <path d="M2.5 8C2.5 9.1 5 10 8 10C11 10 13.5 9.1 13.5 8" stroke="#00758f" strokeWidth="1" fill="none" />
      </svg>
    );
  }

  // Shell / Bash
  if (lower.endsWith(".sh") || lower.endsWith(".bash") || lower.endsWith(".zsh") || lower.endsWith(".cmd") || lower.endsWith(".bat") || lower.endsWith(".ps1")) {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1.5" y="1.5" width="13" height="13" rx="2.5" fill="#1e293b" stroke="#4ade80" strokeWidth="1.1" />
        <path d="M4.5 5.5L7 8L4.5 10.5M8 10.5H11.5" stroke="#4ade80" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // Environment
  if (lower.startsWith(".env")) {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1.5" y="1.5" width="13" height="13" rx="2.5" fill="#eab308" fillOpacity="0.2" stroke="#eab308" strokeWidth="1.1" />
        <circle cx="8" cy="6.5" r="2.5" stroke="#eab308" strokeWidth="1.1" fill="none" />
        <path d="M8 9V12M8 10.5H9.5M8 12H10" stroke="#eab308" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    );
  }

  // Images
  if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".gif") || lower.endsWith(".svg") || lower.endsWith(".webp") || lower.endsWith(".ico")) {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1.5" y="2" width="13" height="12" rx="2" fill="#a855f7" fillOpacity="0.15" stroke="#a855f7" strokeWidth="1.1" />
        <circle cx="5.5" cy="5.5" r="1.5" fill="#a855f7" />
        <path d="M2.5 11.5L6.5 7.5L10 11.5M9 10.5L11 8.5L13.5 11" stroke="#a855f7" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // Default code or text file
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 2H10L13.5 5.5V13.5C13.5 13.8 13.2 14 12.8 14H3.2C2.8 14 2.5 13.8 2.5 13.5V2.5C2.5 2.2 2.8 2 3.2 2H3Z" fill="#1e222a" stroke="#64748b" strokeWidth="1.1" />
      <path d="M9.5 2V5.5H13" stroke="#64748b" strokeWidth="1" fill="#334155" />
      <path d="M5 8.5H11M5 10.5H9" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
