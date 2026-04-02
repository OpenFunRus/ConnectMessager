import { TextChannel } from '@/components/channel-view/text';
import { VoiceChannel } from '@/components/channel-view/voice';
import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import { ThreadSidebar } from '@/components/thread-sidebar';
import { VoiceChatSidebar } from '@/components/voice-chat-sidebar';
import {
  useSelectedChannelId,
  useSelectedChannelType
} from '@/features/server/channels/hooks';
import { ChannelType, PluginSlot } from '@connectmessager/shared';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TContentWrapperProps = {
  isDmMode: boolean;
  selectedDmChannelId?: number;
  isThreadOpen: boolean;
};

const ContentWrapper = memo(
  ({ isDmMode, selectedDmChannelId, isThreadOpen }: TContentWrapperProps) => {
    const { t } = useTranslation();
    const selectedChannelId = useSelectedChannelId();
    const selectedChannelType = useSelectedChannelType();
    const welcomeServerName = t('common:appName');

    let content;

    if (isDmMode) {
      if (selectedDmChannelId) {
        content = (
          <TextChannel
            key={selectedDmChannelId}
            channelId={selectedDmChannelId}
          />
        );
      } else {
        content = (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {t('selectDmPrompt')}
          </div>
        );
      }

      return (
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-[#182433] text-[#d7e2f0]">
          {content}
          <VoiceChatSidebar />
          <ThreadSidebar isOpen={isThreadOpen} />
        </main>
      );
    }

    if (selectedChannelId) {
      if (selectedChannelType === ChannelType.TEXT) {
        content = (
          <TextChannel key={selectedChannelId} channelId={selectedChannelId} />
        );
      } else if (selectedChannelType === ChannelType.VOICE) {
        content = (
          <VoiceChannel key={selectedChannelId} channelId={selectedChannelId} />
        );
      }
    } else {
      content = (
        <div className="flex h-full w-full flex-col items-center justify-center gap-5 overflow-auto px-6 py-10 text-center">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">
              {t('welcomeToServer', { name: welcomeServerName })}
            </h2>
          </div>
          <div className="max-w-md rounded-2xl border border-[#2b3544] bg-[#172231] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            <p className="text-sm leading-6 text-[#9fb2c8]">
              {t('mobileMenuButtonsHint')}
            </p>
          </div>
          <div className="hidden w-full max-w-4xl lg:block">
            <PluginSlotRenderer slotId={PluginSlot.HOME_SCREEN} />
          </div>
        </div>
      );
    }

    return (
      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-[#182433] text-[#d7e2f0]">
        {content}
        <VoiceChatSidebar />
        <ThreadSidebar isOpen={isThreadOpen} />
      </main>
    );
  }
);

export { ContentWrapper };


