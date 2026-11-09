import * as path from 'path';

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  '.venv',
  'venv',
  '__pycache__',
  '.pytest_cache',
  'dist',
  'build',
  '.next',
  '.nuxt',
  'coverage',
  '.turbo',
  'target',
  'bin',
  'obj',
  '.idea',
  '.vscode',
  'vendor',
]);

const EXCLUDED_FILES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  '.DS_Store',
  'id_rsa',
  'id_ed25519',
]);

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  '.py': 'Python',
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript (React)',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript (React)',
  '.rs': 'Rust',
  '.go': 'Go',
  '.java': 'Java',
  '.cpp': 'C++',
  '.c': 'C',
  '.cs': 'C#',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.html': 'HTML',
  '.css': 'CSS',
  '.sql': 'SQL',
  '.sh': 'Shell',
  '.yml': 'YAML',
  '.yaml': 'YAML',
  '.json': 'JSON',
  '.md': 'Markdown',
};

export class RepositoryAnalyzer {
  static isPathExcluded(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    const parts = normalized.split('/');
    for (const part of parts) {
      if (EXCLUDED_DIRS.has(part)) return true;
    }
    const filename = parts[parts.length - 1] || '';
    if (EXCLUDED_FILES.has(filename) || filename.startsWith('.env')) {
      return true;
    }
    return false;
  }

  static analyzeFileList(
    files: string[],
    contentsMap: Record<string, string> = {},
  ): Record<string, any> {
    const langCounts: Record<string, number> = {};
    const frameworks: string[] = [];
    const dependencies: Record<string, string[]> = {};
    const importantFiles: string[] = [];

    const filteredFiles = files.filter(
      (f) => f && !RepositoryAnalyzer.isPathExcluded(f),
    );

    for (const filePath of filteredFiles) {
      const ext = path.extname(filePath).toLowerCase();
      if (LANGUAGE_EXTENSIONS[ext]) {
        const lang = LANGUAGE_EXTENSIONS[ext];
        langCounts[lang] = (langCounts[lang] || 0) + 1;
      }

      const fname = path.basename(filePath).toLowerCase();
      if (
        [
          'readme.md',
          'dockerfile',
          'docker-compose.yml',
          'package.json',
          'requirements.txt',
          'pyproject.toml',
          'cargo.toml',
          'go.mod',
          'makefile',
          'nest-cli.json',
        ].includes(fname)
      ) {
        importantFiles.push(filePath);
      }
    }

    if (filteredFiles.some((f) => f.includes('next.config'))) {
      frameworks.push('Next.js');
    }
    if (filteredFiles.some((f) => f.includes('nest-cli.json'))) {
      frameworks.push('NestJS');
    }
    if (filteredFiles.some((f) => f.includes('vite.config'))) {
      frameworks.push('Vite');
    }
    if (filteredFiles.some((f) => f.includes('tailwind.config'))) {
      frameworks.push('Tailwind CSS');
    }

    for (const [filePath, content] of Object.entries(contentsMap)) {
      const base = path.basename(filePath).toLowerCase();
      if (base === 'package.json') {
        try {
          const pkg = JSON.parse(content);
          const deps = {
            ...(pkg.dependencies || {}),
            ...(pkg.devDependencies || {}),
          };
          dependencies.npm = Object.keys(deps).slice(0, 40);
          if (deps['@nestjs/core'] && !frameworks.includes('NestJS')) {
            frameworks.push('NestJS');
          }
          if (deps['react'] && !frameworks.includes('React')) {
            frameworks.push('React');
          }
          if (deps['vue']) frameworks.push('Vue.js');
          if (deps['express']) frameworks.push('Express');
          if (deps['fastify']) frameworks.push('Fastify');
        } catch {
          // Ignore malformed package.json
        }
      }

      if (base === 'requirements.txt' || base === 'pyproject.toml') {
        const pyDeps: string[] = [];
        for (const rawLine of content.split(/\r?\n/)) {
          const line = rawLine.trim();
          if (line && !line.startsWith('#')) {
            const depName = line.split(/[=<>~;]/)[0].trim();
            if (depName) pyDeps.push(depName);
          }
        }
        dependencies.python = pyDeps.slice(0, 40);
        if (
          pyDeps.some((d) => d.toLowerCase().includes('fastapi')) &&
          !frameworks.includes('FastAPI')
        ) {
          frameworks.push('FastAPI');
        }
      }
    }

    const dirsSeen = new Set<string>();
    for (const f of filteredFiles.slice(0, 200)) {
      const parts = f.replace(/\\/g, '/').split('/');
      if (parts.length > 1) {
        dirsSeen.add(parts.slice(0, -1).join('/'));
      }
    }

    const totalLangFiles =
      Object.values(langCounts).reduce((a, b) => a + b, 0) || 1;
    const sortedLangs = Object.entries(langCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const langPercentages: Record<string, number> = {};
    for (const [lang, count] of sortedLangs) {
      langPercentages[lang] =
        Math.round((count / totalLangFiles) * 1000) / 10;
    }

    const uniqueFrameworks = Array.from(new Set(frameworks)).sort();
    const totalDeps = Object.values(dependencies).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );

    return {
      languages: langPercentages,
      total_files_analyzed: filteredFiles.length,
      frameworks: uniqueFrameworks,
      dependencies,
      important_files: importantFiles,
      directories: Array.from(dirsSeen).sort().slice(0, 25),
      analysis_summary: {
        primary_language: sortedLangs[0]?.[0] || 'Unknown',
        framework_count: uniqueFrameworks.length,
        dependency_count: totalDeps,
        is_monorepo: filteredFiles.some(
          (p) =>
            p.startsWith('packages/') ||
            p.startsWith('apps/') ||
            (p.startsWith('backend/') &&
              filteredFiles.some((f) => f.startsWith('frontend/'))),
        ),
      },
    };
  }
}
