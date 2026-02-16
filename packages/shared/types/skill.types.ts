/**
 * Skill 类型定义 - v3 架构
 */

// Skill 分类
export type SkillCategory = 'edge' | 'remote' | 'device';

// Skill 类型
export type SkillType = 'system' | 'user' | 'miniapp' | 'extension';

// 内容引用类型
export interface EdgeContentRef {
  path: string; // e.g., "skills/a2ui-skill.md"
}

export interface RemoteContentRef {
  table: string;
  id: string;
}

export interface DeviceContentRef {
  device_id: string;
  path: string;
}

export type ContentRef = EdgeContentRef | RemoteContentRef | DeviceContentRef;

// Skill 元数据
export interface SkillMetadata {
  id: string;
  skill_id: string;
  name: string;
  description?: string;
  version: string;
  category: SkillCategory;
  skill_type?: SkillType;
  content_ref: ContentRef;
  trigger_keywords: string[];
  trigger_patterns: string[];
  dependencies: string[];
  conflicts: string[];
  priority: number;
  tags: string[];
  content_hash?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Skill 内容缓存
export interface SkillContentCache {
  id: string;
  skill_id: string;
  content: string;
  content_hash: string;
  cached_at: string;
  expires_at: string;
  hit_count: number;
}

// Skill 版本
export interface SkillVersion {
  id: string;
  skill_id: string;
  version: string;
  content_snapshot: string;
  content_hash: string;
  change_summary?: string;
  changed_by?: string;
  created_at: string;
}

// Skill 执行日志
export interface SkillExecutionLog {
  id: string;
  skill_id: string;
  user_id?: string;
  execution_time_ms?: number;
  success: boolean;
  error_message?: string;
  conversation_id?: string;
  task_id?: string;
  executed_at: string;
}

// 设备 Skill 同步状态
export interface DeviceSkillSync {
  id: string;
  device_binding_id: string;
  skill_id: string;
  last_sync_at: string;
  content_hash?: string;
  cached_content?: string;
}

// Skill 搜索结果
export interface SkillSearchResult {
  skill: SkillMetadata;
  similarity: number;
}

// Skill Manifest (构建时生成)
export interface SkillManifest {
  version: string;
  generated_at: string;
  skills: SkillManifestEntry[];
}

export interface SkillManifestEntry {
  skill_id: string;
  name: string;
  category: SkillCategory;
  path: string;
  content_hash: string;
}
