'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Message,
  MessageContent,
  MessageAvatar,
  Conversation,
  ConversationContent,
  ConversationEmptyState
} from '@/components/ai-elements';
import { useRouter } from '@/i18n/navigation';
import {
  Bot,
  User,
  Code,
  Lightbulb,
  BookOpen,
  Calculator,
  Languages,
  Palette,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DemoMessage {
  role: 'user' | 'assistant';
  content: string;
  avatar?: string;
  delay?: number;
}

interface FeatureDemo {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  badge: string;
  messages: DemoMessage[];
}

const featureDemos: FeatureDemo[] = [
  {
    id: 'coding',
    title: '代码助手',
    description: '智能编程辅助，从代码生成到问题调试',
    icon: <Code className="h-5 w-5" />,
    badge: '编程',
    messages: [
      {
        role: 'user',
        content: '帮我写一个React组件，用于显示用户列表',
        delay: 500
      },
      {
        role: 'assistant',
        content: `好的！我为您创建一个用户列表组件：

\`\`\`jsx
import React from 'react';

const UserList = ({ users }) => {
  return (
    <div className="space-y-2">
      {users.map(user => (
        <div key={user.id} className="flex items-center p-3 border rounded">
          <img src={user.avatar} className="w-10 h-10 rounded-full" />
          <div className="ml-3">
            <h3 className="font-medium">{user.name}</h3>
            <p className="text-gray-500">{user.email}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
\`\`\`

这个组件包含了头像、姓名和邮箱显示，您可以根据需要进一步定制样式！`,
        delay: 2000
      }
    ]
  },
  {
    id: 'creative',
    title: '创意助手',
    description: '头脑风暴、创意策划、方案设计',
    icon: <Lightbulb className="h-5 w-5" />,
    badge: '创意',
    messages: [
      {
        role: 'user',
        content: '我需要为咖啡店策划一个夏日活动',
        delay: 500
      },
      {
        role: 'assistant',
        content: `为您的咖啡店策划了几个夏日活动方案：

🌟 **冰咖啡节**
- 推出限定夏日冰饮系列
- 顾客可以DIY调制自己的冰咖啡
- 设置拍照打卡区域

🎵 **夏夜音乐会**
- 邀请当地音乐人现场演出
- 营造轻松的夏夜氛围
- 搭配特调饮品和小食

🎨 **咖啡艺术工作坊**
- 教授咖啡拉花技巧
- 举办咖啡豆烘焙体验
- 让顾客参与咖啡制作全过程

哪个方案您觉得最适合呢？我可以为您详细规划具体细节！`,
        delay: 2500
      }
    ]
  },
  {
    id: 'learning',
    title: '学习助手',
    description: '知识解答、概念解释、学习指导',
    icon: <BookOpen className="h-5 w-5" />,
    badge: '学习',
    messages: [
      {
        role: 'user',
        content: '请解释什么是机器学习，用简单的例子',
        delay: 500
      },
      {
        role: 'assistant',
        content: `机器学习就像教电脑"学会"识别模式，让我用一个简单例子：

🍎 **水果识别**
想象您要教电脑区分苹果和橙子：

1. **数据收集**: 给电脑看1000张苹果和橙子的照片
2. **特征学习**: 电脑学会识别颜色、形状、纹理等特征
3. **模式识别**: 电脑发现苹果通常是红色/绿色、圆形，橙子是橙色、表面有纹理
4. **预测能力**: 现在给电脑一张新照片，它就能判断是苹果还是橙子

这就是机器学习的基本原理：通过大量数据训练，让计算机自动发现规律并做出预测！

在实际应用中，这个原理被用于：
- 推荐系统（如Netflix推荐电影）
- 语音识别（如Siri理解您的话）
- 图像识别（如手机相册自动分类）`,
        delay: 3000
      }
    ]
  },
  {
    id: 'translation',
    title: '翻译助手',
    description: '多语言翻译、文化适应、语言学习',
    icon: <Languages className="h-5 w-5" />,
    badge: '语言',
    messages: [
      {
        role: 'user',
        content: '帮我把这句话翻译成英文：我们的产品具有创新性和实用性',
        delay: 500
      },
      {
        role: 'assistant',
        content: `这句话可以翻译为：

**"Our product is both innovative and practical."**

📝 **其他表达方式**：
- "Our product combines innovation with practicality."
- "Our product features both innovation and practical utility."

💡 **使用场景建议**：
- 商业演示：推荐第一种，简洁有力
- 产品介绍：第二种更加详细
- 技术文档：第三种更为正式

需要我为特定场景优化翻译吗？`,
        delay: 1500
      }
    ]
  }
];

interface AgentFeaturePreviewProps {
  className?: string;
}

export default function AgentFeaturePreview({ className }: AgentFeaturePreviewProps) {
  const [selectedDemo, setSelectedDemo] = useState<string>(featureDemos[0].id);
  const [displayedMessages, setDisplayedMessages] = useState<DemoMessage[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const router = useRouter();

  const currentDemo = featureDemos.find(demo => demo.id === selectedDemo);

  // Auto-play demo messages
  useEffect(() => {
    if (!isPlaying || !currentDemo) return;

    const messages = currentDemo.messages;
    if (currentMessageIndex >= messages.length) {
      setIsPlaying(false);
      return;
    }

    const currentMessage = messages[currentMessageIndex];
    const timer = setTimeout(() => {
      setDisplayedMessages(prev => [...prev, currentMessage]);
      setCurrentMessageIndex(prev => prev + 1);
    }, currentMessage.delay || 1000);

    return () => clearTimeout(timer);
  }, [isPlaying, currentMessageIndex, currentDemo]);

  const handleDemoSelect = (demoId: string) => {
    setSelectedDemo(demoId);
    setDisplayedMessages([]);
    setCurrentMessageIndex(0);
    setIsPlaying(false);
  };

  const handlePlayDemo = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (currentMessageIndex >= (currentDemo?.messages.length || 0)) {
        // Restart from beginning
        setDisplayedMessages([]);
        setCurrentMessageIndex(0);
      }
      setIsPlaying(true);
    }
  };

  const handleResetDemo = () => {
    setDisplayedMessages([]);
    setCurrentMessageIndex(0);
    setIsPlaying(false);
  };

  if (!currentDemo) return null;

  return (
    <section className={cn("container py-16", className)}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">体验 AI 助手的强大能力</h2>
          <p className="text-xl text-muted-foreground">
            选择一个场景，观看真实的对话演示
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Feature Selection */}
          <div className="lg:col-span-1">
            <h3 className="text-lg font-semibold mb-4">功能演示</h3>
            <div className="space-y-3">
              {featureDemos.map((demo) => (
                <Card
                  key={demo.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selectedDemo === demo.id
                      ? "ring-2 ring-primary bg-primary/5"
                      : "hover:bg-accent/50"
                  )}
                  onClick={() => handleDemoSelect(demo.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {demo.icon}
                        </div>
                        <div>
                          <CardTitle className="text-base">{demo.title}</CardTitle>
                          <Badge variant="secondary" className="text-xs">
                            {demo.badge}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <CardDescription className="text-sm">
                      {demo.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">
                喜欢您看到的演示吗？
              </p>
              <Button
                onClick={() => router.push('/register')}
                className="w-full"
                size="sm"
              >
                立即开始使用
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Demo Conversation */}
          <div className="lg:col-span-2">
            <Card className="h-[500px] flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {currentDemo.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{currentDemo.title}</CardTitle>
                      <CardDescription>{currentDemo.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetDemo}
                      disabled={displayedMessages.length === 0}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={isPlaying ? "secondary" : "default"}
                      size="sm"
                      onClick={handlePlayDemo}
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      {isPlaying ? '暂停' : '播放'}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 p-0">
                <div className="h-full bg-muted/20 rounded-lg m-4">
                  <Conversation className="h-full">
                    <ConversationContent>
                      {displayedMessages.length === 0 ? (
                        <ConversationEmptyState
                          title="准备开始演示"
                          description="点击播放按钮观看 AI 助手的实际对话演示"
                          icon={<Bot className="h-12 w-12 text-muted-foreground" />}
                        />
                      ) : (
                        <div className="space-y-4">
                          {displayedMessages.map((message, index) => (
                            <Message
                              key={index}
                              from={message.role}
                              className="animate-in slide-in-from-bottom-2 duration-300"
                            >
                              <MessageAvatar
                                src={message.role === 'user'
                                  ? '/avatar-user.png'
                                  : '/avatar-ai.png'
                                }
                                name={message.role === 'user' ? 'User' : 'AI'}
                              />
                              <MessageContent variant="contained">
                                <div className="whitespace-pre-wrap">
                                  {message.content}
                                </div>
                              </MessageContent>
                            </Message>
                          ))}
                          {isPlaying && currentMessageIndex < currentDemo.messages.length && (
                            <div className="flex items-center space-x-2 text-muted-foreground">
                              <Bot className="h-4 w-4 animate-pulse" />
                              <span className="text-sm">AI 正在思考...</span>
                            </div>
                          )}
                        </div>
                      )}
                    </ConversationContent>
                  </Conversation>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <div className="inline-flex items-center space-x-4 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg">
            <Bot className="h-8 w-8 text-primary" />
            <div className="text-left">
              <h3 className="font-semibold">准备好开始您的 AI 之旅了吗？</h3>
              <p className="text-sm text-muted-foreground">
                注册账户，体验更多强大功能
              </p>
            </div>
            <Button onClick={() => router.push('/register')}>
              免费开始
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}