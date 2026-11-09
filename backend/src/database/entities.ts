export interface UserEntity {
  id: string;
  email: string;
  hashed_password: string | null;
  full_name: string | null;
  avatar_url: string | null;
  email_verified: boolean;
  role: string;
  is_active: boolean;
  is_superuser: boolean;
  onboarding: {
    completed: string[];
    dismissed?: boolean;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface SessionEntity {
  id: string;
  user_id: string;
  token_hash: string;
  auth_method: string | null;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface IdentityAccountEntity {
  id: string;
  user_id: string;
  provider: string;
  provider_subject: string;
  email: string | null;
  email_verified: boolean;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  last_login_at: string | null;
  created_at: string;
}

export interface OrganizationEntity {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_personal: boolean;
  created_at: string;
}

export interface OrganizationMemberEntity {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export interface ProjectEntity {
  id: string;
  organization_id: string | null;
  created_by_id: string | null;
  name: string;
  description: string | null;
  git_repo_url: string | null;
  default_branch: string;
  tech_stack: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GitHubConnectionEntity {
  id: string;
  user_id: string;
  access_token_enc: string;
  token_type: string;
  scope: string;
  github_username: string | null;
  github_user_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface GitHubInstallationEntity {
  id: string;
  user_id: string;
  installation_id: number | null;
  account_login: string | null;
  account_type: string | null;
  account_avatar_url: string | null;
  repository_selection: string;
  permissions: Record<string, string>;
  status: string;
  status_message: string | null;
  repository_count: number;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RepositoryEntity {
  id: string;
  project_id: string;
  installation_id: number | null;
  github_repo_id: number | null;
  full_name: string;
  owner: string;
  repo_name: string;
  clone_url: string | null;
  default_branch: string;
  local_path: string | null;
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
  last_analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIProviderConfigurationEntity {
  id: string;
  project_id: string | null;
  user_id: string;
  provider_name: string;
  base_url: string;
  api_key_enc: string;
  model_name: string;
  embedding_model_name: string | null;
  temperature: number;
  max_output_tokens: number;
  timeout_seconds: number;
  max_retries: number;
  is_active: boolean;
  last_validated_at: string | null;
  validation_status: 'untested' | 'success' | 'error' | string;
  validation_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentTaskEntity {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  target_branch: string;
  created_branch: string | null;
  pr_number: number | null;
  pr_url: string | null;
  plan_json: any | null;
  diff_summary: string | null;
  test_results_json: any | null;
  failure_analysis: string | null;
  total_tokens_used: number;
  estimated_cost: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentTaskStepEntity {
  id: string;
  task_id: string;
  step_index: number;
  step_type: string;
  title: string;
  description: string | null;
  tool_name: string | null;
  tool_input: any | null;
  tool_output: any | null;
  status: string;
  error_message: string | null;
  latency_ms: number;
  tokens_used: number;
  created_at: string;
}

export interface AgentApprovalEntity {
  id: string;
  task_id: string;
  step_index: number;
  approval_type: string;
  action_summary: string;
  payload: any | null;
  status: string;
  decided_by: string | null;
  decided_at: string | null;
  feedback: string | null;
  created_at: string;
}

export interface AgentExecutionLogEntity {
  id: string;
  task_id: string;
  level: string;
  message: string;
  metadata_json: any | null;
  created_at: string;
}

export interface MemoryRecordEntity {
  id: string;
  project_id: string;
  category: string;
  title: string;
  content: string;
  summary: string | null;
  tags: string[];
  embedding_vector: number[] | null;
  source_task_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLogEntity {
  id: string;
  project_id: string | null;
  user_id: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  metadata_json: any | null;
  ip_address: string | null;
  created_at: string;
}

export interface NotificationEntity {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link_url: string | null;
  created_at: string;
}

export interface DatasetSample {
  instruction: string;
  input?: string;
  output: string;
}

export interface ModelDatasetEntity {
  id: string;
  project_id: string | null;
  name: string;
  description: string;
  format: 'alpaca' | 'sharegpt' | 'jsonl';
  source: 'repo_commits' | 'ast_extraction' | 'synthetic' | 'uploaded';
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

export interface ModelTrainingJobEntity {
  id: string;
  project_id: string | null;
  dataset_id: string;
  dataset_name: string;
  name: string;
  base_model: string;
  fine_tuning_method: 'qlora' | 'lora' | 'full_sft' | 'dpo';
  status: 'queued' | 'training' | 'completed' | 'failed' | 'cancelled';
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
  logs: Array<{ timestamp: string; level: 'info' | 'warn' | 'error' | 'step'; message: string }>;
  output_checkpoint_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface ModelCheckpointEntity {
  id: string;
  job_id: string | null;
  project_id: string | null;
  name: string;
  base_model: string;
  method: string;
  format: 'safetensors' | 'gguf' | 'ollama';
  adapter_size_mb: number;
  eval_pass_rate: number;
  is_deployed: boolean;
  deployment_url: string | null;
  created_at: string;
}

export interface DatabaseStore {
  users: UserEntity[];
  sessions: SessionEntity[];
  identity_accounts: IdentityAccountEntity[];
  organizations: OrganizationEntity[];
  organization_members: OrganizationMemberEntity[];
  projects: ProjectEntity[];
  github_connections: GitHubConnectionEntity[];
  github_installations: GitHubInstallationEntity[];
  repositories: RepositoryEntity[];
  ai_provider_configurations: AIProviderConfigurationEntity[];
  agent_tasks: AgentTaskEntity[];
  agent_task_steps: AgentTaskStepEntity[];
  agent_approvals: AgentApprovalEntity[];
  agent_execution_logs: AgentExecutionLogEntity[];
  memory_records: MemoryRecordEntity[];
  activity_logs: ActivityLogEntity[];
  notifications: NotificationEntity[];
  model_datasets: ModelDatasetEntity[];
  model_training_jobs: ModelTrainingJobEntity[];
  model_checkpoints: ModelCheckpointEntity[];
}
