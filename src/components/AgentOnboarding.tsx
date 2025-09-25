'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Bot, CheckCircle, MessageCircle, Settings, History, ArrowRight, ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Suggestion, Actions } from '@/components/ai-elements';
import { cn } from '@/lib/utils';

interface OnboardingStep {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  descriptionKey: string;
  features: string[];
  suggestion?: {
    text: string;
    action?: () => void;
  };
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary';
  }>;
}

interface AgentOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function AgentOnboarding({ isOpen, onClose, onComplete }: AgentOnboardingProps) {
  const t = useTranslations('aiAgent.onboarding');
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isAnimating, setIsAnimating] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      icon: Bot,
      titleKey: 'steps.welcome.title',
      descriptionKey: 'steps.welcome.description',
      features: [
        'steps.welcome.features.intelligent',
        'steps.welcome.features.multimodal',
        'steps.welcome.features.tools'
      ],
      suggestion: {
        text: t('steps.welcome.suggestion'),
      }
    },
    {
      id: 'conversation',
      icon: MessageCircle,
      titleKey: 'steps.conversation.title',
      descriptionKey: 'steps.conversation.description',
      features: [
        'steps.conversation.features.naturalLanguage',
        'steps.conversation.features.codeGeneration',
        'steps.conversation.features.multiModal'
      ],
      actions: [
        {
          label: t('steps.conversation.tryExample'),
          action: () => {
            // 模拟尝试对话示例
            setCompletedSteps(prev => new Set(prev).add(currentStep));
          },
          variant: 'primary'
        }
      ]
    },
    {
      id: 'features',
      icon: Settings,
      titleKey: 'steps.features.title',
      descriptionKey: 'steps.features.description',
      features: [
        'steps.features.modes',
        'steps.features.plugins',
        'steps.features.preferences'
      ],
      actions: [
        {
          label: t('steps.features.exploreSettings'),
          action: () => {
            setCompletedSteps(prev => new Set(prev).add(currentStep));
          },
          variant: 'secondary'
        }
      ]
    },
    {
      id: 'history',
      icon: History,
      titleKey: 'steps.history.title',
      descriptionKey: 'steps.history.description',
      features: [
        'steps.history.autoSave',
        'steps.history.search',
        'steps.history.export'
      ]
    }
  ];

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setCompletedSteps(new Set());
    }
  }, [isOpen]);

  const handleNext = async () => {
    if (isLastStep) {
      await handleComplete();
      return;
    }

    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
      setIsAnimating(false);
    }, 150);
  };

  const handlePrevious = () => {
    if (isFirstStep) return;

    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(prev => Math.max(prev - 1, 0));
      setIsAnimating(false);
    }, 150);
  };

  const handleComplete = async () => {
    // 标记引导为已完成
    localStorage.setItem('agentOnboardingCompleted', 'true');
    onComplete();
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem('agentOnboardingSkipped', 'true');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl">
        <Card className="relative overflow-hidden">
          {/* Header */}
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">{t('title')}</CardTitle>
                  <CardDescription>{t('subtitle')}</CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkip}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{t('progress.step', { current: currentStep + 1, total: steps.length })}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardHeader>

          {/* Content */}
          <CardContent className="space-y-6">
            <div className={cn(
              "transition-all duration-300",
              isAnimating && "opacity-0 transform translate-x-4"
            )}>
              {/* Step Icon and Title */}
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <currentStepData.icon className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold">{t(currentStepData.titleKey)}</h3>
                  <p className="text-muted-foreground mt-1">
                    {t(currentStepData.descriptionKey)}
                  </p>
                </div>
                {completedSteps.has(currentStep) && (
                  <CheckCircle className="h-6 w-6 text-green-500 ml-auto" />
                )}
              </div>

              {/* Features List */}
              <div className="grid gap-3">
                {currentStepData.features.map((featureKey, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span className="text-sm">{t(featureKey)}</span>
                  </div>
                ))}
              </div>

              {/* Interactive Elements */}
              <div className="space-y-4 pt-4">
                {/* Suggestion */}
                {currentStepData.suggestion && (
                  <div className="border rounded-lg p-4 bg-background/50">
                    <p className="text-sm text-muted-foreground mb-3">{t('interactive.suggestion')}</p>
                    <Suggestion
                      text={currentStepData.suggestion.text}
                      onSelect={currentStepData.suggestion.action}
                    />
                  </div>
                )}

                {/* Actions */}
                {currentStepData.actions && (
                  <div className="border rounded-lg p-4 bg-background/50">
                    <p className="text-sm text-muted-foreground mb-3">{t('interactive.actions')}</p>
                    <Actions
                      actions={currentStepData.actions.map(action => ({
                        label: action.label,
                        description: '',
                        action: action.action
                      }))}
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>

          {/* Footer */}
          <CardFooter className="flex items-center justify-between pt-6 border-t">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={isFirstStep}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('navigation.previous')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-muted-foreground"
              >
                {t('navigation.skip')}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {/* Step Indicators */}
              <div className="flex gap-2 mr-4">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      index === currentStep ? "bg-primary" :
                      index < currentStep ? "bg-primary/50" : "bg-muted"
                    )}
                  />
                ))}
              </div>

              <Button onClick={handleNext} className="min-w-[100px]">
                {isLastStep ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t('navigation.complete')}
                  </>
                ) : (
                  <>
                    {t('navigation.next')}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

// 导出用于检查是否需要显示引导的hook
export function useAgentOnboarding() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('agentOnboardingCompleted');
    const skipped = localStorage.getItem('agentOnboardingSkipped');

    // 如果既没有完成也没有跳过，则显示引导
    setShouldShow(!completed && !skipped);
  }, []);

  const markAsCompleted = () => {
    localStorage.setItem('agentOnboardingCompleted', 'true');
    setShouldShow(false);
  };

  const markAsSkipped = () => {
    localStorage.setItem('agentOnboardingSkipped', 'true');
    setShouldShow(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem('agentOnboardingCompleted');
    localStorage.removeItem('agentOnboardingSkipped');
    setShouldShow(true);
  };

  return {
    shouldShow,
    markAsCompleted,
    markAsSkipped,
    resetOnboarding
  };
}