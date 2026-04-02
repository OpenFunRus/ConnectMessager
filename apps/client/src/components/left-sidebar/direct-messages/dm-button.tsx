import { setDmsOpen } from '@/features/app/actions';
import { useDmsOpen } from '@/features/app/hooks';
import { useDirectMessagesUnreadCount } from '@/features/server/channels/hooks';
import { cn, Tooltip } from '@connectmessager/ui';
import { MessageCircleMore, X } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const DmButton = memo(() => {
  const { t } = useTranslation('sidebar');
  const directMessagesUnreadCount = useDirectMessagesUnreadCount();
  const dmsOpen = useDmsOpen();

  const onToggleDmMode = useCallback(() => {
    setDmsOpen(!dmsOpen);
  }, [dmsOpen]);

  return (
    <div className="border-b border-[#2b3544] bg-[#172231]/70 px-2 py-2">
      <Tooltip
        content={dmsOpen ? t('closeDirectMessages') : t('openDirectMessages')}
      >
        <button
          type="button"
          onClick={onToggleDmMode}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg border border-transparent px-2.5 py-2 text-sm font-medium text-[#9fb2c8] transition-all hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white',
            dmsOpen &&
              'border-[#2f7ad1]/35 bg-[#206bc4]/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
          )}
        >
          <MessageCircleMore className="h-4 w-4" />
          <span className="flex-1 text-left">{t('directMessages')}</span>
          {dmsOpen && <X className="h-4 w-4" />}
          {directMessagesUnreadCount > 0 && (
            <div className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#206bc4] px-1.5 text-xs font-semibold text-white">
              {directMessagesUnreadCount > 99
                ? '99+'
                : directMessagesUnreadCount}
            </div>
          )}
        </button>
      </Tooltip>
    </div>
  );
});

export { DmButton };


