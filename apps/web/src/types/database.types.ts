export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      a2ui_components: {
        Row: {
          component_type: string;
          conversation_id: string;
          created_at: string | null;
          expires_at: string | null;
          id: string;
          interaction_data: Json | null;
          message_id: string;
          metadata: Json | null;
          schema: Json;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          component_type: string;
          conversation_id: string;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          interaction_data?: Json | null;
          message_id: string;
          metadata?: Json | null;
          schema: Json;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          component_type?: string;
          conversation_id?: string;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          interaction_data?: Json | null;
          message_id?: string;
          metadata?: Json | null;
          schema?: Json;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'a2ui_components_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'a2ui_components_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
        ];
      };
      acp_sessions: {
        Row: {
          acp_session_id: string;
          agent_args: Json | null;
          agent_command: string;
          agent_name: string;
          conversation_id: string;
          created_at: string;
          device_binding_id: string;
          env_vars: Json | null;
          id: string;
          last_active_at: string;
          session_config: Json | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          acp_session_id: string;
          agent_args?: Json | null;
          agent_command: string;
          agent_name: string;
          conversation_id: string;
          created_at?: string;
          device_binding_id: string;
          env_vars?: Json | null;
          id?: string;
          last_active_at?: string;
          session_config?: Json | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          acp_session_id?: string;
          agent_args?: Json | null;
          agent_command?: string;
          agent_name?: string;
          conversation_id?: string;
          created_at?: string;
          device_binding_id?: string;
          env_vars?: Json | null;
          id?: string;
          last_active_at?: string;
          session_config?: Json | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'acp_sessions_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'acp_sessions_device_binding_id_fkey';
            columns: ['device_binding_id'];
            isOneToOne: false;
            referencedRelation: 'device_bindings';
            referencedColumns: ['id'];
          },
        ];
      };
      attachments: {
        Row: {
          created_at: string | null;
          file_name: string;
          file_size: number;
          file_type: string;
          id: string;
          message_id: string;
          metadata: Json | null;
          processed_at: string | null;
          status: string | null;
          storage_bucket: string | null;
          storage_path: string;
        };
        Insert: {
          created_at?: string | null;
          file_name: string;
          file_size: number;
          file_type: string;
          id?: string;
          message_id: string;
          metadata?: Json | null;
          processed_at?: string | null;
          status?: string | null;
          storage_bucket?: string | null;
          storage_path: string;
        };
        Update: {
          created_at?: string | null;
          file_name?: string;
          file_size?: number;
          file_type?: string;
          id?: string;
          message_id?: string;
          metadata?: Json | null;
          processed_at?: string | null;
          status?: string | null;
          storage_bucket?: string | null;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'attachments_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_type: string | null;
          created_at: string | null;
          details: Json | null;
          id: string;
          ip_address: unknown;
          resource_id: string | null;
          resource_type: string | null;
          user_agent: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_type?: string | null;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
          ip_address?: unknown;
          resource_id?: string | null;
          resource_type?: string | null;
          user_agent?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_type?: string | null;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
          ip_address?: unknown;
          resource_id?: string | null;
          resource_type?: string | null;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          archived_at: string | null;
          context: Json | null;
          created_at: string | null;
          description: string | null;
          device_id: string | null;
          id: string;
          last_message_at: string | null;
          metadata: Json | null;
          stats: Json | null;
          status: string | null;
          title: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          archived_at?: string | null;
          context?: Json | null;
          created_at?: string | null;
          description?: string | null;
          device_id?: string | null;
          id?: string;
          last_message_at?: string | null;
          metadata?: Json | null;
          stats?: Json | null;
          status?: string | null;
          title?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          archived_at?: string | null;
          context?: Json | null;
          created_at?: string | null;
          description?: string | null;
          device_id?: string | null;
          id?: string;
          last_message_at?: string | null;
          metadata?: Json | null;
          stats?: Json | null;
          status?: string | null;
          title?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'conversations_device_id_fkey';
            columns: ['device_id'];
            isOneToOne: false;
            referencedRelation: 'device_bindings';
            referencedColumns: ['id'];
          },
        ];
      };
      device_bindings: {
        Row: {
          binding_code: string;
          binding_name: string;
          config: Json | null;
          created_at: string | null;
          device_id: string;
          device_name: string | null;
          device_url: Json | null;
          expires_at: string | null;
          hostname: string | null;
          id: string;
          last_seen_at: string | null;
          platform: string;
          status: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          binding_code: string;
          binding_name: string;
          config?: Json | null;
          created_at?: string | null;
          device_id: string;
          device_name?: string | null;
          device_url?: Json | null;
          expires_at?: string | null;
          hostname?: string | null;
          id?: string;
          last_seen_at?: string | null;
          platform: string;
          status?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          binding_code?: string;
          binding_name?: string;
          config?: Json | null;
          created_at?: string | null;
          device_id?: string;
          device_name?: string | null;
          device_url?: Json | null;
          expires_at?: string | null;
          hostname?: string | null;
          id?: string;
          last_seen_at?: string | null;
          platform?: string;
          status?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      device_skill_sync: {
        Row: {
          cached_content: string | null;
          content_hash: string | null;
          device_binding_id: string;
          id: string;
          last_sync_at: string | null;
          skill_id: string;
        };
        Insert: {
          cached_content?: string | null;
          content_hash?: string | null;
          device_binding_id: string;
          id?: string;
          last_sync_at?: string | null;
          skill_id: string;
        };
        Update: {
          cached_content?: string | null;
          content_hash?: string | null;
          device_binding_id?: string;
          id?: string;
          last_sync_at?: string | null;
          skill_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'device_skill_sync_device_binding_id_fkey';
            columns: ['device_binding_id'];
            isOneToOne: false;
            referencedRelation: 'device_bindings';
            referencedColumns: ['id'];
          },
        ];
      };
      feedback_records: {
        Row: {
          conversation_id: string;
          created_at: string | null;
          deleted_at: string | null;
          feedback_type: string;
          id: string;
          message_id: string | null;
          metadata: Json | null;
          rating: number | null;
          reason: string | null;
          tags: string[] | null;
          task_id: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          conversation_id: string;
          created_at?: string | null;
          deleted_at?: string | null;
          feedback_type: string;
          id?: string;
          message_id?: string | null;
          metadata?: Json | null;
          rating?: number | null;
          reason?: string | null;
          tags?: string[] | null;
          task_id?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          conversation_id?: string;
          created_at?: string | null;
          deleted_at?: string | null;
          feedback_type?: string;
          id?: string;
          message_id?: string | null;
          metadata?: Json | null;
          rating?: number | null;
          reason?: string | null;
          tags?: string[] | null;
          task_id?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'feedback_records_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'feedback_records_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'feedback_records_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      git_repositories: {
        Row: {
          created_at: string | null;
          default_branch: string | null;
          device_binding_id: string;
          id: string;
          last_accessed_at: string | null;
          name: string;
          path: string;
          remote_url: string | null;
          stats: Json | null;
          status: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          default_branch?: string | null;
          device_binding_id: string;
          id?: string;
          last_accessed_at?: string | null;
          name: string;
          path: string;
          remote_url?: string | null;
          stats?: Json | null;
          status?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          default_branch?: string | null;
          device_binding_id?: string;
          id?: string;
          last_accessed_at?: string | null;
          name?: string;
          path?: string;
          remote_url?: string | null;
          stats?: Json | null;
          status?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'git_repositories_device_binding_id_fkey';
            columns: ['device_binding_id'];
            isOneToOne: false;
            referencedRelation: 'device_bindings';
            referencedColumns: ['id'];
          },
        ];
      };
      learning_record_feedback_links: {
        Row: {
          created_at: string | null;
          feedback_record_id: string;
          learning_record_id: string;
        };
        Insert: {
          created_at?: string | null;
          feedback_record_id: string;
          learning_record_id: string;
        };
        Update: {
          created_at?: string | null;
          feedback_record_id?: string;
          learning_record_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'learning_record_feedback_links_feedback_record_id_fkey';
            columns: ['feedback_record_id'];
            isOneToOne: false;
            referencedRelation: 'feedback_records';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'learning_record_feedback_links_learning_record_id_fkey';
            columns: ['learning_record_id'];
            isOneToOne: false;
            referencedRelation: 'learning_records';
            referencedColumns: ['id'];
          },
        ];
      };
      learning_records: {
        Row: {
          application_count: number | null;
          confidence: number | null;
          conversation_id: string | null;
          created_at: string | null;
          expires_at: string | null;
          id: string;
          is_active: boolean | null;
          last_applied_at: string | null;
          record_type: string;
          rule_content: Json;
          success_count: number | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          application_count?: number | null;
          confidence?: number | null;
          conversation_id?: string | null;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          last_applied_at?: string | null;
          record_type: string;
          rule_content: Json;
          success_count?: number | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          application_count?: number | null;
          confidence?: number | null;
          conversation_id?: string | null;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          last_applied_at?: string | null;
          record_type?: string;
          rule_content?: Json;
          success_count?: number | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'learning_records_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          agent_metadata: Json | null;
          attachments: Json | null;
          content: string;
          content_type: string | null;
          conversation_id: string;
          created_at: string | null;
          deleted_at: string | null;
          edited_at: string | null;
          id: string;
          metadata: Json | null;
          reply_to_message_id: string | null;
          sender_id: string | null;
          sender_type: string;
          sequence_number: number;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          agent_metadata?: Json | null;
          attachments?: Json | null;
          content: string;
          content_type?: string | null;
          conversation_id: string;
          created_at?: string | null;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          metadata?: Json | null;
          reply_to_message_id?: string | null;
          sender_id?: string | null;
          sender_type: string;
          sequence_number: number;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          agent_metadata?: Json | null;
          attachments?: Json | null;
          content?: string;
          content_type?: string | null;
          conversation_id?: string;
          created_at?: string | null;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          metadata?: Json | null;
          reply_to_message_id?: string | null;
          sender_id?: string | null;
          sender_type?: string;
          sequence_number?: number;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_reply_to_message_id_fkey';
            columns: ['reply_to_message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
        ];
      };
      mini_app_data: {
        Row: {
          accessed_at: string | null;
          created_at: string | null;
          id: string;
          installation_id: string;
          key: string;
          metadata: Json | null;
          updated_at: string | null;
          value: Json;
          value_type: string | null;
        };
        Insert: {
          accessed_at?: string | null;
          created_at?: string | null;
          id?: string;
          installation_id: string;
          key: string;
          metadata?: Json | null;
          updated_at?: string | null;
          value: Json;
          value_type?: string | null;
        };
        Update: {
          accessed_at?: string | null;
          created_at?: string | null;
          id?: string;
          installation_id?: string;
          key?: string;
          metadata?: Json | null;
          updated_at?: string | null;
          value?: Json;
          value_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'mini_app_data_installation_id_fkey';
            columns: ['installation_id'];
            isOneToOne: false;
            referencedRelation: 'mini_app_installations';
            referencedColumns: ['id'];
          },
        ];
      };
      mini_app_installations: {
        Row: {
          created_at: string | null;
          custom_name: string | null;
          granted_permissions: string[] | null;
          id: string;
          installed_version: string;
          mini_app_id: string;
          stats: Json | null;
          status: string | null;
          uninstalled_at: string | null;
          updated_at: string | null;
          user_config: Json | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          custom_name?: string | null;
          granted_permissions?: string[] | null;
          id?: string;
          installed_version: string;
          mini_app_id: string;
          stats?: Json | null;
          status?: string | null;
          uninstalled_at?: string | null;
          updated_at?: string | null;
          user_config?: Json | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          custom_name?: string | null;
          granted_permissions?: string[] | null;
          id?: string;
          installed_version?: string;
          mini_app_id?: string;
          stats?: Json | null;
          status?: string | null;
          uninstalled_at?: string | null;
          updated_at?: string | null;
          user_config?: Json | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'mini_app_installations_mini_app_id_fkey';
            columns: ['mini_app_id'];
            isOneToOne: false;
            referencedRelation: 'mini_apps';
            referencedColumns: ['id'];
          },
        ];
      };
      mini_app_share_links: {
        Row: {
          created_at: string | null;
          created_by: string;
          expires_at: string | null;
          id: string;
          max_uses: number | null;
          mini_app_id: string;
          share_token: string;
          updated_at: string | null;
          use_count: number | null;
        };
        Insert: {
          created_at?: string | null;
          created_by: string;
          expires_at?: string | null;
          id?: string;
          max_uses?: number | null;
          mini_app_id: string;
          share_token: string;
          updated_at?: string | null;
          use_count?: number | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string;
          expires_at?: string | null;
          id?: string;
          max_uses?: number | null;
          mini_app_id?: string;
          share_token?: string;
          updated_at?: string | null;
          use_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'mini_app_share_links_mini_app_id_fkey';
            columns: ['mini_app_id'];
            isOneToOne: false;
            referencedRelation: 'mini_apps';
            referencedColumns: ['id'];
          },
        ];
      };
      mini_app_versions: {
        Row: {
          change_summary: string | null;
          changed_by: string | null;
          code_snapshot: string;
          content_hash: string;
          created_at: string | null;
          html_snapshot: Json | null;
          id: string;
          manifest_snapshot: Json | null;
          mini_app_id: string;
          skill_snapshot: string | null;
          version: string;
        };
        Insert: {
          change_summary?: string | null;
          changed_by?: string | null;
          code_snapshot: string;
          content_hash: string;
          created_at?: string | null;
          html_snapshot?: Json | null;
          id?: string;
          manifest_snapshot?: Json | null;
          mini_app_id: string;
          skill_snapshot?: string | null;
          version: string;
        };
        Update: {
          change_summary?: string | null;
          changed_by?: string | null;
          code_snapshot?: string;
          content_hash?: string;
          created_at?: string | null;
          html_snapshot?: Json | null;
          id?: string;
          manifest_snapshot?: Json | null;
          mini_app_id?: string;
          skill_snapshot?: string | null;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'mini_app_versions_mini_app_id_fkey';
            columns: ['mini_app_id'];
            isOneToOne: false;
            referencedRelation: 'mini_apps';
            referencedColumns: ['id'];
          },
        ];
      };
      mini_apps: {
        Row: {
          architecture_version: string | null;
          code: string;
          code_hash: string | null;
          created_at: string | null;
          creator_id: string;
          description: string;
          display_name: string;
          html: Json | null;
          icon_url: string | null;
          id: string;
          is_public: boolean | null;
          is_shareable: boolean | null;
          manifest: Json;
          metadata: Json | null;
          name: string;
          published_at: string | null;
          runtime_config: Json | null;
          security_review: Json | null;
          skill_content: string | null;
          stats: Json | null;
          status: string | null;
          tags: string[] | null;
          updated_at: string | null;
        };
        Insert: {
          architecture_version?: string | null;
          code: string;
          code_hash?: string | null;
          created_at?: string | null;
          creator_id: string;
          description: string;
          display_name: string;
          html?: Json | null;
          icon_url?: string | null;
          id?: string;
          is_public?: boolean | null;
          is_shareable?: boolean | null;
          manifest?: Json;
          metadata?: Json | null;
          name: string;
          published_at?: string | null;
          runtime_config?: Json | null;
          security_review?: Json | null;
          skill_content?: string | null;
          stats?: Json | null;
          status?: string | null;
          tags?: string[] | null;
          updated_at?: string | null;
        };
        Update: {
          architecture_version?: string | null;
          code?: string;
          code_hash?: string | null;
          created_at?: string | null;
          creator_id?: string;
          description?: string;
          display_name?: string;
          html?: Json | null;
          icon_url?: string | null;
          id?: string;
          is_public?: boolean | null;
          is_shareable?: boolean | null;
          manifest?: Json;
          metadata?: Json | null;
          name?: string;
          published_at?: string | null;
          runtime_config?: Json | null;
          security_review?: Json | null;
          skill_content?: string | null;
          stats?: Json | null;
          status?: string | null;
          tags?: string[] | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          action_url: string | null;
          body: string;
          category: string | null;
          created_at: string | null;
          expires_at: string | null;
          id: string;
          metadata: Json | null;
          priority: string | null;
          read_at: string | null;
          source_id: string | null;
          source_type: string;
          status: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          action_url?: string | null;
          body: string;
          category?: string | null;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          metadata?: Json | null;
          priority?: string | null;
          read_at?: string | null;
          source_id?: string | null;
          source_type: string;
          status?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          action_url?: string | null;
          body?: string;
          category?: string | null;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          metadata?: Json | null;
          priority?: string | null;
          read_at?: string | null;
          source_id?: string | null;
          source_type?: string;
          status?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      resources: {
        Row: {
          access_count: number | null;
          content: string;
          conversation_id: string;
          created_at: string | null;
          id: string;
          last_accessed_at: string | null;
          message_id: string | null;
          metadata: Json | null;
          position: Json | null;
          resource_type: string;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          access_count?: number | null;
          content: string;
          conversation_id: string;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          message_id?: string | null;
          metadata?: Json | null;
          position?: Json | null;
          resource_type: string;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          access_count?: number | null;
          content?: string;
          conversation_id?: string;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          message_id?: string | null;
          metadata?: Json | null;
          position?: Json | null;
          resource_type?: string;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'resources_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'resources_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
        ];
      };
      skill_content_cache: {
        Row: {
          cached_at: string | null;
          content: string;
          content_hash: string;
          expires_at: string | null;
          hit_count: number | null;
          id: string;
          skill_id: string;
        };
        Insert: {
          cached_at?: string | null;
          content: string;
          content_hash: string;
          expires_at?: string | null;
          hit_count?: number | null;
          id?: string;
          skill_id: string;
        };
        Update: {
          cached_at?: string | null;
          content?: string;
          content_hash?: string;
          expires_at?: string | null;
          hit_count?: number | null;
          id?: string;
          skill_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'skill_content_cache_skill_id_fkey';
            columns: ['skill_id'];
            isOneToOne: true;
            referencedRelation: 'skill_registry';
            referencedColumns: ['skill_id'];
          },
        ];
      };
      skill_execution_logs: {
        Row: {
          conversation_id: string | null;
          error_message: string | null;
          executed_at: string | null;
          execution_time_ms: number | null;
          id: string;
          skill_id: string;
          success: boolean | null;
          task_id: string | null;
          user_id: string | null;
        };
        Insert: {
          conversation_id?: string | null;
          error_message?: string | null;
          executed_at?: string | null;
          execution_time_ms?: number | null;
          id?: string;
          skill_id: string;
          success?: boolean | null;
          task_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          conversation_id?: string | null;
          error_message?: string | null;
          executed_at?: string | null;
          execution_time_ms?: number | null;
          id?: string;
          skill_id?: string;
          success?: boolean | null;
          task_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      skill_registry: {
        Row: {
          category: string;
          conflicts: string[] | null;
          content_hash: string | null;
          content_ref: Json;
          created_at: string | null;
          dependencies: string[] | null;
          description: string | null;
          id: string;
          is_active: boolean | null;
          keywords: string[] | null;
          name: string;
          priority: number | null;
          search_vector: unknown;
          skill_id: string;
          skill_type: string | null;
          tags: string[] | null;
          trigger_keywords: string[] | null;
          trigger_patterns: string[] | null;
          triggers: string[] | null;
          updated_at: string | null;
          version: string;
        };
        Insert: {
          category: string;
          conflicts?: string[] | null;
          content_hash?: string | null;
          content_ref: Json;
          created_at?: string | null;
          dependencies?: string[] | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          keywords?: string[] | null;
          name: string;
          priority?: number | null;
          search_vector?: unknown;
          skill_id: string;
          skill_type?: string | null;
          tags?: string[] | null;
          trigger_keywords?: string[] | null;
          trigger_patterns?: string[] | null;
          triggers?: string[] | null;
          updated_at?: string | null;
          version?: string;
        };
        Update: {
          category?: string;
          conflicts?: string[] | null;
          content_hash?: string | null;
          content_ref?: Json;
          created_at?: string | null;
          dependencies?: string[] | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          keywords?: string[] | null;
          name?: string;
          priority?: number | null;
          search_vector?: unknown;
          skill_id?: string;
          skill_type?: string | null;
          tags?: string[] | null;
          trigger_keywords?: string[] | null;
          trigger_patterns?: string[] | null;
          triggers?: string[] | null;
          updated_at?: string | null;
          version?: string;
        };
        Relationships: [];
      };
      skill_versions: {
        Row: {
          change_summary: string | null;
          changed_by: string | null;
          content_hash: string;
          content_snapshot: string;
          created_at: string | null;
          id: string;
          skill_id: string;
          version: string;
        };
        Insert: {
          change_summary?: string | null;
          changed_by?: string | null;
          content_hash: string;
          content_snapshot: string;
          created_at?: string | null;
          id?: string;
          skill_id: string;
          version: string;
        };
        Update: {
          change_summary?: string | null;
          changed_by?: string | null;
          content_hash?: string;
          content_snapshot?: string;
          created_at?: string | null;
          id?: string;
          skill_id?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'skill_versions_skill_id_fkey';
            columns: ['skill_id'];
            isOneToOne: false;
            referencedRelation: 'skill_registry';
            referencedColumns: ['skill_id'];
          },
        ];
      };
      tasks: {
        Row: {
          agent_config: Json | null;
          completed_at: string | null;
          conversation_id: string;
          created_at: string | null;
          description: string | null;
          error_message: string | null;
          id: string;
          message_id: string | null;
          metadata: Json | null;
          metrics: Json | null;
          progress: number | null;
          result: Json | null;
          started_at: string | null;
          status: string | null;
          task_type: string;
          title: string;
          tool_calls: Json | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          agent_config?: Json | null;
          completed_at?: string | null;
          conversation_id: string;
          created_at?: string | null;
          description?: string | null;
          error_message?: string | null;
          id?: string;
          message_id?: string | null;
          metadata?: Json | null;
          metrics?: Json | null;
          progress?: number | null;
          result?: Json | null;
          started_at?: string | null;
          status?: string | null;
          task_type: string;
          title: string;
          tool_calls?: Json | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          agent_config?: Json | null;
          completed_at?: string | null;
          conversation_id?: string;
          created_at?: string | null;
          description?: string | null;
          error_message?: string | null;
          id?: string;
          message_id?: string | null;
          metadata?: Json | null;
          metrics?: Json | null;
          progress?: number | null;
          result?: Json | null;
          started_at?: string | null;
          status?: string | null;
          task_type?: string;
          title?: string;
          tool_calls?: Json | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
        ];
      };
      terminal_sessions: {
        Row: {
          closed_at: string | null;
          config: Json | null;
          conversation_id: string | null;
          created_at: string | null;
          device_binding_id: string;
          id: string;
          last_activity_at: string | null;
          session_name: string | null;
          shell_type: string | null;
          stats: Json | null;
          status: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          closed_at?: string | null;
          config?: Json | null;
          conversation_id?: string | null;
          created_at?: string | null;
          device_binding_id: string;
          id?: string;
          last_activity_at?: string | null;
          session_name?: string | null;
          shell_type?: string | null;
          stats?: Json | null;
          status?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          closed_at?: string | null;
          config?: Json | null;
          conversation_id?: string | null;
          created_at?: string | null;
          device_binding_id?: string;
          id?: string;
          last_activity_at?: string | null;
          session_name?: string | null;
          shell_type?: string | null;
          stats?: Json | null;
          status?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'terminal_sessions_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'terminal_sessions_device_binding_id_fkey';
            columns: ['device_binding_id'];
            isOneToOne: false;
            referencedRelation: 'device_bindings';
            referencedColumns: ['id'];
          },
        ];
      };
      tools: {
        Row: {
          category: string | null;
          config: Json;
          created_at: string | null;
          description: string;
          display_name: string;
          id: string;
          is_public: boolean | null;
          metadata: Json | null;
          name: string;
          owner_id: string | null;
          protocol: string;
          required_permissions: string[] | null;
          stats: Json | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          category?: string | null;
          config?: Json;
          created_at?: string | null;
          description: string;
          display_name: string;
          id?: string;
          is_public?: boolean | null;
          metadata?: Json | null;
          name: string;
          owner_id?: string | null;
          protocol: string;
          required_permissions?: string[] | null;
          stats?: Json | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          category?: string | null;
          config?: Json;
          created_at?: string | null;
          description?: string;
          display_name?: string;
          id?: string;
          is_public?: boolean | null;
          metadata?: Json | null;
          name?: string;
          owner_id?: string | null;
          protocol?: string;
          required_permissions?: string[] | null;
          stats?: Json | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string | null;
          display_name: string | null;
          id: string;
          last_active_at: string | null;
          preferences: Json | null;
          quota: Json | null;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          id: string;
          last_active_at?: string | null;
          preferences?: Json | null;
          quota?: Json | null;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          id?: string;
          last_active_at?: string | null;
          preferences?: Json | null;
          quota?: Json | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      workspace_history: {
        Row: {
          created_at: string | null;
          device_binding_id: string;
          id: string;
          last_accessed_at: string | null;
          path: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          device_binding_id: string;
          id?: string;
          last_accessed_at?: string | null;
          path: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          device_binding_id?: string;
          id?: string;
          last_accessed_at?: string | null;
          path?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_history_device_binding_id_fkey';
            columns: ['device_binding_id'];
            isOneToOne: false;
            referencedRelation: 'device_bindings';
            referencedColumns: ['id'];
          },
        ];
      };
      workspace_states: {
        Row: {
          active_tab: string | null;
          conversation_id: string | null;
          created_at: string | null;
          id: string;
          is_open: boolean | null;
          layout: Json | null;
          tabs_state: Json | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          active_tab?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_open?: boolean | null;
          layout?: Json | null;
          tabs_state?: Json | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          active_tab?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_open?: boolean | null;
          layout?: Json | null;
          tabs_state?: Json | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_states_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      calculate_mini_app_content_hash:
        | {
            Args: { p_code: string; p_html: string; p_skill: string };
            Returns: string;
          }
        | {
            Args: { p_code: string; p_html?: Json; p_skill_content: string };
            Returns: string;
          };
      expire_old_notifications: { Args: never; Returns: undefined };
      extract_conversation_id_from_path: {
        Args: { file_path: string };
        Returns: string;
      };
      generate_next_mini_app_version: {
        Args: { p_mini_app_id: string };
        Returns: string;
      };
      increment_miniapp_invocations: {
        Args: { miniapp_id: string };
        Returns: undefined;
      };
      increment_skill_hit_count: {
        Args: { p_skill_id: string };
        Returns: undefined;
      };
      search_skills_by_keywords: {
        Args: { match_count?: number; query_text: string };
        Returns: {
          category: string;
          description: string;
          id: string;
          name: string;
          rank: number;
        }[];
      };
      search_skills_by_tags: {
        Args: { match_count?: number; search_keywords: string[] };
        Returns: {
          category: string;
          description: string;
          id: string;
          match_score: number;
          name: string;
        }[];
      };
      user_owns_conversation: {
        Args: { conversation_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
