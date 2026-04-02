import { useThreadSidebar } from '@/features/app/hooks';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ThreadContent } from './tread-content';

const ThreadContentWrapper = memo(() => {
  const { t } = useTranslation('common');
  const { parentMessageId, channelId } = useThreadSidebar();

  if (!parentMessageId || !channelId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-muted-foreground">{t('noThreadSelected')}</span>
      </div>
    );
  }

  return (
    <ThreadContent parentMessageId={parentMessageId} channelId={channelId} />
  );
});

type TThreadSidebarProps = {
  isOpen: boolean;
};

const ThreadSidebar = memo(({ isOpen }: TThreadSidebarProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-20 flex min-h-0 min-w-0 flex-col bg-[#182433] text-[#d7e2f0]">
      <ThreadContentWrapper />
    </div>
  );
});

export { ThreadSidebar };
