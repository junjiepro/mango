'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { feedbackService, type FeedbackType } from '@/services/FeedbackService';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rating: 'positive' | 'negative' | null;
  messageId?: string;
  taskId?: string;
  conversationId?: string;
  feedbackType: FeedbackType;
  onSubmit?: () => void;
}

export function FeedbackDialog({
  open,
  onOpenChange,
  rating,
  messageId,
  taskId,
  conversationId,
  feedbackType,
  onSubmit,
}: FeedbackDialogProps) {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return;

    setSubmitting(true);
    try {
      await feedbackService.createFeedback({
        message_id: messageId,
        task_id: taskId,
        conversation_id: conversationId,
        feedback_type: feedbackType,
        rating,
        comment: comment || undefined,
      });

      onOpenChange(false);
      setComment('');
      onSubmit?.();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {rating === 'positive' ? '感谢您的好评！' : '感谢您的反馈'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            placeholder={
              rating === 'positive'
                ? '告诉我们哪里做得好...'
                : '告诉我们如何改进...'
            }
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? '提交中...' : '提交'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
