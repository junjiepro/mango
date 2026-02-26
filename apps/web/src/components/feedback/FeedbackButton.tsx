'use client';

import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FeedbackDialog } from './FeedbackDialog';
import type { FeedbackType } from '@/services/FeedbackService';

interface FeedbackButtonProps {
  messageId?: string;
  taskId?: string;
  conversationId?: string;
  feedbackType?: FeedbackType;
  onFeedbackSubmit?: () => void;
}

export const FeedbackButton = React.memo(function FeedbackButton({
  messageId,
  taskId,
  conversationId,
  feedbackType = 'satisfaction',
  onFeedbackSubmit,
}: FeedbackButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState<'positive' | 'negative' | null>(null);

  const handleClick = (rating: 'positive' | 'negative') => {
    setSelectedRating(rating);
    setDialogOpen(true);
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleClick('positive')}
          className="h-7 w-7 p-0"
        >
          <ThumbsUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleClick('negative')}
          className="h-7 w-7 p-0"
        >
          <ThumbsDown className="h-4 w-4" />
        </Button>
      </div>

      <FeedbackDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        rating={selectedRating}
        messageId={messageId}
        taskId={taskId}
        conversationId={conversationId}
        feedbackType={feedbackType}
        onSubmit={onFeedbackSubmit}
      />
    </>
  );
});
