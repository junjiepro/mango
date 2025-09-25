/**
 * AI Elements Components Library
 *
 * A comprehensive collection of React components for building AI-powered interfaces.
 * All components are designed to work seamlessly with the Next.js app and follow
 * consistent design patterns using Tailwind CSS and shadcn/ui.
 */

// Core Conversation Components
export {
  Message,
  MessageContent,
  MessageAvatar,
  type MessageProps,
  type MessageContentProps,
  type MessageAvatarProps,
} from './message';

export {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
  type ConversationProps,
  type ConversationContentProps,
  type ConversationEmptyStateProps,
  type ConversationScrollButtonProps,
} from './conversation';

// Input and Interaction Components
export {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputButton,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionMenuItem,
  PromptInputSubmit,
  PromptInputModelSelect,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectValue,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputActionAddAttachments,
  usePromptInputAttachments,
  type PromptInputProps,
  type PromptInputBodyProps,
  type PromptInputTextareaProps,
  type PromptInputToolbarProps,
  type PromptInputToolsProps,
  type PromptInputButtonProps,
  type PromptInputActionMenuProps,
  type PromptInputActionMenuTriggerProps,
  type PromptInputActionMenuContentProps,
  type PromptInputActionMenuItemProps,
  type PromptInputSubmitProps,
  type PromptInputModelSelectProps,
  type PromptInputModelSelectTriggerProps,
  type PromptInputModelSelectContentProps,
  type PromptInputModelSelectItemProps,
  type PromptInputModelSelectValueProps,
  type PromptInputAttachmentProps,
  type PromptInputAttachmentsProps,
  type PromptInputActionAddAttachmentsProps,
  type PromptInputMessage,
} from './prompt-input';

export {
  Suggestions,
  Suggestion,
  type SuggestionsProps,
  type SuggestionProps,
} from './suggestion';

export {
  Actions,
  Action,
  type ActionsProps,
  type ActionProps,
} from './actions';

// Response and Content Components
export {
  Response,
  type ResponseProps,
} from './response';

export {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockContent,
  CodeBlockCopyButton,
  type CodeBlockProps,
  type CodeBlockHeaderProps,
  type CodeBlockContentProps,
  type CodeBlockCopyButtonProps,
} from './code-block';

export {
  Artifact,
  ArtifactContent,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactDescription,
  type ArtifactProps,
  type ArtifactContentProps,
  type ArtifactHeaderProps,
  type ArtifactTitleProps,
  type ArtifactDescriptionProps,
} from './artifact';

// Advanced AI Components
export {
  ChainOfThought,
  ChainOfThoughtStep,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  type ChainOfThoughtProps,
  type ChainOfThoughtStepProps,
  type ChainOfThoughtHeaderProps,
  type ChainOfThoughtContentProps,
} from './chain-of-thought';

export {
  Reasoning,
  ReasoningStep,
  ReasoningHeader,
  ReasoningContent,
  type ReasoningProps,
  type ReasoningStepProps,
  type ReasoningHeaderProps,
  type ReasoningContentProps,
} from './reasoning';

export {
  Context,
  ContextContent,
  ContextHeader,
  ContextItem,
  ContextItemContent,
  ContextItemHeader,
  ContextItemTitle,
  ContextItemDescription,
  type ContextProps,
  type ContextContentProps,
  type ContextHeaderProps,
  type ContextItemProps,
  type ContextItemContentProps,
  type ContextItemHeaderProps,
  type ContextItemTitleProps,
  type ContextItemDescriptionProps,
} from './context';

// Utility and Display Components
export {
  Loader,
  type LoaderProps,
} from './loader';

export {
  Image,
  type ImageProps,
} from './image';

export {
  Sources,
  type SourcesProps,
} from './sources';

export {
  InlineCitation,
  type InlineCitationProps,
} from './inline-citation';

export {
  Task,
  TaskHeader,
  TaskContent,
  type TaskProps,
  type TaskHeaderProps,
  type TaskContentProps,
} from './task';

export {
  Tool,
  ToolHeader,
  ToolContent,
  ToolResult,
  type ToolProps,
  type ToolHeaderProps,
  type ToolContentProps,
  type ToolResultProps,
} from './tool';

// Interactive and Navigation Components
export {
  Branch,
  BranchHeader,
  BranchContent,
  BranchNavigation,
  BranchNavigationButton,
  type BranchProps,
  type BranchHeaderProps,
  type BranchContentProps,
  type BranchNavigationProps,
  type BranchNavigationButtonProps,
} from './branch';

export {
  OpenInChat,
  OpenInChatButton,
  OpenInChatContent,
  OpenInChatProvider,
  useOpenInChatContext,
  type OpenInChatProps,
  type OpenInChatButtonProps,
  type OpenInChatContentProps,
  type OpenInChatContextValue,
} from './open-in-chat';

export {
  WebPreview,
  WebPreviewHeader,
  WebPreviewContent,
  WebPreviewFooter,
  type WebPreviewProps,
  type WebPreviewHeaderProps,
  type WebPreviewContentProps,
  type WebPreviewFooterProps,
} from './web-preview';

/**
 * Component Usage Guidelines:
 *
 * 1. **Message Components**: Use for displaying individual messages in a conversation
 *    - Message: Container for a single message
 *    - MessageContent: Content area with styling variants
 *    - MessageAvatar: User/AI avatar with fallback
 *
 * 2. **Conversation Components**: Use for managing chat interfaces
 *    - Conversation: Auto-scrolling conversation container
 *    - ConversationContent: Content wrapper with padding
 *    - ConversationEmptyState: Placeholder when no messages
 *
 * 3. **Input Components**: Use for user interaction
 *    - PromptInput: Advanced input with file upload, suggestions
 *    - Suggestions: Horizontal scrollable suggestion chips
 *    - Actions: Action buttons with tooltips
 *
 * 4. **Response Components**: Use for AI-generated content
 *    - Response: Simple response wrapper
 *    - CodeBlock: Syntax-highlighted code with copy button
 *    - Artifact: Rich content artifacts
 *
 * 5. **Advanced AI Components**: Use for complex AI interactions
 *    - ChainOfThought: Step-by-step reasoning display
 *    - Reasoning: AI reasoning process visualization
 *    - Context: Context information display
 *
 * 6. **Utility Components**: Use for enhanced functionality
 *    - Loader: Loading states and spinners
 *    - Image: Optimized image display
 *    - Sources: Reference and citation display
 *
 * All components are:
 * - TypeScript-first with comprehensive type definitions
 * - Accessible with proper ARIA attributes
 * - Responsive and mobile-friendly
 * - Themeable with CSS custom properties
 * - Compatible with Next.js App Router and RSC
 */