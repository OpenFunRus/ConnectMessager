import { openServerScreen } from '@/features/server-screens/actions';
import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { useChannelCan } from '@/features/server/hooks';
import { useOwnPublicUser } from '@/features/server/users/hooks';
import { useVoice } from '@/features/server/voice/hooks';
import { cn } from '@/lib/utils';
import { ChannelPermission } from '@connectmessager/shared';
import { Button } from '@connectmessager/ui';
import { HeadphoneOff, Headphones, Mic, MicOff, Settings } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ServerScreen } from '../server-screens/screens';
import { UserAvatar } from '../user-avatar';
import { UserPopover } from '../user-popover';

const UserControl = memo(() => {
  const { t } = useTranslation('sidebar');
  const ownPublicUser = useOwnPublicUser();
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const { ownVoiceState, toggleMic, toggleSound } = useVoice();
  const channelCan = useChannelCan(currentVoiceChannelId);

  const handleSettingsClick = useCallback(() => {
    openServerScreen(ServerScreen.USER_SETTINGS);
  }, []);

  if (!ownPublicUser) return null;

  return (
    <div className="flex h-16 items-center justify-between border-t border-[#2b3544] bg-[#172231] px-3">
      <UserPopover userId={ownPublicUser.id}>
        <div className="flex min-w-0 flex-1 cursor-pointer items-center space-x-3 rounded-lg border border-transparent p-1.5 transition-colors hover:border-[#3d516b] hover:bg-[#1b2940]">
          <UserAvatar
            userId={ownPublicUser.id}
            className="h-9 w-9 flex-shrink-0"
            showUserPopover={false}
          />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="truncate text-sm font-semibold text-white">
              {ownPublicUser.name}
            </span>
            <div className="flex items-center space-x-1">
              <span className="text-xs capitalize text-[#8fa2bb]">
                {ownPublicUser.status}
              </span>
            </div>
          </div>
        </div>
      </UserPopover>

      <div className="flex items-center space-x-0.5">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 rounded-lg border border-[#314055] !bg-[#172231] text-[#8fa2bb] hover:border-[#3d516b] hover:!bg-[#1b2940] hover:text-white',
            ownVoiceState.micMuted
              ? 'border-red-500/20 !bg-red-500/10 text-red-500 hover:!bg-red-500/20 hover:text-red-400'
              : 'text-[#8fa2bb] hover:text-white'
          )}
          onClick={toggleMic}
          title={ownVoiceState.micMuted ? t('unmuteMic') : t('muteMic')}
          disabled={!channelCan(ChannelPermission.SPEAK)}
        >
          {ownVoiceState.micMuted ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 rounded-lg border border-[#314055] !bg-[#172231] text-[#8fa2bb] hover:border-[#3d516b] hover:!bg-[#1b2940] hover:text-white',
            ownVoiceState.soundMuted
              ? 'border-red-500/20 !bg-red-500/10 text-red-500 hover:!bg-red-500/20 hover:text-red-400'
              : 'text-[#8fa2bb] hover:text-white'
          )}
          onClick={toggleSound}
          title={ownVoiceState.soundMuted ? t('undeafen') : t('deafen')}
        >
          {ownVoiceState.soundMuted ? (
            <HeadphoneOff className="h-4 w-4" />
          ) : (
            <Headphones className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg border border-[#314055] !bg-[#172231] text-[#8fa2bb] hover:border-[#3d516b] hover:!bg-[#1b2940] hover:text-white"
          onClick={handleSettingsClick}
          title={t('userSettings')}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

export { UserControl };


