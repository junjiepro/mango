export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          message_id: string
          metadata: Json | null
          processed_at: string | null
          status: string | null
          storage_bucket: string | null
          storage_path: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size: number
          file_type: string
          id?: string
          message_id: string
          metadata?: Json | null
          processed_at?: string | null
          status?: string | null
          storage_bucket?: string | null
          storage_path: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          message_id?: string
          metadata?: Json | null
          processed_at?: string | null
          status?: string | null
          storage_bucket?: string | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_message_id_fkey"
            columns: ["message_id"]
            referencedRelation: "messages"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string | null
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          archived_at: string | null
          context: Json | null
          created_at: string | null
          description: string | null
          id: string
          last_message_at: string | null
          metadata: Json | null
          stats: Json | null
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          context?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json | null
          stats?: Json | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          context?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json | null
          stats?: Json | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      feedback_records: {
        Row: {
          conversation_id: string
          created_at: string | null
          deleted_at: string | null
          feedback_type: string
          id: string
          message_id: string | null
          metadata: Json | null
          rating: number | null
          reason: string | null
          tags: string[] | null
          task_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          deleted_at?: string | null
          feedback_type: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
          rating?: number | null
          reason?: string | null
          tags?: string[] | null
          task_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          deleted_at?: string | null
          feedback_type?: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
          rating?: number | null
          reason?: string | null
          tags?: string[] | null
          task_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_records_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_records_message_id_fkey"
            columns: ["message_id"]
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_records_task_id_fkey"
            columns: ["task_id"]
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_records_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      learning_record_feedback_links: {
        Row: {
          created_at: string | null
          feedback_record_id: string
          learning_record_id: string
        }
        Insert: {
          created_at?: string | null
          feedback_record_id: string
          learning_record_id: string
        }
        Update: {
          created_at?: string | null
          feedback_record_id?: string
          learning_record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_record_feedback_links_feedback_record_id_fkey"
            columns: ["feedback_record_id"]
            referencedRelation: "feedback_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_record_feedback_links_learning_record_id_fkey"
            columns: ["learning_record_id"]
            referencedRelation: "learning_records"
            referencedColumns: ["id"]
          }
        ]
      }
      learning_records: {
        Row: {
          application_count: number | null
          confidence: number | null
          conversation_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_applied_at: string | null
          record_type: string
          rule_content: Json
          success_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          application_count?: number | null
          confidence?: number | null
          conversation_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_applied_at?: string | null
          record_type: string
          rule_content: Json
          success_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          application_count?: number | null
          confidence?: number | null
          conversation_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_applied_at?: string | null
          record_type?: string
          rule_content?: Json
          success_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_records_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_records_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          agent_metadata: Json | null
          attachments: Json | null
          content: string
          content_type: string | null
          conversation_id: string
          created_at: string | null
          deleted_at: string | null
          edited_at: string | null
          id: string
          metadata: Json | null
          reply_to_message_id: string | null
          sender_id: string | null
          sender_type: string
          sequence_number: number
          status: string | null
          updated_at: string | null
        }
        Insert: {
          agent_metadata?: Json | null
          attachments?: Json | null
          content: string
          content_type?: string | null
          conversation_id: string
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          metadata?: Json | null
          reply_to_message_id?: string | null
          sender_id?: string | null
          sender_type: string
          sequence_number: number
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_metadata?: Json | null
          attachments?: Json | null
          content?: string
          content_type?: string | null
          conversation_id?: string
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          metadata?: Json | null
          reply_to_message_id?: string | null
          sender_id?: string | null
          sender_type?: string
          sequence_number?: number
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            referencedRelation: "messages"
            referencedColumns: ["id"]
          }
        ]
      }
      mini_app_data: {
        Row: {
          accessed_at: string | null
          created_at: string | null
          id: string
          installation_id: string
          key: string
          metadata: Json | null
          updated_at: string | null
          value: Json
          value_type: string | null
        }
        Insert: {
          accessed_at?: string | null
          created_at?: string | null
          id?: string
          installation_id: string
          key: string
          metadata?: Json | null
          updated_at?: string | null
          value: Json
          value_type?: string | null
        }
        Update: {
          accessed_at?: string | null
          created_at?: string | null
          id?: string
          installation_id?: string
          key?: string
          metadata?: Json | null
          updated_at?: string | null
          value?: Json
          value_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mini_app_data_installation_id_fkey"
            columns: ["installation_id"]
            referencedRelation: "mini_app_installations"
            referencedColumns: ["id"]
          }
        ]
      }
      mini_app_installations: {
        Row: {
          created_at: string | null
          custom_name: string | null
          granted_permissions: string[] | null
          id: string
          installed_version: string
          mini_app_id: string
          stats: Json | null
          status: string | null
          uninstalled_at: string | null
          updated_at: string | null
          user_config: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          custom_name?: string | null
          granted_permissions?: string[] | null
          id?: string
          installed_version: string
          mini_app_id: string
          stats?: Json | null
          status?: string | null
          uninstalled_at?: string | null
          updated_at?: string | null
          user_config?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          custom_name?: string | null
          granted_permissions?: string[] | null
          id?: string
          installed_version?: string
          mini_app_id?: string
          stats?: Json | null
          status?: string | null
          uninstalled_at?: string | null
          updated_at?: string | null
          user_config?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mini_app_installations_mini_app_id_fkey"
            columns: ["mini_app_id"]
            referencedRelation: "mini_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mini_app_installations_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      mini_apps: {
        Row: {
          code: string
          code_hash: string | null
          created_at: string | null
          creator_id: string
          description: string
          display_name: string
          icon_url: string | null
          id: string
          is_public: boolean | null
          is_shareable: boolean | null
          manifest: Json
          metadata: Json | null
          name: string
          published_at: string | null
          runtime_config: Json | null
          security_review: Json | null
          stats: Json | null
          status: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          code: string
          code_hash?: string | null
          created_at?: string | null
          creator_id: string
          description: string
          display_name: string
          icon_url?: string | null
          id?: string
          is_public?: boolean | null
          is_shareable?: boolean | null
          manifest?: Json
          metadata?: Json | null
          name: string
          published_at?: string | null
          runtime_config?: Json | null
          security_review?: Json | null
          stats?: Json | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          code_hash?: string | null
          created_at?: string | null
          creator_id?: string
          description?: string
          display_name?: string
          icon_url?: string | null
          id?: string
          is_public?: boolean | null
          is_shareable?: boolean | null
          manifest?: Json
          metadata?: Json | null
          name?: string
          published_at?: string | null
          runtime_config?: Json | null
          security_review?: Json | null
          stats?: Json | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mini_apps_creator_id_fkey"
            columns: ["creator_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string
          category: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          priority: string | null
          read_at: string | null
          source_id: string | null
          source_type: string
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body: string
          category?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          read_at?: string | null
          source_id?: string | null
          source_type: string
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string
          category?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          read_at?: string | null
          source_id?: string | null
          source_type?: string
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      tasks: {
        Row: {
          agent_config: Json | null
          completed_at: string | null
          conversation_id: string
          created_at: string | null
          description: string | null
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          metrics: Json | null
          progress: number | null
          result: Json | null
          started_at: string | null
          status: string | null
          task_type: string
          title: string
          tool_calls: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_config?: Json | null
          completed_at?: string | null
          conversation_id: string
          created_at?: string | null
          description?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          metrics?: Json | null
          progress?: number | null
          result?: Json | null
          started_at?: string | null
          status?: string | null
          task_type: string
          title: string
          tool_calls?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_config?: Json | null
          completed_at?: string | null
          conversation_id?: string
          created_at?: string | null
          description?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          metrics?: Json | null
          progress?: number | null
          result?: Json | null
          started_at?: string | null
          status?: string | null
          task_type?: string
          title?: string
          tool_calls?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_message_id_fkey"
            columns: ["message_id"]
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      tools: {
        Row: {
          category: string | null
          config: Json
          created_at: string | null
          description: string
          display_name: string
          id: string
          is_public: boolean | null
          metadata: Json | null
          name: string
          owner_id: string | null
          protocol: string
          required_permissions: string[] | null
          stats: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          config?: Json
          created_at?: string | null
          description: string
          display_name: string
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          name: string
          owner_id?: string | null
          protocol: string
          required_permissions?: string[] | null
          stats?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          config?: Json
          created_at?: string | null
          description?: string
          display_name?: string
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          name?: string
          owner_id?: string | null
          protocol?: string
          required_permissions?: string[] | null
          stats?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tools_owner_id_fkey"
            columns: ["owner_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string
          last_active_at: string | null
          preferences: Json | null
          quota: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          last_active_at?: string | null
          preferences?: Json | null
          quota?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          last_active_at?: string | null
          preferences?: Json | null
          quota?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      expire_old_notifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          public: boolean | null
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buckets_owner_fkey"
            columns: ["owner"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          path_tokens: string[] | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_insert_object: {
        Args: {
          bucketid: string
          name: string
          owner: string
          metadata: Json
        }
        Returns: undefined
      }
      extension: {
        Args: {
          name: string
        }
        Returns: string
      }
      filename: {
        Args: {
          name: string
        }
        Returns: string
      }
      foldername: {
        Args: {
          name: string
        }
        Returns: unknown
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          size: number
          bucket_id: string
        }[]
      }
      search: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

