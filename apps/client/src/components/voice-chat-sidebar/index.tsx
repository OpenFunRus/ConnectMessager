import { TextChannel } from '@/components/channel-view/text';
import { closeVoiceChatSidebar } from '@/features/app/actions';
import { useVoiceChatSidebar } from '@/features/app/hooks';
import { memo } from 'react';

const VoiceChatSidebar = memo(() => {
  const { isOpen, channelId } = useVoiceChatSidebar();

  if (!isOpen || !channelId) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-20 flex min-h-0 min-w-0 flex-col bg-[#182433] text-[#d7e2f0]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TextChannel channelId={channelId} onClose={closeVoiceChatSidebar} />
      </div>
    </div>
  );
});

export { VoiceChatSidebar };
