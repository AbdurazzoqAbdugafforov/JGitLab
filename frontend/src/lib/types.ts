export interface IdentityAccount {
  id: string;
  provider: "google" | "github" | string;
  provider_subject: string;
  email?: string | null;
  email_verified: boolean;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  last_login_at?: string | null;
  created_at: string;
}

export interface UserSession {
  id: string;
  auth_method?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  last_seen_at?: string | null;
  expires_at: string;
  is_current: boolean;
}

export interface OnboardingState {
  completed: string[];
  dismissed?: boolean;
}

export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  email_verified?: boolean;
  has_password?: boolean;
  role: string;
  is_active: boolean;
  is_superuser: boolean;
  is_admin_email?: boolean;
  onboarding?: OnboardingState | null;
  identities?: IdentityAccount[];
  created_at: string;
}

export interface AuthProvidersStatus {
  google_enabled: boolean;
  github_enabled: boolean;
  email_enabled: boolean;
  github_app_enabled: boolean;
  github_app_name?: string | null;
}

export interface Project {
  id: string;
  organization_id?: string | null;
  created_by_id?: string | null;
  name: string;
  description?: string | null;
  git_repo_url?: string | null;
  default_branch: string;
  tech_stack: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  task_count?: number;
  memory_count?: number;
  has_active_provider?: boolean;
  has_connected_repo?: boolean;
}

export interface GitHubInstallation {
  id: string;
  installation_id?: number | null;
  account_login?: string | null;
  account_type?: "User" | "Organization" | string | null;
  account_avatar_url?: string | null;
  repository_selection: "all" | "selected" | string;
  repository_count: number;
  permissions: Record<string, string>;
  status: "active" | "pending_approval" | "suspended" | "revoked" | "error" | string;
  status_message?: string | null;
  last_synced_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GitHubConnectionStatus {
  is_connected: boolean;
  connection_mode: "github_app" | "pat" | "none" | string;
  github_username?: string | null;
  avatar_url?: string | null;
  token_type?: string | null;
  updated_at?: string | null;
  app_configured?: boolean;
  app_name?: string | null;
  installation_id?: number | null;
  repository_count?: number;
  installations?: GitHubInstallation[];
}

export interface GitHubAppConfig {
  configured: boolean;
  app_name?: string | null;
  install_url?: string | null;
  requested_permissions: Record<string, string>;
}

export interface WebhookDeliverySummary {
  id: string;
  event: string;
  action?: string | null;
  delivery_id?: string | null;
  repository?: string | null;
  sender?: string | null;
  description: string;
  created_at: string;
}

export interface GitHubWebhookConfig {
  webhook_url: string;
  secret_configured: boolean;
  supported_events: string[];
  recent_deliveries: WebhookDeliverySummary[];
}

export interface GitHubRepoSummary {
  id: number;
  name: string;
  full_name: string;
  owner: string;
  html_url: string;
  clone_url: string;
  default_branch: string;
  description?: string | null;
  language?: string | null;
  is_private: boolean;
  updated_at?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  pushed_at?: string | null;
}

export interface RepoAnalysis {
  id: string;
  project_id: string;
  installation_id?: number | null;
  full_name: string;
  default_branch: string;
  languages: Record<string, number>;
  frameworks: string[];
  dependencies: Record<string, string[]>;
  file_tree_summary: {
    directories?: string[];
    important_files?: string[];
  };
  analysis_summary: {
    primary_language?: string;
    framework_count?: number;
    dependency_count?: number;
    is_monorepo?: boolean;
  };
  last_analyzed_at?: string | null;
}

export interface AIProviderConfig {
  id: string;
  project_id?: string | null;
  provider_name: string;
  base_url: string;
  api_key_masked: string;
  model_name: string;
  embedding_model_name?: string | null;
  temperature: number;
  max_output_tokens: number;
  timeout_seconds: number;
  max_retries: number;
  is_active: boolean;
  validation_status: "untested" | "success" | "error";
  validation_message?: string | null;
  last_validated_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanStepItem {
  step_number: number;
  title: string;
  description: string;
  tools: string[];
}

export interface PlanFileTarget {
  path: string;
  action: "read" | "create" | "edit" | "delete";
  reason: string;
}

export interface StructuredPlan {
  task_summary: string;
  existing_architecture_analysis: string;
  files_to_inspect: string[];
  files_likely_to_change: PlanFileTarget[];
  proposed_implementation_steps: PlanStepItem[];
  potential_risks: string[];
  dependencies: string[];
  testing_strategy: string;
  risk_level?: "low" | "medium" | "high" | string;
  steps?: Array<{ step_index?: number; title: string; description?: string }>;
}

export interface AgentTaskStep {
  id: string;
  step_index: number;
  step_type: string;
  title: string;
  description?: string | null;
  tool_name?: string | null;
  tool_input?: any;
  tool_output?: any;
  status: "pending" | "executing" | "completed" | "failed" | "skipped";
  error_message?: string | null;
  latency_ms: number;
  tokens_used: number;
  created_at: string;
}

export interface AgentApproval {
  id: string;
  task_id: string;
  step_index: number;
  approval_type: string;
  action_summary: string;
  payload?: any;
  status: "pending" | "approved" | "rejected";
  decided_by?: string | null;
  decided_at?: string | null;
  feedback?: string | null;
  created_at: string;
}

export interface ExecutionLog {
  id: string;
  level: "info" | "debug" | "warning" | "error";
  message: string;
  metadata_json?: any;
  created_at: string;
}

export interface AgentTask {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description: string;
  status: "pending" | "planning" | "awaiting_approval" | "running" | "testing" | "completed" | "failed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  target_branch: string;
  created_branch?: string | null;
  pr_number?: number | null;
  pr_url?: string | null;
  plan_json?: StructuredPlan | null;
  diff_summary?: string | null;
  test_results_json?: any;
  failure_analysis?: string | null;
  total_tokens_used: number;
  estimated_cost: number;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  steps?: AgentTaskStep[];
  approvals?: AgentApproval[];
  logs?: ExecutionLog[];
}

export interface MemoryRecord {
  id: string;
  project_id: string;
  category: "architecture" | "tech_stack" | "adr" | "bug_fix" | "task_learning";
  title: string;
  content: string;
  summary?: string | null;
  tags: string[];
  source_task_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  project_id?: string | null;
  user_id?: string | null;
  action_type: string;
  entity_type: string;
  entity_id?: string | null;
  description: string;
  metadata_json?: any;
  created_at: string;
}

export interface AdminOverview {
  status: string;
  environment: string;
  server_time: string;
  uptime_seconds: number;
  node_version: string;
  platform: string;
  memory: {
    heap_used_mb: number;
    heap_total_mb: number;
    rss_mb: number;
  };
  stats: {
    total_users: number;
    active_users: number;
    admin_users: number;
    engineer_users: number;
    active_sessions: number;
    total_projects: number;
    total_tasks: number;
    completed_tasks: number;
    in_progress_tasks: number;
    failed_tasks: number;
    total_memories: number;
    activity_logs_count: number;
  };
  security: {
    csrf_protection: boolean;
    rate_limiting: boolean;
    double_submit_cookies: boolean;
    sandbox_timeout_seconds: number;
    google_oauth_configured: boolean;
    github_oauth_configured: boolean;
    github_app_configured: boolean;
  };
}

export interface AdminUser {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  role: string;
  is_active: boolean;
  is_superuser: boolean;
  is_admin_email?: boolean;
  email_verified: boolean;
  has_password: boolean;
  created_at: string;
  updated_at: string;
  active_sessions_count: number;
  linked_providers: Array<{ provider: string; username?: string | null; email?: string | null }>;
}

export interface AdminSession {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  user_role: string;
  auth_method: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  expires_at: string;
  last_seen_at?: string | null;
}

export interface AdminAuditLog extends ActivityLog {
  user_email?: string | null;
  user_name?: string | null;
  user_role?: string | null;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "task";
  is_read: boolean;
  link_url?: string | null;
  created_at: string;
}

export interface NotificationResponse {
  notifications: AppNotification[];
  unread_count: number;
}

export interface DatasetSample {
  instruction: string;
  input?: string;
  output: string;
}

export interface ModelDataset {
  id: string;
  project_id?: string | null;
  name: string;
  description: string;
  format: "alpaca" | "sharegpt" | "jsonl";
  source: "repo_commits" | "ast_extraction" | "synthetic" | "uploaded";
  sample_count: number;
  token_count: number;
  size_bytes: number;
  samples: DatasetSample[];
  created_at: string;
  updated_at: string;
}

export interface TrainingLossPoint {
  step: number;
  epoch: number;
  loss: number;
  val_loss?: number;
  learning_rate: number;
}

export interface ModelTrainingJob {
  id: string;
  project_id?: string | null;
  dataset_id: string;
  dataset_name: string;
  name: string;
  base_model: string;
  fine_tuning_method: "qlora" | "lora" | "full_sft" | "dpo";
  status: "queued" | "training" | "completed" | "failed" | "cancelled";
  hyperparameters: {
    epochs: number;
    learning_rate: number;
    batch_size: number;
    gradient_accumulation_steps: number;
    lora_r: number;
    lora_alpha: number;
    lora_dropout: number;
    target_modules: string[];
    warmup_ratio: number;
    weight_decay: number;
    optimizer: string;
    precision: string;
  };
  progress: {
    current_epoch: number;
    total_epochs: number;
    current_step: number;
    total_steps: number;
    percent: number;
    current_loss: number;
    val_loss: number;
    elapsed_seconds: number;
    eta_seconds: number;
    gpu_memory_used_mb: number;
    gpu_memory_total_mb: number;
  };
  loss_history: TrainingLossPoint[];
  logs: Array<{ timestamp: string; level: "info" | "warn" | "error" | "step"; message: string }>;
  output_checkpoint_id?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export interface ModelCheckpoint {
  id: string;
  job_id?: string | null;
  project_id?: string | null;
  name: string;
  base_model: string;
  method: string;
  format: "safetensors" | "gguf" | "ollama";
  adapter_size_mb: number;
  eval_pass_rate: number;
  is_deployed: boolean;
  deployment_url?: string | null;
  created_at: string;
}

export interface ModelFactoryOverview {
  compute_cluster: {
    cluster_name: string;
    device: string;
    vram_total_gb: number;
    vram_used_gb: number;
    utilization_percent: number;
    backend_framework: string;
    flash_attention_2: boolean;
  };
  stats: {
    total_datasets: number;
    total_samples: number;
    total_training_runs: number;
    active_runs: number;
    completed_runs: number;
    trained_models: number;
    deployed_models: number;
  };
  active_job?: ModelTrainingJob | null;
  recent_checkpoints: ModelCheckpoint[];
}

export interface ProjectFileTreeItem {
  path: string;
  type: "blob" | "tree";
  size: number;
  sha?: string;
  mode?: string;
}

export interface ProjectFileTreeResponse {
  source: "github" | "workspace";
  repo_full_name: string;
  branch: string;
  is_empty?: boolean;
  tree: ProjectFileTreeItem[];
}

export interface ProjectFileContentResponse {
  path: string;
  content: string;
  branch: string;
  source: "github" | "workspace" | "working_tree";
  is_modified: boolean;
  modified_at?: string;
}

export interface GitWorkingChange {
  path: string;
  status: "M" | "A" | "D";
  modified_at: string;
  originalContent: string;
  content: string;
  diff: string;
}

export interface WorkingChangesResponse {
  projectId: string;
  total_changes: number;
  changes: GitWorkingChange[];
}

export interface AIAgentChatPayload {
  projectId: string;
  filePath?: string;
  fileContent?: string;
  prompt: string;
  mode?: "explain" | "review" | "refactor" | "tests" | "commit" | "custom";
  branch?: string;
  selection?: string;
  repo?: string;
}

export interface AIAgentChatResponse {
  response: string;
  suggestedCode: string | null;
  diff: string;
  model: string;
  tokens: number;
  latency_ms: number;
  file_path: string;
}

export const ADMIN_WHITELIST_EMAILS = [
  "abdurazzoqabdugafforov54@gmail.com",
  "admin@jgitlab.local",
];

export function isUserAdminEmail(user?: User | null): boolean {
  if (!user?.email) return false;
  if (typeof user.is_admin_email === "boolean") return user.is_admin_email;
  const email = user.email.toLowerCase().trim();
  return ADMIN_WHITELIST_EMAILS.includes(email) || Boolean(user.is_superuser);
}
