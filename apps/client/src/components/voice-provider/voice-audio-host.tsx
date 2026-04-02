import { VoiceAudioStreams } from '@/components/channel-view/voice/voice-audio-streams';
import { ExternalAudioStreams } from '@/components/channel-view/voice/external-audio-streams';
import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { memo } from 'react';

const VoiceAudioHost = memo(() => {
  const voiceChannelId = useCurrentVoiceChannelId();

  if (!voiceChannelId) {
    return null;
  }

  return (
    <>
      <VoiceAudioStreams channelId={voiceChannelId} />
      <ExternalAudioStreams channelId={voiceChannelId} />
    </>
  );
});

export { VoiceAudioHost };
