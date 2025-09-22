# AI Agent System Documentation

## Overview

The AI Agent System is a comprehensive intelligent assistant platform built with Next.js 15, featuring multimodal content processing, Model Context Protocol (MCP) tool integration, and advanced plugin architecture. This document provides complete documentation for users, developers, and system administrators.

## Table of Contents

- [User Guide](#user-guide)
- [Technical Documentation](#technical-documentation)
- [API Reference](#api-reference)
- [Development Guide](#development-guide)
- [Deployment Guide](#deployment-guide)
- [Troubleshooting](#troubleshooting)

---

## User Guide

### Getting Started

#### Accessing AI Agent

1. **Authentication Required**: You must be logged in to access AI Agent features
2. **Navigation**: From the dashboard, click "AI助手" in the navigation menu
3. **Language Support**: Available in Chinese (中文) and English

#### User Modes

The AI Agent system supports two distinct user modes:

##### Simple Mode (简单模式)
- **Target Users**: General users who want straightforward AI assistance
- **Features**:
  - Clean conversation interface
  - Basic quick actions (Ask Question, Analyze Content, Create Content)
  - Simplified error messages
  - Hidden technical details

##### Advanced Mode (高级模式)
- **Target Users**: Technical users and developers
- **Features**:
  - Full tabbed interface (Chat, Tools, History)
  - Plugin management access
  - Tool execution visualization
  - Session management controls
  - Technical debugging information

### Core Features

#### AI Conversation

**Starting a Conversation**:
1. Select your preferred mode (Simple/Advanced)
2. Type your message in the input field
3. Click "发送" (Send) or press Enter
4. Wait for AI response with loading indicator

**Message Types Supported**:
- **Text**: Plain text questions and instructions
- **Code**: Programming code with syntax highlighting
- **Images**: Image analysis and description
- **Files**: Document processing and analysis

**Conversation Management**:
- **New Session**: Start fresh conversations
- **Session History**: View previous conversations (Advanced mode)
- **Export**: Download conversation data
- **Clear**: Remove conversation history

#### Quick Actions

**Simple Mode Actions**:
- **提问咨询 (Ask Question)**: General inquiries and help
- **内容分析 (Analyze Content)**: Analyze text, code, or documents
- **内容创作 (Create Content)**: Generate text, code, or creative content

**Advanced Mode Additional Actions**:
- **管理MCP工具 (Manage MCP Tools)**: Access plugin management
- **查看会话 (View Sessions)**: Browse session history
- **配置设置 (Configure Settings)**: Adjust AI behavior and preferences

#### Tool Integration

The AI Agent can execute various tools to extend its capabilities:

**Built-in Tools**:
- Code analysis and suggestions
- File operations
- Data processing
- API integrations

**MCP Tools**: Connect to external Model Context Protocol servers for specialized functionality

### Plugin Management (Advanced Users)

#### Accessing Plugin Management
1. Switch to Advanced mode
2. Navigate to "Tools" tab or visit `/ai-agent/plugins`
3. Use the management interface to configure plugins

#### Managing MCP Servers

**Adding a Server**:
1. Click "添加服务器" (Add Server)
2. Configure connection details:
   - Server name and type
   - Connection URL
   - Authentication credentials
   - Capabilities
3. Test connection
4. Save configuration

**Server Status Monitoring**:
- **已连接 (Connected)**: Server is active and responsive
- **连接中 (Connecting)**: Attempting to establish connection
- **错误 (Error)**: Connection failed or server issues
- **未连接 (Disconnected)**: Server is offline

**Server Actions**:
- **监控 (Monitor)**: View connection status and performance
- **工具 (Tools)**: Browse available tools and schemas
- **配置 (Configure)**: Modify server settings
- **重启 (Restart)**: Reconnect to server

#### Managing Plugins

**Plugin Types**:
- **MCP Plugins**: Interface with MCP servers
- **Native Plugins**: Built-in functionality extensions
- **Custom Plugins**: User-defined extensions

**Plugin Operations**:
- **安装 (Install)**: Add new plugins from marketplace or custom sources
- **启用/禁用 (Enable/Disable)**: Control plugin activation
- **配置 (Configure)**: Modify plugin settings
- **重新加载 (Reload)**: Restart plugin without full reinstall
- **卸载 (Uninstall)**: Remove plugin completely

**Plugin Status**:
- **运行中 (Active)**: Plugin is loaded and functioning
- **加载中 (Loading)**: Plugin is being initialized
- **错误 (Error)**: Plugin failed to load or execute
- **已禁用 (Disabled)**: Plugin is installed but inactive

### Session Management

#### Creating Sessions
- **Auto-creation**: New sessions start automatically when you begin chatting
- **Manual creation**: Use "新建对话" (New Session) button
- **Session naming**: Automatic titles based on conversation content

#### Session Persistence
- **Auto-save**: Conversations save automatically
- **Cross-device**: Access sessions from any logged-in device
- **Data retention**: Sessions preserved according to user preferences

#### Session Operations
- **Archive**: Move completed sessions to archive
- **Export**: Download session data as JSON
- **Delete**: Permanently remove sessions
- **Share**: Generate shareable links (if enabled)

### Language and Localization

#### Supported Languages
- **中文 (Chinese)**: Default language with full feature support
- **English**: Complete English interface and messages

#### Language Switching
- Use the language switcher in the navigation
- Language preference persists across sessions
- URLs automatically update with language prefix (`/zh/` or `/en/`)

#### Technical Terminology
- Consistent translation of technical terms
- Context-appropriate language for different user modes
- Professional terminology for advanced features

---

## Technical Documentation

### System Architecture

#### Overview
The AI Agent system is built on a modern, scalable architecture using Next.js 15 with the App Router, Supabase for backend services, and a comprehensive plugin system for extensibility.

#### Core Components

**Frontend Architecture**:
- **Framework**: Next.js 15.5.2 with App Router and Turbopack
- **UI Library**: React 19.1.0 with shadcn/ui components
- **Styling**: Tailwind CSS 4
- **State Management**: React Context for global state
- **Forms**: React Hook Form with Zod validation
- **Internationalization**: next-intl for multi-language support

**Backend Services**:
- **Authentication**: Supabase Auth with RLS (Row Level Security)
- **Database**: PostgreSQL via Supabase with custom schemas
- **API Routes**: Next.js API routes with streaming support
- **File Storage**: Supabase Storage for multimodal content

**AI Integration**:
- **AI SDK**: Vercel AI SDK for streaming responses
- **Model Provider**: OpenAI GPT-4o (configurable)
- **Tool Calling**: Native tool execution with streaming
- **Content Processing**: Multimodal content analysis and generation

#### TypeScript Type System

**Core Types** (`src/types/ai-agent.ts`):
```typescript
interface AgentSession {
  id: string
  userId: string
  title: string
  mode: 'simple' | 'advanced'
  status: 'active' | 'paused' | 'completed' | 'error' | 'deleted'
  context: Record<string, any>
  capabilities: string[]
  plugins: PluginConfig[]
  messageCount: number
  usage?: TokenUsage
  createdAt: string
  lastActivity: string
}

interface AgentMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  multimodalContent?: MultimodalContent[]
  toolInvocations?: ToolInvocation[]
  timestamp: string
  metadata?: Record<string, any>
}
```

**Plugin System** (`src/types/plugins.ts`):
```typescript
interface AgentPlugin {
  id: string
  name: string
  version: string
  type: 'mcp' | 'native' | 'custom'
  status: 'loading' | 'active' | 'error' | 'disabled'
  capabilities: PluginCapability[]
  description?: string
  author?: string
}

interface MCPPlugin extends AgentPlugin {
  type: 'mcp'
  mcpConfig: MCPPluginConfig
  toolSchemas: ToolSchema[]
}
```

**Multimodal Content** (`src/types/multimodal.ts`):
```typescript
type MultimodalContent =
  | TextContent
  | CodeContent
  | HTMLContent
  | ImageContent
  | AudioContent
  | FileContent

interface CodeContent {
  type: 'code'
  data: {
    code: string
    language: string
    theme?: string
  }
  editorConfig?: MonacoEditorConfig
  metadata?: ContentMetadata
}
```

#### Service Layer Architecture

**AgentEngine** (`src/lib/ai-agent/core.ts`):
- Central orchestration for all AI Agent functionality
- Session lifecycle management
- Message processing and routing
- Integration with all subsystems

**MCPClientService** (`src/lib/mcp/client.ts`):
- Model Context Protocol client implementation
- Server connection management
- Tool discovery and execution
- Protocol version negotiation

**MultimodalProcessorService** (`src/lib/multimodal/processor.ts`):
- Content type detection and validation
- Media processing and optimization
- Editor integration (Monaco/CodeMirror)
- Security sanitization for HTML content

**PluginManagerService** (`src/lib/plugins/manager.ts`):
- Plugin lifecycle management
- Hot-loading and hot-reloading
- Execution queue management
- Error isolation and recovery

#### Database Schema

**Core Tables**:
- `ai_agent_sessions`: Session storage with user isolation
- `ai_agent_messages`: Message history with multimodal support
- `mcp_servers`: MCP server configurations
- `ai_agent_plugins`: Plugin registry and status
- `tool_execution_records`: Tool execution audit trail
- `multimodal_content`: Content storage with metadata
- `ai_agent_user_preferences`: User settings and preferences

**Security Features**:
- Row Level Security (RLS) for all tables
- User-based data isolation
- Foreign key constraints for data integrity
- Audit trails for sensitive operations

#### API Architecture

**Streaming Endpoints**:
- `/api/ai-agent`: Main conversation API with streaming
- `/api/mcp`: MCP server and plugin management
- `/api/sessions`: Session CRUD operations

**Authentication**:
- Supabase JWT tokens
- Middleware-based route protection
- Session refresh handling

**Error Handling**:
- Standardized error response format
- Graceful degradation for service failures
- Client-side error recovery

### Development Workflow

#### Local Development Setup

**Prerequisites**:
- Node.js 18+ with npm
- Supabase CLI (optional)
- Git for version control

**Environment Configuration**:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Development Commands**:
```bash
npm run dev              # Start development server with Turbopack
npm run build            # Build for production
npm run test             # Run unit tests
npm run test:e2e         # Run E2E tests
npm run lint             # Run ESLint
npm run typecheck        # TypeScript checking
```

#### Code Organization

**Directory Structure**:
```
src/
├── app/[locale]/          # Internationalized app routes
│   ├── ai-agent/         # AI Agent pages
│   └── api/              # API route handlers
├── components/           # React components
│   ├── ai-agent/        # AI-specific components
│   └── ui/              # Generic UI components
├── lib/                 # Core business logic
│   ├── ai-agent/        # Agent engine
│   ├── mcp/             # MCP client
│   ├── multimodal/      # Content processing
│   └── plugins/         # Plugin management
└── types/               # TypeScript definitions
```

**Component Patterns**:
- Server Components for static content
- Client Components for interactive features
- Shared hooks for reusable logic
- Context providers for global state

#### Testing Strategy

**Unit Tests**:
- Jest with React Testing Library
- Mock external dependencies
- Test business logic in isolation
- Achieve >90% code coverage

**Integration Tests**:
- Test component interactions
- Mock API responses
- Validate data flow

**E2E Tests**:
- Playwright for browser automation
- Test complete user workflows
- Cross-browser compatibility
- Mobile responsiveness

#### Performance Optimization

**Build Optimization**:
- Turbopack for fast development builds
- Code splitting with dynamic imports
- Tree shaking for unused code elimination
- Bundle analysis for size monitoring

**Runtime Performance**:
- React 19 concurrent features
- Streaming for improved perceived performance
- Lazy loading for large components
- Optimistic updates for better UX

**Database Performance**:
- Proper indexing for query optimization
- Connection pooling
- Query optimization
- Caching strategies

### Security Considerations

#### Authentication & Authorization
- Supabase Auth with email verification
- Row Level Security (RLS) policies
- JWT token validation
- Session management with refresh

#### Data Protection
- User data isolation
- Encryption at rest and in transit
- Audit logging for sensitive operations
- GDPR compliance features

#### Input Validation
- Zod schemas for type validation
- HTML sanitization for content
- File type and size restrictions
- Rate limiting for API endpoints

#### Plugin Security
- Sandboxed plugin execution
- Permission-based access control
- Code signing for trusted plugins
- Resource usage monitoring

---

## API Reference

### AI Agent API (`/api/ai-agent`)

#### POST /api/ai-agent
**Description**: Main conversation endpoint with streaming support

**Headers**:
```
Content-Type: application/json
Authorization: Bearer <supabase_jwt_token>
```

**Request Body**:
```typescript
{
  messages: AgentMessage[]
  sessionId?: string
  mode?: 'simple' | 'advanced'
  multimodalContent?: MultimodalContent[]
  mcpConfig?: MCPClientConfig
  pluginConfig?: PluginConfig
}
```

**Response**: Streaming text response with tool calls

**Example**:
```javascript
const response = await fetch('/api/ai-agent', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'Hello, can you help me?' }
    ],
    mode: 'simple'
  })
})

// Handle streaming response
const reader = response.body?.getReader()
// Process chunks...
```

#### GET /api/ai-agent
**Description**: Health check and system status

**Response**:
```typescript
{
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: {
    agentEngine: 'ready' | 'unavailable'
    mcpClient: 'ready' | 'unavailable'
    multimodalProcessor: 'ready' | 'unavailable'
    pluginManager: 'ready' | 'unavailable'
  }
  connections: {
    mcpServers: number
    loadedPlugins: number
  }
}
```

### MCP API (`/api/mcp`)

#### GET /api/mcp
**Description**: List MCP servers and plugins

**Query Parameters**:
- `action`: 'servers' | 'plugins' | 'available'

**Examples**:
```bash
GET /api/mcp?action=servers    # List connected servers
GET /api/mcp?action=plugins    # List loaded plugins
GET /api/mcp?action=available  # List available plugins
```

**Response**:
```typescript
{
  success: boolean
  servers?: MCPServer[]
  plugins?: MCPPlugin[]
  available?: AvailablePlugin[]
  totalCount: number
}
```

#### POST /api/mcp
**Description**: Manage MCP servers and plugins

**Request Body**:
```typescript
{
  action: 'connect_server' | 'install_plugin' | 'test_connection'
  config?: MCPClientConfig | PluginConfig
  pluginId?: string
  serverId?: string
}
```

**Examples**:

**Connect MCP Server**:
```javascript
await fetch('/api/mcp', {
  method: 'POST',
  body: JSON.stringify({
    action: 'connect_server',
    config: {
      id: 'github-server',
      name: 'GitHub MCP Server',
      type: 'github',
      transport: {
        type: 'http',
        url: 'http://localhost:3001/mcp'
      }
    }
  })
})
```

**Install Plugin**:
```javascript
await fetch('/api/mcp', {
  method: 'POST',
  body: JSON.stringify({
    action: 'install_plugin',
    pluginId: 'code-analyzer-v1.0'
  })
})
```

### Sessions API (`/api/sessions`)

#### GET /api/sessions
**Description**: Retrieve user sessions

**Query Parameters**:
- `id`: Specific session ID
- `action`: 'stats' | 'recent'
- `status`: Filter by status
- `limit`: Number of results
- `offset`: Pagination offset

**Response**:
```typescript
{
  success: boolean
  session?: AgentSession        // Single session
  sessions?: AgentSession[]     // Multiple sessions
  stats?: SessionStats          // Statistics
  totalCount: number
  pagination?: {
    limit: number
    offset: number
    hasMore: boolean
  }
}
```

#### POST /api/sessions
**Description**: Create new session

**Request Body**:
```typescript
{
  title?: string
  mode?: 'simple' | 'advanced'
  context?: Record<string, any>
  plugins?: PluginConfig[]
  mcpConfig?: MCPClientConfig
}
```

#### PUT /api/sessions
**Description**: Update session

**Request Body**:
```typescript
{
  sessionId: string
  action?: 'pause' | 'resume' | 'archive' | 'export' | 'clear_messages'
  updates?: Partial<AgentSession>
}
```

### Error Responses

**Standard Error Format**:
```typescript
{
  success: false
  error: string
  message?: string
  code?: string
  details?: Record<string, any>
}
```

**Common Error Codes**:
- `401`: Authentication required
- `403`: Access denied
- `404`: Resource not found
- `429`: Rate limit exceeded
- `500`: Internal server error

### Tool Execution Format

**Tool Call Structure**:
```typescript
{
  toolCallId: string
  toolName: string
  args: Record<string, any>
  timestamp: string
}
```

**Tool Result Structure**:
```typescript
{
  success: boolean
  result?: any
  error?: string
  metadata?: {
    executionTime: number
    resourcesUsed: string[]
  }
}
```

---

## Development Guide

### Adding New Features

#### Creating New Components
1. **Component Location**: Place in appropriate directory (`src/components/ai-agent/` for AI-specific)
2. **TypeScript**: Use proper type definitions and interfaces
3. **Styling**: Follow Tailwind CSS patterns and shadcn/ui components
4. **Testing**: Write unit tests for business logic
5. **Documentation**: Add JSDoc comments for props and functions

#### Extending the Plugin System
1. **Define Plugin Type**: Extend base plugin interfaces
2. **Implement Loader**: Add loading logic to plugin manager
3. **Add Execution Handler**: Implement execution in plugin manager
4. **Update API**: Add endpoints for plugin-specific operations
5. **Create Tests**: Unit and integration tests for new functionality

#### Adding Tool Integrations
1. **Tool Schema**: Define input/output schemas
2. **Implementation**: Add tool handler in appropriate service
3. **Registration**: Register tool with AI model
4. **Error Handling**: Implement proper error recovery
5. **Documentation**: Add tool to API reference

### Code Style Guidelines

#### TypeScript Standards
- Use strict type checking
- Prefer interfaces over types for objects
- Use generic types for reusable components
- Export types from dedicated files

#### React Patterns
- Use functional components with hooks
- Implement proper error boundaries
- Use Suspense for loading states
- Prefer composition over inheritance

#### Testing Requirements
- Minimum 85% code coverage
- Test error scenarios
- Mock external dependencies
- Use data-testid attributes for E2E tests

### Performance Guidelines

#### Frontend Optimization
- Lazy load components and routes
- Implement virtual scrolling for large lists
- Use React.memo for expensive components
- Optimize bundle size with code splitting

#### Backend Optimization
- Implement proper database indexing
- Use connection pooling
- Cache frequently accessed data
- Monitor query performance

#### User Experience
- Implement optimistic updates
- Show loading states for long operations
- Provide meaningful error messages
- Support offline functionality where possible

---

## Deployment Guide

### Environment Setup

#### Production Environment Variables
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_DEFAULT_LOCALE=zh
NEXT_PUBLIC_SUPPORTED_LOCALES=zh,en

# AI Configuration
OPENAI_API_KEY=your_openai_api_key
AI_MODEL=gpt-4o

# Security
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://yourdomain.com
```

#### Database Setup
1. **Schema Deployment**: Run `/database/schemas/ai-agent.sql` in Supabase
2. **RLS Policies**: Verify Row Level Security policies are active
3. **Indexes**: Ensure all performance indexes are created
4. **Initial Data**: Run any required data seeding scripts

### Deployment Options

#### Vercel Deployment (Recommended)
1. **Connect Repository**: Link GitHub repository to Vercel
2. **Environment Variables**: Configure in Vercel dashboard
3. **Build Settings**:
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm ci`
4. **Domain Configuration**: Set up custom domain and SSL

#### Docker Deployment
```dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "start"]
```

#### Self-Hosted Deployment
1. **Server Requirements**: Node.js 18+, PM2 or similar process manager
2. **Build Process**: Run `npm run build` on the server
3. **Process Management**: Use PM2 for production process management
4. **Reverse Proxy**: Configure nginx or Apache for HTTPS and static files

### Monitoring and Maintenance

#### Health Monitoring
- **API Health**: Monitor `/api/ai-agent` endpoint
- **Database**: Track connection pool and query performance
- **External Services**: Monitor MCP server connections
- **User Sessions**: Track active sessions and error rates

#### Logging Configuration
```javascript
// Configure structured logging
const logger = {
  info: (message, meta) => console.log(JSON.stringify({ level: 'info', message, ...meta })),
  error: (message, error, meta) => console.error(JSON.stringify({
    level: 'error',
    message,
    error: error.message,
    stack: error.stack,
    ...meta
  }))
}
```

#### Backup Procedures
1. **Database Backups**: Automated daily Supabase backups
2. **User Data**: Export critical user sessions and preferences
3. **Configuration**: Backup environment variables and settings
4. **Disaster Recovery**: Document recovery procedures

### Security Checklist

#### Production Security
- [ ] Enable HTTPS with valid SSL certificates
- [ ] Configure proper CORS policies
- [ ] Set up rate limiting for API endpoints
- [ ] Enable security headers (CSP, HSTS, etc.)
- [ ] Regular dependency security audits
- [ ] Monitor for suspicious activity

#### Data Protection
- [ ] Encrypt sensitive data at rest
- [ ] Implement proper access controls
- [ ] Regular security penetration testing
- [ ] GDPR compliance measures
- [ ] User data export/deletion capabilities

---

## Troubleshooting

### Common Issues

#### Authentication Problems
**Symptom**: Users unable to access AI Agent features
**Diagnosis**:
1. Check Supabase connection and credentials
2. Verify JWT token validity
3. Confirm RLS policies are active
4. Check middleware configuration

**Solutions**:
- Refresh user session
- Verify environment variables
- Check Supabase dashboard for auth errors
- Review middleware logs

#### Plugin Loading Failures
**Symptom**: Plugins show as "error" status
**Diagnosis**:
1. Check plugin configuration validity
2. Verify MCP server connectivity
3. Review plugin dependencies
4. Check execution permissions

**Solutions**:
- Validate plugin configuration schema
- Test MCP server connection manually
- Update plugin dependencies
- Check server firewall settings

#### Performance Issues
**Symptom**: Slow response times or timeouts
**Diagnosis**:
1. Monitor database query performance
2. Check external API response times
3. Review server resource usage
4. Analyze network latency

**Solutions**:
- Optimize database queries and indexes
- Implement caching strategies
- Scale server resources
- Use CDN for static assets

#### Multimodal Content Issues
**Symptom**: Images or files not processing correctly
**Diagnosis**:
1. Check file size and format restrictions
2. Verify storage configuration
3. Review content processing logs
4. Test content validation logic

**Solutions**:
- Adjust file size limits
- Update supported format list
- Fix storage permissions
- Improve error handling

### Debugging Tools

#### Development Debugging
- **React DevTools**: Component state inspection
- **Network Tab**: API request/response analysis
- **Console Logs**: Structured logging output
- **Source Maps**: Original source code debugging

#### Production Monitoring
- **Error Tracking**: Sentry or similar service
- **Performance Monitoring**: Core Web Vitals tracking
- **User Analytics**: Session replay and user behavior
- **API Monitoring**: Response time and error rate tracking

### Support Resources

#### Documentation
- **GitHub Repository**: Source code and issue tracking
- **API Documentation**: Complete endpoint reference
- **Component Library**: UI component documentation
- **Architecture Diagrams**: System design documentation

#### Community
- **GitHub Discussions**: Community Q&A and feature requests
- **Issue Tracker**: Bug reports and feature requests
- **Discord/Slack**: Real-time community support
- **Documentation Wiki**: Community-contributed guides

---

## Appendices

### Plugin Development Guide
- Plugin API reference
- Example plugin implementations
- Testing strategies for plugins
- Publishing and distribution

### MCP Server Integration
- Supported MCP protocol versions
- Authentication methods
- Tool schema specifications
- Best practices for server development

### Deployment Configurations
- Environment-specific configurations
- Security hardening guidelines
- Performance optimization settings
- Monitoring setup instructions

### Change Log
- Version history
- Breaking changes
- Migration guides
- Deprecated features

---

This documentation is maintained by the development team and updated with each release. For the latest information, please refer to the project repository and release notes.