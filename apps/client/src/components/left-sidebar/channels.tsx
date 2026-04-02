import { TypingDots } from '@/components/typing-dots';
import {
  useChannelById,
  useChannelsByCategoryId,
  useCurrentVoiceChannelId,
  useSelectedChannelId
} from '@/features/server/channels/hooks';
import {
  useCan,
  useChannelCan,
  useHasSharingScreenUsers,
  useHasUnreadMentions,
  useTypingUsersByChannelId,
  useUnreadMessagesCount,
  useVoiceUsersByChannelId
} from '@/features/server/hooks';
import { useVoiceChannelExternalStreamsList } from '@/features/server/voice/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChannelPermission,
  Permission,
  type TChannel,
  getTrpcError
} from '@connectmessager/shared';
import { Hash, Volume2 } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ChannelContextMenu } from '../context-menus/channel';
import { UnreadCount } from '../unread-count';
import { ExternalStream } from './external-stream';
import { useSelectChannel } from './hooks';
import { VoiceUser } from './voice-user';
import { Waveform } from './waveform';

type TVoiceProps = Omit<TItemWrapperProps, 'children'> & {
  channel: TChannel;
};

const Voice = memo(
  ({
    channel,
    isSelected,
    ...props
  }: TVoiceProps & { isSelected: boolean }) => {
    const users = useVoiceUsersByChannelId(channel.id);
    const externalStreams = useVoiceChannelExternalStreamsList(channel.id);
    const unreadCount = useUnreadMessagesCount(channel.id);
    const currentVoiceChannelId = useCurrentVoiceChannelId();
    const someoneIsSharingScreen = useHasSharingScreenUsers(channel.id);

    const isVoiceActive = users.length > 0 || externalStreams.length > 0;
    const isOwnChannel = currentVoiceChannelId === channel.id;

    return (
      <>
        <ItemWrapper
          {...props}
          isSelected={isSelected}
          className={cn(props.className, {
            'text-blue-500':
              someoneIsSharingScreen && (isOwnChannel || isSelected),
            'text-green-500':
              (isOwnChannel && !someoneIsSharingScreen) ||
              (isSelected &&
                !someoneIsSharingScreen &&
                !isOwnChannel &&
                isVoiceActive)
          })}
        >
          {isVoiceActive ? (
            <Waveform isScreenSharing={someoneIsSharingScreen} />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}

          <span className="flex-1 truncate">{channel.name}</span>

          {!isVoiceActive && unreadCount > 0 && (
            <UnreadCount count={unreadCount} />
          )}
        </ItemWrapper>
        {channel.type === 'VOICE' && (
          <div className="mt-1 ml-7 space-y-1">
            {users.map((user) => (
              <VoiceUser key={user.id} userId={user.id} user={user} />
            ))}
            {externalStreams.map((stream) => (
              <ExternalStream
                key={stream.streamId}
                title={stream.title}
                tracks={stream.tracks}
                pluginId={stream.pluginId}
                avatarUrl={stream.avatarUrl}
              />
            ))}
          </div>
        )}
      </>
    );
  }
);

type TTextProps = Omit<TItemWrapperProps, 'children'> & {
  channel: TChannel;
};

const Text = memo(({ channel, ...props }: TTextProps) => {
  const typingUsers = useTypingUsersByChannelId(channel.id);
  const unreadCount = useUnreadMessagesCount(channel.id);
  const hasUnreadMessages = useHasUnreadMentions(channel.id);
  const hasTypingUsers = typingUsers.length > 0;

  return (
    <ItemWrapper {...props}>
      <Hash className="h-4 w-4" />
      <span className="min-w-0 flex-1 truncate">{channel.name}</span>
      {hasTypingUsers && (
        <div className="flex items-center gap-0.5 ml-auto">
          <TypingDots className="space-x-0.5" />
        </div>
      )}
      {!hasTypingUsers && unreadCount > 0 && (
        <UnreadCount count={unreadCount} hasMention={hasUnreadMessages} />
      )}
    </ItemWrapper>
  );
});

type TItemWrapperProps = {
  children: React.ReactNode;
  className?: string;
  isSelected: boolean;
  onClick: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  style?: React.CSSProperties;
  disabled?: boolean;
};

const ItemWrapper = memo(
  ({
    children,
    isSelected,
    onClick,
    className,
    dragHandleProps,
    style,
    disabled = false
  }: TItemWrapperProps) => {
    return (
      <div
        {...dragHandleProps}
        style={style}
        className={cn(
          'flex w-full cursor-pointer select-none items-center gap-2 rounded-lg border border-transparent px-2.5 py-2 text-sm font-medium text-[#9fb2c8] transition-all hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white',
          {
            'border-[#2f7ad1]/35 bg-[#206bc4]/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]':
              isSelected,
            'cursor-default opacity-50 hover:border-transparent hover:bg-transparent hover:text-[#9fb2c8]':
              disabled
          },
          className
        )}
        onClick={disabled ? undefined : onClick}
      >
        {children}
      </div>
    );
  }
);

type TChannelProps = {
  channelId: number;
  isSelected: boolean;
  onClick: () => void;
};

const Channel = memo(({ channelId, isSelected, onClick }: TChannelProps) => {
  const channel = useChannelById(channelId);
  const channelCan = useChannelCan(channelId);
  const can = useCan();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: channelId });

  if (!channel) {
    return null;
  }

  if (
    !channelCan(ChannelPermission.VIEW_CHANNEL) &&
    !can(Permission.MANAGE_CHANNELS)
  ) {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform && { ...transform, x: 0 }),
        transition,
        opacity: isDragging ? 0.5 : 1
      }}
    >
      <ChannelContextMenu channelId={channelId}>
        <div>
          {channel.type === 'TEXT' && (
            <Text
              channel={channel}
              isSelected={isSelected}
              onClick={onClick}
              dragHandleProps={{ ...attributes, ...listeners }}
            />
          )}
          {channel.type === 'VOICE' && (
            <Voice
              channel={channel}
              isSelected={isSelected}
              onClick={onClick}
              dragHandleProps={{ ...attributes, ...listeners }}
              disabled={
                !channelCan(ChannelPermission.JOIN) ||
                !can(Permission.JOIN_VOICE_CHANNELS)
              }
            />
          )}
        </div>
      </ChannelContextMenu>
    </div>
  );
});

type TChannelsProps = {
  categoryId: number;
};

const Channels = memo(({ categoryId }: TChannelsProps) => {
  const { t } = useTranslation('sidebar');
  const channels = useChannelsByCategoryId(categoryId);
  const selectedChannelId = useSelectedChannelId();
  const can = useCan();
  const channelIds = useMemo(
    () => channels.map((channel) => channel.id),
    [channels]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  );

  const onChannelClick = useSelectChannel();

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = channelIds.indexOf(active.id as number);
      const newIndex = channelIds.indexOf(over.id as number);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      const reorderedIds = [...channelIds];
      const [movedId] = reorderedIds.splice(oldIndex, 1);

      reorderedIds.splice(newIndex, 0, movedId);

      try {
        const trpc = getTRPCClient();

        await trpc.channels.reorder.mutate({
          categoryId,
          channelIds: reorderedIds
        });
      } catch (error) {
        toast.error(getTrpcError(error, t('failedReorderChannels')));
      }
    },
    [categoryId, channelIds, t]
  );

  return (
    <div className="space-y-1">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={channelIds}
          strategy={verticalListSortingStrategy}
          disabled={!can(Permission.MANAGE_CHANNELS)}
        >
          {channels.map((channel) => (
            <Channel
              key={channel.id}
              channelId={channel.id}
              isSelected={selectedChannelId === channel.id}
              onClick={() => onChannelClick(channel.id)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
});

export { Channels };


