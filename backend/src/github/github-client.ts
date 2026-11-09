export class GitHubClient {
  private readonly token: string;
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(token: string, baseUrl = 'https://api.github.com') {
    this.token = (token || '').trim();
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.headers = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'JGitLab-Engineering-Platform/0.2.0',
    };
    if (this.token) {
      this.headers['Authorization'] = `Bearer ${this.token}`;
    }
  }

  async getUserProfile(): Promise<Record<string, any>> {
    const resp = await fetch(`${this.baseUrl}/user`, {
      headers: this.headers,
      signal: AbortSignal.timeout(15000),
    });
    if (resp.ok) {
      return resp.json();
    }
    const text = await resp.text();
    throw new Error(`GitHub user profile lookup failed: ${resp.status} ${text}`);
  }

  async listUserRepos(
    page = 1,
    perPage = 50,
  ): Promise<Array<Record<string, any>>> {
    const params = new URLSearchParams({
      sort: 'updated',
      direction: 'desc',
      page: String(page),
      per_page: String(perPage),
    });
    const resp = await fetch(
      `${this.baseUrl}/user/repos?${params.toString()}`,
      {
        headers: this.headers,
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Failed to fetch repositories: ${resp.status} ${text}`);
    }
    const repos: any[] = await resp.json();
    return repos.map((r) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      owner: r.owner?.login || '',
      html_url: r.html_url,
      clone_url: r.clone_url,
      default_branch: r.default_branch || 'main',
      description: r.description || null,
      language: r.language || null,
      is_private: Boolean(r.private),
      updated_at: r.updated_at || null,
    }));
  }

  async getRepoDetails(fullName: string): Promise<Record<string, any>> {
    const resp = await fetch(`${this.baseUrl}/repos/${fullName}`, {
      headers: this.headers,
      signal: AbortSignal.timeout(15000),
    });
    if (resp.ok) {
      return resp.json();
    }
    const text = await resp.text();
    throw new Error(`Repo details lookup failed: ${resp.status} ${text}`);
  }

  async getRepoTree(
    fullName: string,
    branch?: string,
  ): Promise<{ tree: Array<Record<string, any>>; branch: string; isEmpty: boolean }> {
    let effectiveBranch = (branch || '').trim();
    if (!effectiveBranch) {
      try {
        const details = await this.getRepoDetails(fullName);
        effectiveBranch = details.default_branch || 'main';
      } catch {
        effectiveBranch = 'main';
      }
    }

    let resp = await fetch(
      `${this.baseUrl}/repos/${fullName}/git/trees/${encodeURIComponent(effectiveBranch)}?recursive=1`,
      {
        headers: this.headers,
        signal: AbortSignal.timeout(30000),
      },
    );

    if (resp.status === 409) {
      return { tree: [], branch: effectiveBranch, isEmpty: true };
    }

    if (!resp.ok && effectiveBranch === 'main') {
      resp = await fetch(
        `${this.baseUrl}/repos/${fullName}/git/trees/master?recursive=1`,
        {
          headers: this.headers,
          signal: AbortSignal.timeout(30000),
        },
      );
      if (resp.ok) {
        effectiveBranch = 'master';
      }
    } else if (!resp.ok && effectiveBranch === 'master') {
      resp = await fetch(
        `${this.baseUrl}/repos/${fullName}/git/trees/main?recursive=1`,
        {
          headers: this.headers,
          signal: AbortSignal.timeout(30000),
        },
      );
      if (resp.ok) {
        effectiveBranch = 'main';
      }
    }

    if (resp.status === 409) {
      return { tree: [], branch: effectiveBranch, isEmpty: true };
    }

    if (resp.ok) {
      const data: any = await resp.json();
      return { tree: data.tree || [], branch: effectiveBranch, isEmpty: false };
    }

    return { tree: [], branch: effectiveBranch, isEmpty: false };
  }

  async getFileContent(
    fullName: string,
    filePath: string,
    branch = 'main',
  ): Promise<string | null> {
    const cleanPath = filePath.replace(/^\/+/, '');
    const encodedPath = cleanPath
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');

    let resp = await fetch(
      `${this.baseUrl}/repos/${fullName}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`,
      {
        headers: this.headers,
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!resp.ok && branch === 'main') {
      resp = await fetch(
        `${this.baseUrl}/repos/${fullName}/contents/${encodedPath}?ref=master`,
        {
          headers: this.headers,
          signal: AbortSignal.timeout(15000),
        },
      );
    } else if (!resp.ok && branch === 'master') {
      resp = await fetch(
        `${this.baseUrl}/repos/${fullName}/contents/${encodedPath}?ref=main`,
        {
          headers: this.headers,
          signal: AbortSignal.timeout(15000),
        },
      );
    }
    if (resp.ok) {
      const data: any = await resp.json();
      if (typeof data.content === 'string' && data.encoding === 'base64') {
        return Buffer.from(data.content, 'base64').toString('utf8');
      }
      if (typeof data.content === 'string') {
        return data.content;
      }
    }
    return null;
  }

  async createBranch(
    fullName: string,
    branchName: string,
    baseBranch = 'main',
  ): Promise<Record<string, any>> {
    const refResp = await fetch(
      `${this.baseUrl}/repos/${fullName}/git/ref/heads/${baseBranch}`,
      {
        headers: this.headers,
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!refResp.ok) {
      const text = await refResp.text();
      throw new Error(`Failed to find base branch ${baseBranch}: ${text}`);
    }
    const refData: any = await refResp.json();
    const baseSha = refData?.object?.sha;

    const createResp = await fetch(
      `${this.baseUrl}/repos/${fullName}/git/refs`,
      {
        method: 'POST',
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: baseSha,
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (createResp.status === 200 || createResp.status === 201) {
      return createResp.json();
    }
    if (createResp.status === 422) {
      return { ref: `refs/heads/${branchName}`, existing: true };
    }
    const text = await createResp.text();
    throw new Error(`Failed to create branch ${branchName}: ${text}`);
  }

  async createPullRequest(
    fullName: string,
    title: string,
    body: string,
    headBranch: string,
    baseBranch = 'main',
  ): Promise<Record<string, any>> {
    const resp = await fetch(`${this.baseUrl}/repos/${fullName}/pulls`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body,
        head: headBranch,
        base: baseBranch,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (resp.status === 200 || resp.status === 201) {
      return resp.json();
    }
    const text = await resp.text();
    throw new Error(`Failed to create Pull Request: ${resp.status} ${text}`);
  }

  async listPullRequests(
    fullName: string,
    state = 'open',
  ): Promise<Array<Record<string, any>>> {
    const resp = await fetch(
      `${this.baseUrl}/repos/${fullName}/pulls?state=${encodeURIComponent(state)}&per_page=30`,
      {
        headers: this.headers,
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!resp.ok) {
      return [];
    }
    return resp.json();
  }
}
