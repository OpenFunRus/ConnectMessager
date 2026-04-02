import { ResizableSidebar } from '@/components/resizable-sidebar';
import { useDmsOpen } from '@/features/app/hooks';
import { setSelectedChannelId } from '@/features/server/channels/actions';
import {
  usePublicServerSettings,
  useServerName
} from '@/features/server/hooks';
import { LocalStorageKey } from '@/helpers/storage';
import { cn } from '@/lib/utils';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Categories } from './categories';
import { DirectMessages } from './direct-messages';
import { DmButton } from './direct-messages/dm-button';
import { ServerDropdownMenu } from './server-dropdown';
import { UserControl } from './user-control';
import { VoiceControl } from './voice-control';

const MIN_WIDTH = 200;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 288; // w-72 = 288px

const DEFAULT_SERVER_NAMES = new Set([
  'connectmessager Server',
  'Connect Messager Server',
  'Connect Messager Server'
]);

type TLeftSidebarProps = {
  className?: string;
  isOpen?: boolean;
};

const LeftSidebar = memo(({ className, isOpen = true }: TLeftSidebarProps) => {
  const { t } = useTranslation(['sidebar', 'common']);
  const serverName = useServerName();
  const dmsOpen = useDmsOpen();
  const publicSettings = usePublicServerSettings();
  const displayServerName = useMemo(() => {
    if (!serverName || DEFAULT_SERVER_NAMES.has(serverName)) {
      return t('common:appName');
    }

    return serverName;
  }, [serverName, t]);

  return (
    <ResizableSidebar
      storageKey={LocalStorageKey.LEFT_SIDEBAR_WIDTH}
      minWidth={MIN_WIDTH}
      maxWidth={MAX_WIDTH}
      defaultWidth={DEFAULT_WIDTH}
      edge="right"
      isOpen={isOpen}
      className={cn('h-full', className)}
    >
      <div className="flex h-14 w-full items-center justify-between border-b border-[#2b3544] bg-[#172231]/90 px-4 backdrop-blur-sm">
        <h2
          className="cursor-pointer truncate text-sm font-semibold tracking-[0.01em] text-white"
          onClick={() => setSelectedChannelId(undefined)}
        >
          {displayServerName}
        </h2>
        <div className="text-[#8fa2bb]">
          <ServerDropdownMenu />
        </div>
      </div>
      {publicSettings?.directMessagesEnabled && <DmButton />}
      <div className="flex-1 overflow-y-auto bg-[#182433]">
        {dmsOpen ? <DirectMessages /> : <Categories />}
      </div>
      <VoiceControl />
      <UserControl />
    </ResizableSidebar>
  );
});

export { UserControl } from './user-control';
export { LeftSidebar };


