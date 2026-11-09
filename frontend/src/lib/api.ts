import {
  User,
  Project,
  GitHubConnectionStatus,
  GitHubAppConfig,
  GitHubWebhookConfig,
  GitHubInstallation,
  GitHubRepoSummary,
  RepoAnalysis,
  AIProviderConfig,
  AgentTask,
  StructuredPlan,
  MemoryRecord,
  ActivityLog,
  AuthProvidersStatus,
  IdentityAccount,
  UserSession,
  AdminOverview,
  AdminUser,
  AdminSession,
  AdminAuditLog,
  AppNotification,
  NotificationResponse,
  ModelDataset,
  ModelTrainingJob,
  ModelCheckpoint,
  ModelFactoryOverview,
  ProjectFileTreeResponse,
  ProjectFileContentResponse,
  WorkingChangesResponse,
  AIAgentChatPayload,
  AIAgentChatResponse,
} from "./types";

const API_BASE = "/api/v1";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function getHeaders(customHeaders: Record<string, string> = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...customHeaders,
  };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("jgitlab_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const csrf = getCookie("jgl_csrf");
    if (csrf) {
      headers["X-CSRF-Token"] = csrf;
    }
  }
  return headers;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: getHeaders(options.headers as Record<string, string>),
  });

  if (!res.ok) {
    let errorDetail = "API request failed";
    try {
      const errorJson = await res.json();
      if (typeof errorJson.detail === "string") {
        errorDetail = errorJson.detail;
      } else if (Array.isArray(errorJson.detail)) {
        errorDetail = errorJson.detail
          .map((e: { msg?: string; loc?: (string | number)[] }) =>
            e.msg ? e.msg.replace(/^Value error,\s*/i, "") : JSON.stringify(e)
          )
          .join("; ");
      } else if (errorJson.detail?.message) {
        errorDetail = errorJson.detail.message;
      }
    } catch {
      errorDetail = res.statusText || errorDetail;
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

export function getOAuthStartUrl(
  provider: "google" | "github",
  options: { intent?: "login" | "link"; next?: string } = {}
): string {
  const params = new URLSearchParams();
  params.set("intent", options.intent || "login");
  params.set("next", options.next || "/dashboard");
  return `${API_BASE}/auth/oauth/${provider}/start?${params.toString()}`;
}

export const api = {
  // Auth & Identity
  getAuthProviders: () => request<AuthProvidersStatus>("/auth/providers"),

  saveOAuthConfig: (payload: {
    google_client_id?: string;
    google_client_secret?: string;
    github_client_id?: string;
    github_client_secret?: string;
    github_app_name?: string;
    github_app_id?: string;
    github_app_private_key?: string;
    github_app_webhook_secret?: string;
  }) =>
    request<AuthProvidersStatus>("/auth/oauth-config", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  register: (payload: { email: string; password: string; full_name?: string }) =>
    request<{ access_token: string; csrf_token?: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    request<{ access_token: string; csrf_token?: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getMe: () => request<User>("/auth/me"),

  updateProfile: (payload: {
    full_name?: string;
    avatar_url?: string;
    current_password?: string;
    new_password?: string;
  }) =>
    request<User>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  updateOnboarding: (payload: {
    completed_step?: string;
    completed?: string[];
    dismissed?: boolean;
  }) =>
    request<User>("/auth/onboarding", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  logout: () =>
    request<{ message: string }>("/auth/logout", {
      method: "POST",
    }),

  getIdentities: () => request<IdentityAccount[]>("/auth/identities"),

  unlinkIdentity: (provider: "google" | "github" | string) =>
    request<{ message: string }>(`/auth/identities/${provider}`, {
      method: "DELETE",
    }),

  getSessions: () => request<UserSession[]>("/auth/sessions"),

  revokeSession: (sessionId: string) =>
    request<{ message: string }>(`/auth/sessions/${sessionId}`, {
      method: "DELETE",
    }),

  revokeOtherSessions: () =>
    request<{ message: string; revoked_count: number }>("/auth/sessions/revoke-others", {
      method: "POST",
    }),

  // Projects
  getProjects: () => request<Project[]>("/projects"),

  getProject: (projectId: string) => request<Project>(`/projects/${projectId}`),

  createProject: (payload: {
    name: string;
    description?: string;
    git_repo_url?: string;
    tech_stack?: string[];
  }) =>
    request<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deleteProject: (projectId: string) =>
    request<{ message: string }>(`/projects/${projectId}`, {
      method: "DELETE",
    }),

  // GitHub Integration & GitHub App
  getGitHubStatus: () => request<GitHubConnectionStatus>("/github/status"),

  getGitHubAppConfig: () => request<GitHubAppConfig>("/github/app/config"),

  createGitHubAppInstallUrl: (nextPath: string = "/github") =>
    request<{
      install_url: string;
      state: string;
      app_name: string;
      requested_permissions: Record<string, string>;
    }>(`/github/app/install-url?next_path=${encodeURIComponent(nextPath)}`, {
      method: "POST",
    }),

  getGitHubInstallations: () => request<GitHubInstallation[]>("/github/app/installations"),

  syncGitHubInstallation: (installationRecordId: string) =>
    request<GitHubInstallation>(`/github/app/installations/${installationRecordId}/sync`, {
      method: "POST",
    }),

  syncAllGitHubInstallations: () =>
    request<{
      success: boolean;
      message: string;
      installations: GitHubInstallation[];
    }>("/github/app/sync-all", {
      method: "POST",
    }),

  disconnectGitHubInstallation: (installationRecordId: string) =>
    request<{ message: string }>(`/github/app/installations/${installationRecordId}`, {
      method: "DELETE",
    }),

  connectGitHubPAT: (payload: { personal_access_token: string }) =>
    request<GitHubConnectionStatus>("/github/connect-pat", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  disconnectGitHub: () =>
    request<{ message: string }>("/github/disconnect", {
      method: "POST",
    }),

  getGitHubRepos: (params?: { q?: string; installation_id?: number }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.installation_id) qs.set("installation_id", String(params.installation_id));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<GitHubRepoSummary[]>(`/github/repos${suffix}`);
  },

  selectRepo: (payload: {
    project_id: string;
    full_name: string;
    clone_url?: string;
    default_branch?: string;
    installation_id?: number;
  }) =>
    request<RepoAnalysis>("/github/select-repo", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getRepoAnalysis: (projectId: string, repo?: string) => {
    const qs = repo ? `?repo=${encodeURIComponent(repo)}` : "";
    return request<RepoAnalysis>(`/github/analysis/${projectId}${qs}`);
  },

  getGitHubWebhookConfig: () =>
    request<GitHubWebhookConfig>("/github/webhook/config"),

  sendTestGitHubWebhook: (payload: {
    event?: "ping" | "push" | "pull_request";
    repository_full_name?: string;
  }) =>
    request<{
      status: string;
      event: string;
      delivery_id: string;
      description?: string;
    }>("/github/webhook/test", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Repository Code Explorer & Working Tree (VS Code IDE)
  getProjectFileTree: (projectId: string, branch?: string, repo?: string) => {
    const params = new URLSearchParams();
    if (branch) params.set("branch", branch);
    if (repo) params.set("repo", repo);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<ProjectFileTreeResponse>(`/github/tree/${projectId}${qs}`);
  },

  getFileContent: (
    projectId: string,
    filePath: string,
    branch?: string,
    repo?: string
  ) => {
    const params = new URLSearchParams({ projectId, filePath });
    if (branch) params.set("branch", branch);
    if (repo) params.set("repo", repo);
    return request<ProjectFileContentResponse>(
      `/github/file-content?${params.toString()}`
    );
  },

  saveFile: (payload: {
    projectId: string;
    filePath: string;
    content: string;
    branch?: string;
    repo?: string;
  }) =>
    request<{
      success: boolean;
      filePath: string;
      status: string;
      modified_at: string;
      total_changes: number;
    }>("/github/save-file", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getWorkingTreeChanges: (projectId: string, repo?: string) => {
    const qs = repo ? `?repo=${encodeURIComponent(repo)}` : "";
    return request<WorkingChangesResponse>(`/github/changes/${projectId}${qs}`);
  },

  commitWorkingTreeChanges: (payload: {
    projectId: string;
    message: string;
    branch?: string;
    repo?: string;
  }) =>
    request<{
      success: boolean;
      commit_sha: string;
      message: string;
      files_committed: number;
      committed_at: string;
    }>("/github/commit", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  discardWorkingTreeChanges: (payload: {
    projectId: string;
    filePath?: string;
    repo?: string;
  }) =>
    request<{ success: boolean; remaining_changes: number }>(
      "/github/discard-changes",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),

  chatWithCodeAgent: (payload: AIAgentChatPayload) =>
    request<AIAgentChatResponse>("/github/ai-agent/chat", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // AI Providers
  getProviders: (projectId?: string) =>
    request<AIProviderConfig[]>(
      `/providers${projectId ? `?project_id=${projectId}` : ""}`
    ),

  createProvider: (payload: {
    project_id?: string;
    provider_name: string;
    base_url: string;
    api_key: string;
    model_name: string;
    temperature?: number;
    max_output_tokens?: number;
  }) =>
    request<AIProviderConfig>("/providers", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  validateProvider: (payload: {
    config_id?: string;
    base_url?: string;
    api_key?: string;
    model_name?: string;
  }) =>
    request<{
      success: boolean;
      latency_ms: number;
      message: string;
      models_available: string[];
    }>("/providers/validate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deleteProvider: (configId: string) =>
    request<{ message: string }>(`/providers/${configId}`, {
      method: "DELETE",
    }),

  // Agent Tasks
  createTask: (payload: {
    project_id?: string;
    repo_full_name?: string;
    title: string;
    description: string;
    priority?: string;
    target_branch?: string;
  }) =>
    request<AgentTask>("/agent/tasks", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getTasks: (projectId: string) =>
    request<AgentTask[]>(`/agent/tasks?project_id=${projectId}`),

  getTaskDetail: (taskId: string) =>
    request<AgentTask>(`/agent/tasks/${taskId}`),

  generatePlan: (taskId: string) =>
    request<{
      task_id: string;
      status: string;
      plan: StructuredPlan;
      approval_id: string;
    }>(`/agent/tasks/${taskId}/plan`, {
      method: "POST",
    }),

  approvePlan: (
    taskId: string,
    payload: { decision: "approved" | "rejected"; feedback?: string }
  ) =>
    request<{ status: string; message: string }>(
      `/agent/tasks/${taskId}/approve`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),

  getTaskDiff: (taskId: string) =>
    request<{
      has_changes: boolean;
      unified_diff: string;
      changed_files: any[];
    }>(`/agent/tasks/${taskId}/diff`),

  preparePR: (
    taskId: string,
    payload: {
      title: string;
      body: string;
      head_branch?: string;
      base_branch?: string;
    }
  ) =>
    request<{
      success: boolean;
      pr_number: number;
      pr_url: string;
      branch: string;
    }>(`/agent/tasks/${taskId}/prepare-pr`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Engineering Memory
  getMemories: (projectId: string, category?: string) =>
    request<MemoryRecord[]>(
      `/memory?project_id=${projectId}${category ? `&category=${category}` : ""}`
    ),

  createMemory: (payload: {
    project_id: string;
    category: string;
    title: string;
    content: string;
    summary?: string;
    tags?: string[];
  }) =>
    request<MemoryRecord>("/memory", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  searchMemories: (payload: {
    project_id: string;
    query: string;
    category?: string;
    limit?: number;
  }) =>
    request<MemoryRecord[]>("/memory/search", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deleteMemory: (memoryId: string) =>
    request<{ message: string }>(`/memory/${memoryId}`, {
      method: "DELETE",
    }),

  // Activity Logs
  getActivityLogs: (projectId?: string) =>
    request<ActivityLog[]>(
      `/activity/logs${projectId ? `?project_id=${projectId}` : ""}`
    ),

  // Model Factory & Fine-Tuning Studio
  getModelFactoryStatus: () => request<any>("/model-factory/status"),
  getModelFactoryOverview: (projectId?: string) =>
    request<ModelFactoryOverview>(`/model-factory/overview${projectId ? `?project_id=${projectId}` : ""}`),
  getModelDatasets: (projectId?: string) =>
    request<ModelDataset[]>(`/model-factory/datasets${projectId ? `?project_id=${projectId}` : ""}`),
  getModelDataset: (id: string) => request<ModelDataset>(`/model-factory/datasets/${id}`),
  createModelDataset: (payload: {
    project_id?: string;
    name: string;
    description?: string;
    format?: "alpaca" | "sharegpt" | "jsonl";
    source?: "repo_commits" | "ast_extraction" | "synthetic" | "uploaded";
    samples?: any[];
  }) =>
    request<ModelDataset>("/model-factory/datasets", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  extractDatasetFromRepo: (payload: { project_id?: string; name?: string; description?: string }) =>
    request<ModelDataset>("/model-factory/datasets/extract-from-repo", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteModelDataset: (id: string) =>
    request<{ success: boolean }>(`/model-factory/datasets/${id}`, { method: "DELETE" }),

  getTrainingJobs: (projectId?: string) =>
    request<ModelTrainingJob[]>(`/model-factory/jobs${projectId ? `?project_id=${projectId}` : ""}`),
  getTrainingJob: (id: string) => request<ModelTrainingJob>(`/model-factory/jobs/${id}`),
  createTrainingJob: (payload: {
    project_id?: string;
    dataset_id: string;
    name?: string;
    base_model?: string;
    fine_tuning_method?: "qlora" | "lora" | "full_sft" | "dpo";
    epochs?: number;
    learning_rate?: number;
    batch_size?: number;
    lora_r?: number;
    lora_alpha?: number;
    target_modules?: string[];
  }) =>
    request<ModelTrainingJob>("/model-factory/jobs", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  cancelTrainingJob: (id: string) =>
    request<ModelTrainingJob>(`/model-factory/jobs/${id}/cancel`, { method: "POST" }),
  deployTrainingJob: (id: string) =>
    request<{ checkpoint: ModelCheckpoint; provider_id: string }>(`/model-factory/jobs/${id}/deploy`, {
      method: "POST",
    }),
  getTrainingJobExportScript: (id: string) =>
    request<{ script: string; filename: string }>(`/model-factory/jobs/${id}/export-script`),

  getTrainedModels: (projectId?: string) =>
    request<ModelCheckpoint[]>(`/model-factory/models${projectId ? `?project_id=${projectId}` : ""}`),
  deployTrainedModel: (id: string) =>
    request<{ checkpoint: ModelCheckpoint; provider_id: string }>(`/model-factory/models/${id}/deploy`, {
      method: "POST",
    }),

  // Admin Endpoints (System Administration & Telemetry)
  getAdminOverview: () => request<AdminOverview>("/admin/overview"),
  getAdminUsers: () => request<AdminUser[]>("/admin/users"),
  createAdminUser: (payload: {
    email: string;
    password: string;
    full_name?: string;
    role?: "admin" | "engineer";
    is_active?: boolean;
  }) =>
    request<AdminUser>("/admin/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAdminUser: (
    userId: string,
    payload: {
      role?: "admin" | "engineer";
      is_active?: boolean;
      full_name?: string;
      new_password?: string;
    }
  ) =>
    request<any>(`/admin/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteAdminUser: (userId: string) =>
    request<{ message: string }>(`/admin/users/${userId}`, {
      method: "DELETE",
    }),
  getAdminSessions: () => request<AdminSession[]>("/admin/sessions"),
  revokeAdminSession: (sessionId: string) =>
    request<{ message: string }>(`/admin/sessions/${sessionId}`, {
      method: "DELETE",
    }),
  getAdminAuditLogs: (params?: { limit?: number; action_type?: string }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.action_type) q.set("action_type", params.action_type);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return request<AdminAuditLog[]>(`/admin/audit-logs${qs}`);
  },

  // Notification endpoints
  getNotifications: (unreadOnly?: boolean) => {
    const qs = unreadOnly ? "?unread_only=true" : "";
    return request<NotificationResponse>(`/activity/notifications${qs}`);
  },
  markNotificationRead: (notificationId: string) =>
    request<{ message: string; notification: AppNotification }>(
      `/activity/notifications/${notificationId}/read`,
      { method: "PATCH" }
    ),
  markAllNotificationsRead: () =>
    request<{ message: string; count: number }>(`/activity/notifications/read-all`, {
      method: "PATCH",
    }),
  clearNotifications: () =>
    request<{ message: string; deleted_count: number }>(`/activity/notifications/clear`, {
      method: "DELETE",
    }),
  createNotification: (payload: {
    title: string;
    message: string;
    type?: string;
    link_url?: string;
  }) =>
    request<AppNotification>(`/activity/notifications`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
