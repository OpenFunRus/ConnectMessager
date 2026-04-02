import { useVoiceUsersByChannelId } from '@/features/server/hooks';
import {
  useHideNonVideoParticipants,
  useVoiceChannelExternalStreamsList
} from '@/features/server/voice/hooks';
import { memo, useMemo } from 'react';
import { ControlsBar } from './controls-bar';
import { ExternalStreamCard } from './external-stream-card';
import {
  PinnedCardType,
  usePinCardController
} from './hooks/use-pin-card-controller';
import { ScreenShareCard } from './screen-share-card';
import { VoiceGrid } from './voice-grid';
import { VoiceUserCard } from './voice-user-card';

type TChannelProps = {
  channelId: number;
};

const VoiceChannel = memo(({ channelId }: TChannelProps) => {
  const voiceUsers = useVoiceUsersByChannelId(channelId);
  const externalStreams = useVoiceChannelExternalStreamsList(channelId);
  const { pinnedCard, pinCard, unpinCard, isPinned } = usePinCardController();
  const hideNonVideoParticipants = useHideNonVideoParticipants();

  const cards = useMemo(() => {
    const cards: React.ReactNode[] = [];

    // Check if there are any video streams at all
    const hasAnyVideoStreams =
      voiceUsers.some(
        (user) => user.state.webcamEnabled || user.state.sharingScreen
      ) || externalStreams.some((stream) => stream.tracks.video);

    // Only apply the filter if there are some video streams
    const shouldFilterNonVideo = hideNonVideoParticipants && hasAnyVideoStreams;

    voiceUsers.forEach((voiceUser) => {
      const userCardId = `user-${voiceUser.id}`;
      const hasVideo = voiceUser.state.webcamEnabled;

      // Only show user card if not filtering, or if they have video
      if (!shouldFilterNonVideo || hasVideo) {
        cards.push(
          <VoiceUserCard
            key={userCardId}
            userId={voiceUser.id}
            isPinned={isPinned(userCardId)}
            onPin={() =>
              pinCard({
                id: userCardId,
                type: PinnedCardType.USER,
                userId: voiceUser.id
              })
            }
            onUnpin={unpinCard}
            voiceUser={voiceUser}
          />
        );
      }

      // Screen shares always have video, so always show them
      if (voiceUser.state.sharingScreen) {
        const screenShareCardId = `screen-share-${voiceUser.id}`;

        cards.push(
          <ScreenShareCard
            key={screenShareCardId}
            userId={voiceUser.id}
            isPinned={isPinned(screenShareCardId)}
            onPin={() =>
              pinCard({
                id: screenShareCardId,
                type: PinnedCardType.SCREEN_SHARE,
                userId: voiceUser.id
              })
            }
            onUnpin={unpinCard}
            showPinControls
          />
        );
      }
    });

    externalStreams.forEach((stream) => {
      const externalStreamCardId = `external-stream-${stream.streamId}`;
      const hasVideo = stream.tracks.video;

      // Only show external stream card if not filtering, or if it has video
      if (!shouldFilterNonVideo || hasVideo) {
        cards.push(
          <ExternalStreamCard
            key={externalStreamCardId}
            streamId={stream.streamId}
            stream={stream}
            isPinned={isPinned(externalStreamCardId)}
            onPin={() =>
              pinCard({
                id: externalStreamCardId,
                type: PinnedCardType.EXTERNAL_STREAM,
                userId: stream.streamId
              })
            }
            onUnpin={unpinCard}
            showPinControls
          />
        );
      }
    });

    return cards;
  }, [
    voiceUsers,
    externalStreams,
    isPinned,
    pinCard,
    unpinCard,
    hideNonVideoParticipants
  ]);

  if (voiceUsers.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#182433]">
        <div className="rounded-2xl border border-[#2b3544] bg-[#172231] px-8 py-7 text-center shadow-[0_20px_48px_rgba(2,6,23,0.3)]">
          <p className="mb-2 text-lg text-[#d7e2f0]">
            No one in the voice channel
          </p>
          <p className="text-sm text-[#8fa2bb]">
            Join the voice channel to start a meeting
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden bg-[#182433]">
      <VoiceGrid pinnedCardId={pinnedCard?.id} className="h-full">
        {cards}
      </VoiceGrid>
      <ControlsBar channelId={channelId} />
    </div>
  );
});

export { VoiceChannel };
