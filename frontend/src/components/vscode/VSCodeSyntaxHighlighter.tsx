import React, { useMemo } from "react";

interface SyntaxHighlighterProps {
  code: string;
  filePath?: string;
  activeLine?: number | null;
  onLineClick?: (lineNumber: number) => void;
  className?: string;
}

// Token categories for VS Code Dark+ theme
export function highlightLine(line: string, filePath?: string): React.ReactNode {
  if (!line && line !== "") return "\u00A0";
  if (line.length === 0) return "\u00A0";

  const lowerPath = (filePath || "").toLowerCase();
  const trimmed = line.trimStart();
  const indent = line.slice(0, line.length - trimmed.length);

  // 1. Full line comments
  if (
    trimmed.startsWith("//") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("*") ||
    (lowerPath.endsWith(".py") && trimmed.startsWith("#")) ||
    (lowerPath.endsWith(".sh") && trimmed.startsWith("#")) ||
    (lowerPath.endsWith(".yml") && trimmed.startsWith("#")) ||
    (lowerPath.endsWith(".yaml") && trimmed.startsWith("#")) ||
    (lowerPath.endsWith(".env") && trimmed.startsWith("#")) ||
    trimmed.startsWith("--")
  ) {
    return (
      <>
        <span>{indent}</span>
        <span className="text-[#6A9955] italic">{trimmed}</span>
      </>
    );
  }

  // 2. Markdown Lines
  if (lowerPath.endsWith(".md") || lowerPath.endsWith(".markdown")) {
    if (trimmed.startsWith("#")) {
      return (
        <>
          <span>{indent}</span>
          <span className="text-[#569CD6] font-bold">{trimmed}</span>
        </>
      );
    }
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || /^\d+\.\s/.test(trimmed)) {
      return (
        <>
          <span>{indent}</span>
          <span className="text-[#C586C0] font-semibold">{trimmed.slice(0, 2)}</span>
          <span className="text-[#E6EDF3]">{trimmed.slice(2)}</span>
        </>
      );
    }
    if (trimmed.startsWith(">")) {
      return (
        <>
          <span>{indent}</span>
          <span className="text-[#4EC9B0] italic">{trimmed}</span>
        </>
      );
    }
  }

  // 3. JSON Lines (Specific Key-Value highlighting)
  if (lowerPath.endsWith(".json")) {
    const jsonMatch = trimmed.match(/^("[^"]+")(\s*:\s*)(.*)$/);
    if (jsonMatch) {
      const [, key, colon, val] = jsonMatch;
      let valEl: React.ReactNode = <span className="text-[#E6EDF3]">{val}</span>;
      const vTrimmed = val.trim();
      if (vTrimmed.startsWith('"')) {
        valEl = <span className="text-[#CE9178]">{val}</span>;
      } else if (vTrimmed.startsWith("true") || vTrimmed.startsWith("false") || vTrimmed.startsWith("null")) {
        valEl = <span className="text-[#569CD6]">{val}</span>;
      } else if (/^-?\d+(\.\d+)?/.test(vTrimmed)) {
        valEl = <span className="text-[#B5CEA8]">{val}</span>;
      }
      return (
        <>
          <span>{indent}</span>
          <span className="text-[#9CDCFE]">{key}</span>
          <span className="text-[#D4D4D4]">{colon}</span>
          {valEl}
        </>
      );
    }
  }

  // 4. Tokenizer Regex for TypeScript / JavaScript / Python / Rust / Go / SQL / HTML / CSS
  const regex = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/.*$|#[^\n]*|<!--.*?-->|<\/?[A-Za-z0-9_.-]+|[A-Za-z0-9_]+(?=\s*=)|[A-Za-z0-9_]+(?=\s*\(|(?:\s*:\s*(?:async\s+)?function))|[A-Za-z0-9_]+(?=\s*:)|[A-Za-z0-9_]+|\b\d+(?:\.\d+)?\b|[{}()[\],;.]|=>|===|!==|==|!=|<=|>=|\+\+|--|\+=|-=|\*=|\/=|&&|\|\||[+\-*/%=&|^!~<>?:]+|\S+)/g;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const controlKeywords = new Set([
    "return", "if", "else", "await", "async", "import", "export", "from", "as",
    "try", "catch", "finally", "throw", "while", "for", "switch", "case", "default",
    "break", "continue", "yield", "of", "in", "with", "do", "elif", "except"
  ]);

  const declareKeywords = new Set([
    "const", "let", "var", "function", "class", "interface", "type", "enum",
    "extends", "implements", "public", "private", "protected", "static", "readonly",
    "new", "typeof", "instanceof", "void", "def", "pass", "lambda", "global", "struct"
  ]);

  const typeKeywords = new Set([
    "string", "number", "boolean", "any", "unknown", "never", "void", "object",
    "Promise", "Record", "Array", "Set", "Map", "Partial", "Omit", "Pick",
    "React", "FC", "NextPage", "useState", "useEffect", "useMemo", "useCallback", "useRef",
    "int", "float", "str", "dict", "list", "bool"
  ]);

  const booleanConstants = new Set([
    "true", "false", "null", "undefined", "NaN", "Infinity", "None", "True", "False"
  ]);

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      elements.push(
        <span key={`text-${lastIndex}`} className="text-[#D4D4D4]">
          {line.slice(lastIndex, match.index)}
        </span>
      );
    }

    const token = match[0];
    const key = `t-${match.index}-${token.slice(0, 8)}`;

    // Comments
    if (token.startsWith("//") || token.startsWith("/*") || token.startsWith("#") || token.startsWith("<!--")) {
      elements.push(<span key={key} className="text-[#6A9955] italic">{token}</span>);
    }
    // String literals
    else if (
      (token.startsWith('"') && token.endsWith('"')) ||
      (token.startsWith("'") && token.endsWith("'")) ||
      (token.startsWith("`") && token.endsWith("`"))
    ) {
      elements.push(<span key={key} className="text-[#CE9178]">{token}</span>);
    }
    // JSX / HTML Tags
    else if (token.startsWith("<") && !token.startsWith("<=") && !token.startsWith("<<")) {
      const isClosing = token.startsWith("</");
      const tagContent = isClosing ? token.slice(2) : token.slice(1);
      const isComponent = /^[A-Z]/.test(tagContent);
      elements.push(
        <span key={key}>
          <span className="text-[#808080]">{isClosing ? "</" : "<"}</span>
          <span className={isComponent ? "text-[#4EC9B0] font-semibold" : "text-[#569CD6]"}>
            {tagContent}
          </span>
        </span>
      );
    }
    // Control keywords (purple)
    else if (controlKeywords.has(token)) {
      elements.push(<span key={key} className="text-[#C586C0] font-medium">{token}</span>);
    }
    // Declaration keywords (blue)
    else if (declareKeywords.has(token)) {
      elements.push(<span key={key} className="text-[#569CD6] font-medium">{token}</span>);
    }
    // Booleans & null (blue)
    else if (booleanConstants.has(token)) {
      elements.push(<span key={key} className="text-[#569CD6] font-semibold">{token}</span>);
    }
    // Numbers (light sage green)
    else if (/^\d+(\.\d+)?$/.test(token)) {
      elements.push(<span key={key} className="text-[#B5CEA8]">{token}</span>);
    }
    // Types and Interfaces (teal/cyan)
    else if (typeKeywords.has(token) || (/^[A-Z][a-zA-Z0-9_]*$/.test(token) && !token.includes("_"))) {
      elements.push(<span key={key} className="text-[#4EC9B0]">{token}</span>);
    }
    // Lookahead Function Call: followed by ( in original line
    else if (
      /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(token) &&
      line.slice(match.index + token.length).trimStart().startsWith("(")
    ) {
      elements.push(<span key={key} className="text-[#DCDCAA] font-medium">{token}</span>);
    }
    // Object property / key: followed by : in original line
    else if (
      /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(token) &&
      line.slice(match.index + token.length).trimStart().startsWith(":")
    ) {
      elements.push(<span key={key} className="text-[#9CDCFE]">{token}</span>);
    }
    // JSX Attribute: followed by = in original line
    else if (
      /^[a-zA-Z_$][a-zA-Z0-9_-]*$/.test(token) &&
      line.slice(match.index + token.length).trimStart().startsWith("=")
    ) {
      elements.push(<span key={key} className="text-[#9CDCFE]">{token}</span>);
    }
    // General variables / identifiers
    else if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(token)) {
      elements.push(<span key={key} className="text-[#9CDCFE]">{token}</span>);
    }
    // Operators and brackets
    else if (/^[{}()[\],;.]|=>|===|!==|==|!=|<=|>=|[+\-*/%=&|^!~<>?:]+$/.test(token)) {
      elements.push(<span key={key} className="text-[#D4D4D4]">{token}</span>);
    }
    // Default fallback
    else {
      elements.push(<span key={key} className="text-[#D4D4D4]">{token}</span>);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < line.length) {
    elements.push(
      <span key={`tail-${lastIndex}`} className="text-[#D4D4D4]">
        {line.slice(lastIndex)}
      </span>
    );
  }

  return <>{elements}</>;
}

export function VSCodeSyntaxHighlighter({
  code,
  filePath,
  activeLine,
  onLineClick,
  className = "",
}: SyntaxHighlighterProps) {
  const lines = useMemo(() => (code || "").split("\n"), [code]);

  return (
    <div className={`flex min-h-full font-mono text-[12.5px] leading-5 bg-[#1e1e1e] text-[#d4d4d4] select-text overflow-auto ${className}`}>
      {/* Line Numbers Column */}
      <div className="w-12 bg-[#1e1e1e] border-r border-[#2d2d2d] py-3 pr-3 text-right select-none shrink-0 font-mono text-[#858585]/70 text-[11.5px]">
        {lines.map((_, idx) => {
          const lineNum = idx + 1;
          const isCurrent = activeLine === lineNum;
          return (
            <div
              key={lineNum}
              onClick={() => onLineClick?.(lineNum)}
              className={`h-5 cursor-pointer transition-colors ${
                isCurrent
                  ? "text-[#c6c6c6] font-bold bg-[#333a46] -mr-3 pr-3"
                  : "hover:text-[#c6c6c6]"
              }`}
            >
              {lineNum}
            </div>
          );
        })}
      </div>

      {/* Code Content Column */}
      <div className="flex-1 py-3 px-4 font-mono whitespace-pre overflow-x-auto">
        {lines.map((line, idx) => {
          const lineNum = idx + 1;
          const isCurrent = activeLine === lineNum;
          return (
            <div
              key={lineNum}
              onClick={() => onLineClick?.(lineNum)}
              className={`h-5 px-1 -mx-1 rounded-sm transition-colors ${
                isCurrent ? "bg-[#282d36] border-l-2 border-[#007acc] pl-1" : "hover:bg-[#2a2d2e]/60"
              }`}
            >
              {highlightLine(line, filePath)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function VSCodeDiffViewer({
  diff,
  filePath,
  maxHeight = "500px",
  className = "",
}: {
  diff: string;
  filePath?: string;
  maxHeight?: string;
  className?: string;
}) {
  const parsedLines = useMemo(() => {
    if (!diff) return [];
    const rawLines = diff.split("\n");
    let oldLine = 1;
    let newLine = 1;

    return rawLines.map((line, idx) => {
      const hunkMatch = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (hunkMatch) {
        oldLine = parseInt(hunkMatch[1], 10);
        newLine = parseInt(hunkMatch[2], 10);
        return {
          id: idx,
          type: "hunk" as const,
          oldNum: null,
          newNum: null,
          raw: line,
        };
      }

      if (
        line.startsWith("diff --git") ||
        line.startsWith("index ") ||
        line.startsWith("---") ||
        line.startsWith("+++")
      ) {
        return {
          id: idx,
          type: "meta" as const,
          oldNum: null,
          newNum: null,
          raw: line,
        };
      }

      if (line.startsWith("+")) {
        const curNew = newLine++;
        return {
          id: idx,
          type: "add" as const,
          oldNum: null,
          newNum: curNew,
          raw: line.slice(1),
        };
      }

      if (line.startsWith("-")) {
        const curOld = oldLine++;
        return {
          id: idx,
          type: "del" as const,
          oldNum: curOld,
          newNum: null,
          raw: line.slice(1),
        };
      }

      const curOld = oldLine++;
      const curNew = newLine++;
      return {
        id: idx,
        type: "same" as const,
        oldNum: curOld,
        newNum: curNew,
        raw: line.startsWith(" ") ? line.slice(1) : line,
      };
    });
  }, [diff]);

  if (!diff || parsedLines.length === 0) {
    return (
      <div className="p-8 text-center text-xs font-mono text-[#8B949E] bg-[#0A0D14] rounded-lg border border-[#30363D]">
        No diff changes recorded for this task yet.
      </div>
    );
  }

  return (
    <div
      style={{ maxHeight }}
      className={`font-mono text-[12px] leading-5 bg-[#0D1117] text-[#C9D1D9] rounded-lg border border-[#30363D] overflow-auto select-text ${className}`}
    >
      <div className="min-w-max">
        {parsedLines.map((row) => {
          if (row.type === "meta") {
            return (
              <div
                key={row.id}
                className="flex items-center bg-[#161B22] text-[#8B949E] text-[11px] px-3 py-1 border-b border-[#30363D]/40 font-mono"
              >
                <span className="w-16 shrink-0 select-none text-slate-500 font-bold text-[10px]">
                  HEADER
                </span>
                <span className="truncate">{row.raw}</span>
              </div>
            );
          }

          if (row.type === "hunk") {
            return (
              <div
                key={row.id}
                className="flex items-center bg-[#1F6FEB]/10 text-[#58A6FF] text-[11px] px-3 py-1 font-semibold border-y border-[#30363D] font-mono"
              >
                <span className="w-16 shrink-0 select-none text-[#58A6FF]/60 text-[10px]">
                  HUNK
                </span>
                <span>{row.raw}</span>
              </div>
            );
          }

          const isAdd = row.type === "add";
          const isDel = row.type === "del";

          return (
            <div
              key={row.id}
              className={`flex items-center transition-colors ${
                isAdd
                  ? "bg-[#238636]/15 border-l-2 border-[#3FB950] text-[#E6EDF3]"
                  : isDel
                  ? "bg-[#DA3633]/15 border-l-2 border-[#F85149] text-[#E6EDF3]"
                  : "hover:bg-[#161B22]/50 text-[#C9D1D9]"
              }`}
            >
              {/* Old line number */}
              <span className="w-10 text-right pr-2 select-none text-[#484F58] text-[11px] shrink-0 font-mono">
                {row.oldNum ?? ""}
              </span>
              {/* New line number */}
              <span className="w-10 text-right pr-2 select-none text-[#484F58] text-[11px] shrink-0 font-mono border-r border-[#30363D]/40">
                {row.newNum ?? ""}
              </span>
              {/* Sign indicator */}
              <span
                className={`w-6 text-center select-none font-bold shrink-0 text-xs ${
                  isAdd ? "text-[#3FB950]" : isDel ? "text-[#F85149]" : "text-[#484F58]"
                }`}
              >
                {isAdd ? "+" : isDel ? "-" : " "}
              </span>
              {/* Highlighted code tokens */}
              <div className="flex-1 whitespace-pre pr-4 font-mono text-[12px]">
                {highlightLine(row.raw, filePath)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
