/**
 * Workspace Types for User Story 5
 * 工作区类型定义
 */

export type WorkspaceTab = 'resources' | 'devices' | 'files' | 'terminal' | 'git';

/** MiniApp 编辑模式 */
export type MiniAppEditMode = 'code' | 'resources' | 'skill' | 'mcp' | 'interact' | 'history';

export type LayoutDirection = 'horizontal' | 'vertical';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export interface WorkspaceLayout {
  split_ratio: number;
  direction: LayoutDirection;
  breakpoint: Breakpoint;
}

export interface WorkspaceState {
  is_open: boolean;
  active_tab: WorkspaceTab;
  layout: WorkspaceLayout;
  tabs_state: {
    resources: {
      filters: string[];
      sort: string;
    };
    devices: {
      selected_device_id: string | null;
    };
    files: {
      current_path: string;
      open_files: string[];
    };
    terminal: {
      sessions: string[];
    };
    git: {
      current_repo: string | null;
    };
  };
}
