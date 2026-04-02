import { toggleVoiceChatSidebar } from '@/features/app/actions';
import { useVoiceChatSidebar } from '@/features/app/hooks';
import {
  useCurrentVoiceChannelId,
  useIsCurrentVoiceChannelSelected
} from '@/features/server/channels/hooks';
import { usePublicServerSettings } from '@/features/server/hooks';
import { cn } from '@/lib/utils';
import { PluginSlot } from '@connectmessager/shared';
import { Button, Tooltip } from '@connectmessager/ui';
import {
  MessageSquare,
  PanelRight,
  PanelRightClose
} from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PluginSlotRenderer } from '../plugin-slot-renderer';
import { ServerSearch } from './server-search';
import { VoiceOptionsController } from './voice-options-controller';
import { VolumeController } from './volume-controller';

type TTopBarProps = {
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
  isLeftOpen: boolean;
  isRightOpen: boolean;
};

const TopBar = memo(
  ({
    onToggleLeftSidebar,
    onToggleRightSidebar,
    isLeftOpen,
    isRightOpen
  }: TTopBarProps) => {
  const { t } = useTranslation('topbar');
  const isCurrentVoiceChannelSelected = useIsCurrentVoiceChannelSelected();
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const settings = usePublicServerSettings();
  const { isOpen: isAnyVoiceChatOpen, channelId: openVoiceChatChannelId } =
    useVoiceChatSidebar();

  const isVoiceChatOpen =
    isAnyVoiceChatOpen && openVoiceChatChannelId === currentVoiceChannelId;

  const handleToggleVoiceChat = useCallback(() => {
    if (currentVoiceChannelId) {
      toggleVoiceChatSidebar(currentVoiceChannelId);
    }
  }, [currentVoiceChannelId]);

  return (
    <div className="relative z-30 flex h-14 w-full items-center gap-2 border-b border-[#2b3544] bg-[#182433] px-3 text-[#d7e2f0] transition-all duration-300 ease-in-out lg:gap-3 lg:px-4">
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleLeftSidebar}
          className="h-9 rounded-lg border border-[#314055] !bg-[#172231] px-2.5 text-[#8fa2bb] transition-all duration-200 ease-in-out hover:border-[#3d516b] hover:!bg-[#1b2940] hover:text-white"
        >
          <Tooltip
            content={isLeftOpen ? t('closeSidebar') : t('openSidebar')}
            asChild={false}
          >
            <div>
              {isLeftOpen ? (
                <PanelRightClose className="h-4 w-4 rotate-180 transition-transform duration-200 ease-in-out" />
              ) : (
                <PanelRight className="h-4 w-4 rotate-180 transition-transform duration-200 ease-in-out" />
              )}
            </div>
          </Tooltip>
        </Button>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center">
        {settings?.enableSearch && (
          <div className="w-full max-w-2xl">
            <ServerSearch />
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2">
        <PluginSlotRenderer slotId={PluginSlot.TOPBAR_RIGHT} />
        {isCurrentVoiceChannelSelected && currentVoiceChannelId && (
          <>
            <VoiceOptionsController />
            <VolumeController channelId={currentVoiceChannelId} />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleVoiceChat}
              className="h-9 rounded-lg border border-[#314055] !bg-[#172231] px-2.5 text-[#8fa2bb] transition-all duration-200 ease-in-out hover:border-[#3d516b] hover:!bg-[#1b2940] hover:text-white"
            >
              <Tooltip
                content={
                  isVoiceChatOpen ? t('closeVoiceChat') : t('openVoiceChat')
                }
                asChild={false}
              >
                <MessageSquare
                  className={cn(
                    'w-4 h-4 transition-all duration-200 ease-in-out',
                    isVoiceChatOpen && 'fill-current'
                  )}
                />
              </Tooltip>
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleRightSidebar}
          className="h-9 rounded-lg border border-[#314055] !bg-[#172231] px-2.5 text-[#8fa2bb] transition-all duration-200 ease-in-out hover:border-[#3d516b] hover:!bg-[#1b2940] hover:text-white"
        >
          {isRightOpen ? (
            <Tooltip content={t('closeMembersSidebar')}>
              <div>
                <PanelRightClose className="w-4 h-4 transition-transform duration-200 ease-in-out" />
              </div>
            </Tooltip>
          ) : (
            <Tooltip content={t('openMembersSidebar')}>
              <div>
                <PanelRight className="w-4 h-4 transition-transform duration-200 ease-in-out" />
              </div>
            </Tooltip>
          )}
        </Button>
      </div>
    </div>
  );
});

export { TopBar };


