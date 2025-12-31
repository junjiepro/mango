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
      mini_apps: {
        Row: {
          code: string;
          code_hash: string | null;
          created_at: string | null;
          creator_id: string;
          description: string;
          display_name: string;
          html: string | null;
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
          stats: Json | null;
          status: string | null;
          tags: string[] | null;
          updated_at: string | null;
        };
        Insert: {
          code: string;
          code_hash?: string | null;
          created_at?: string | null;
          creator_id: string;
          description: string;
          display_name: string;
          html?: string | null;
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
          stats?: Json | null;
          status?: string | null;
          tags?: string[] | null;
          updated_at?: string | null;
        };
        Update: {
          code?: string;
          code_hash?: string | null;
          created_at?: string | null;
          creator_id?: string;
          description?: string;
          display_name?: string;
          html?: string | null;
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      expire_old_notifications: { Args: never; Returns: undefined };
      extract_conversation_id_from_path: {
        Args: { file_path: string };
        Returns: string;
      };
      increment_miniapp_invocations: {
        Args: { miniapp_id: string };
        Returns: undefined;
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
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null;
          avif_autodetection: boolean | null;
          created_at: string | null;
          file_size_limit: number | null;
          id: string;
          name: string;
          owner: string | null;
          owner_id: string | null;
          public: boolean | null;
          type: Database['storage']['Enums']['buckettype'];
          updated_at: string | null;
        };
        Insert: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id: string;
          name: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string | null;
        };
        Update: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id?: string;
          name?: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string | null;
        };
        Relationships: [];
      };
      buckets_analytics: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          format: string;
          id: string;
          name: string;
          type: Database['storage']['Enums']['buckettype'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name: string;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name?: string;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string;
        };
        Relationships: [];
      };
      buckets_vectors: {
        Row: {
          created_at: string;
          id: string;
          type: Database['storage']['Enums']['buckettype'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string;
        };
        Relationships: [];
      };
      iceberg_namespaces: {
        Row: {
          bucket_name: string;
          catalog_id: string;
          created_at: string;
          id: string;
          metadata: Json;
          name: string;
          updated_at: string;
        };
        Insert: {
          bucket_name: string;
          catalog_id: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          name: string;
          updated_at?: string;
        };
        Update: {
          bucket_name?: string;
          catalog_id?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'iceberg_namespaces_catalog_id_fkey';
            columns: ['catalog_id'];
            isOneToOne: false;
            referencedRelation: 'buckets_analytics';
            referencedColumns: ['id'];
          },
        ];
      };
      iceberg_tables: {
        Row: {
          bucket_name: string;
          catalog_id: string;
          created_at: string;
          id: string;
          location: string;
          name: string;
          namespace_id: string;
          remote_table_id: string | null;
          shard_id: string | null;
          shard_key: string | null;
          updated_at: string;
        };
        Insert: {
          bucket_name: string;
          catalog_id: string;
          created_at?: string;
          id?: string;
          location: string;
          name: string;
          namespace_id: string;
          remote_table_id?: string | null;
          shard_id?: string | null;
          shard_key?: string | null;
          updated_at?: string;
        };
        Update: {
          bucket_name?: string;
          catalog_id?: string;
          created_at?: string;
          id?: string;
          location?: string;
          name?: string;
          namespace_id?: string;
          remote_table_id?: string | null;
          shard_id?: string | null;
          shard_key?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'iceberg_tables_catalog_id_fkey';
            columns: ['catalog_id'];
            isOneToOne: false;
            referencedRelation: 'buckets_analytics';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'iceberg_tables_namespace_id_fkey';
            columns: ['namespace_id'];
            isOneToOne: false;
            referencedRelation: 'iceberg_namespaces';
            referencedColumns: ['id'];
          },
        ];
      };
      migrations: {
        Row: {
          executed_at: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Insert: {
          executed_at?: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Update: {
          executed_at?: string | null;
          hash?: string;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      objects: {
        Row: {
          bucket_id: string | null;
          created_at: string | null;
          id: string;
          last_accessed_at: string | null;
          level: number | null;
          metadata: Json | null;
          name: string | null;
          owner: string | null;
          owner_id: string | null;
          path_tokens: string[] | null;
          updated_at: string | null;
          user_metadata: Json | null;
          version: string | null;
        };
        Insert: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          level?: number | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Update: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          level?: number | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'objects_bucketId_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
        ];
      };
      prefixes: {
        Row: {
          bucket_id: string;
          created_at: string | null;
          level: number;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          bucket_id: string;
          created_at?: string | null;
          level?: number;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          bucket_id?: string;
          created_at?: string | null;
          level?: number;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'prefixes_bucketId_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
        ];
      };
      s3_multipart_uploads: {
        Row: {
          bucket_id: string;
          created_at: string;
          id: string;
          in_progress_size: number;
          key: string;
          owner_id: string | null;
          upload_signature: string;
          user_metadata: Json | null;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          id: string;
          in_progress_size?: number;
          key: string;
          owner_id?: string | null;
          upload_signature: string;
          user_metadata?: Json | null;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          id?: string;
          in_progress_size?: number;
          key?: string;
          owner_id?: string | null;
          upload_signature?: string;
          user_metadata?: Json | null;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: 's3_multipart_uploads_bucket_id_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
        ];
      };
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string;
          created_at: string;
          etag: string;
          id: string;
          key: string;
          owner_id: string | null;
          part_number: number;
          size: number;
          upload_id: string;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          etag: string;
          id?: string;
          key: string;
          owner_id?: string | null;
          part_number: number;
          size?: number;
          upload_id: string;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          etag?: string;
          id?: string;
          key?: string;
          owner_id?: string | null;
          part_number?: number;
          size?: number;
          upload_id?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: 's3_multipart_uploads_parts_bucket_id_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 's3_multipart_uploads_parts_upload_id_fkey';
            columns: ['upload_id'];
            isOneToOne: false;
            referencedRelation: 's3_multipart_uploads';
            referencedColumns: ['id'];
          },
        ];
      };
      vector_indexes: {
        Row: {
          bucket_id: string;
          created_at: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id: string;
          metadata_configuration: Json | null;
          name: string;
          updated_at: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id?: string;
          metadata_configuration?: Json | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          data_type?: string;
          dimension?: number;
          distance_metric?: string;
          id?: string;
          metadata_configuration?: Json | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vector_indexes_bucket_id_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets_vectors';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string };
        Returns: undefined;
      };
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string };
        Returns: undefined;
      };
      delete_leaf_prefixes: {
        Args: { bucket_ids: string[]; names: string[] };
        Returns: undefined;
      };
      delete_prefix: {
        Args: { _bucket_id: string; _name: string };
        Returns: boolean;
      };
      extension: { Args: { name: string }; Returns: string };
      filename: { Args: { name: string }; Returns: string };
      foldername: { Args: { name: string }; Returns: string[] };
      get_level: { Args: { name: string }; Returns: number };
      get_prefix: { Args: { name: string }; Returns: string };
      get_prefixes: { Args: { name: string }; Returns: string[] };
      get_size_by_bucket: {
        Args: never;
        Returns: {
          bucket_id: string;
          size: number;
        }[];
      };
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_key_token?: string;
          next_upload_token?: string;
          prefix_param: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
        }[];
      };
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_token?: string;
          prefix_param: string;
          start_after?: string;
        };
        Returns: {
          id: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      lock_top_prefixes: {
        Args: { bucket_ids: string[]; names: string[] };
        Returns: undefined;
      };
      operation: { Args: never; Returns: string };
      search: {
        Args: {
          bucketname: string;
          levels?: number;
          limits?: number;
          offsets?: number;
          prefix: string;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_legacy_v1: {
        Args: {
          bucketname: string;
          levels?: number;
          limits?: number;
          offsets?: number;
          prefix: string;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_v1_optimised: {
        Args: {
          bucketname: string;
          levels?: number;
          limits?: number;
          offsets?: number;
          prefix: string;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_v2: {
        Args: {
          bucket_name: string;
          levels?: number;
          limits?: number;
          prefix: string;
          sort_column?: string;
          sort_column_after?: string;
          sort_order?: string;
          start_after?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
    };
    Enums: {
      buckettype: 'STANDARD' | 'ANALYTICS' | 'VECTOR';
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
  storage: {
    Enums: {
      buckettype: ['STANDARD', 'ANALYTICS', 'VECTOR'],
    },
  },
} as const;
