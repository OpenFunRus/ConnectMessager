import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { playSound } from '@/features/server/sounds/actions';
import { SoundType } from '@/features/server/types';
import { updateOwnVoiceState } from '@/features/server/voice/actions';
import { useOwnVoiceState } from '@/features/server/voice/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { getTrpcError } from '@connectmessager/shared';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TUseVoiceControlsParams = {
  startMicStream: () => Promise<void>;
  localAudioStream: MediaStream | undefined;

  startWebcamStream: () => Promise<void>;
  stopWebcamStream: () => void;

  startScreenShareStream: () => Promise<MediaStreamTrack>;
  stopScreenShareStream: () => void;
};

const useVoiceControls = ({
  startMicStream,
  localAudioStream,
  startWebcamStream,
  stopWebcamStream,
  startScreenShareStream,
  stopScreenShareStream
}: TUseVoiceControlsParams) => {
  const { t } = useTranslation('common');
  const ownVoiceState = useOwnVoiceState();
  const currentVoiceChannelId = useCurrentVoiceChannelId();

  const getMediaErrorText = useCallback(
    (error: unknown, fallbackText: string) => {
      if (!(error instanceof DOMException)) {
        return fallbackText;
      }

      switch (error.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          return t('mediaErrorPermissionDenied');
        case 'NotFoundError':
          return t('mediaErrorDeviceNotFound');
        case 'NotReadableError':
          return t('mediaErrorDeviceBusy');
        case 'OverconstrainedError':
          return t('mediaErrorDeviceUnavailable');
        case 'AbortError':
          return t('mediaErrorAccessAborted');
        case 'SecurityError':
          return t('mediaErrorSecurity');
        default:
          return fallbackText;
      }
    },
    [t]
  );

  const toggleMic = useCallback(async () => {
    const newState = !ownVoiceState.micMuted;
    const trpc = getTRPCClient();

    updateOwnVoiceState({ micMuted: newState });
    playSound(
      newState ? SoundType.OWN_USER_MUTED_MIC : SoundType.OWN_USER_UNMUTED_MIC
    );

    if (!currentVoiceChannelId) return;

    try {
      await trpc.voice.updateState.mutate({
        micMuted: newState
      });

      if (!localAudioStream && !newState) {
        await startMicStream();
      }
    } catch (error) {
      updateOwnVoiceState({ micMuted: !newState });
      toast.error(
        getMediaErrorText(error, t('voiceUpdateMicFailed'))
      );
    }
  }, [
    ownVoiceState.micMuted,
    startMicStream,
    currentVoiceChannelId,
    localAudioStream,
    t,
    getMediaErrorText
  ]);

  const toggleSound = useCallback(async () => {
    const newState = !ownVoiceState.soundMuted;
    const trpc = getTRPCClient();

    updateOwnVoiceState({ soundMuted: newState });
    playSound(
      newState
        ? SoundType.OWN_USER_MUTED_SOUND
        : SoundType.OWN_USER_UNMUTED_SOUND
    );

    if (!currentVoiceChannelId) return;

    try {
      await trpc.voice.updateState.mutate({
        soundMuted: newState
      });
    } catch (error) {
      toast.error(getTrpcError(error, t('voiceUpdateSoundFailed')));
    }
  }, [ownVoiceState.soundMuted, currentVoiceChannelId, t]);

  const toggleWebcam = useCallback(async () => {
    if (!currentVoiceChannelId) return;

    const newState = !ownVoiceState.webcamEnabled;
    const trpc = getTRPCClient();

    updateOwnVoiceState({ webcamEnabled: newState });

    playSound(
      newState
        ? SoundType.OWN_USER_STARTED_WEBCAM
        : SoundType.OWN_USER_STOPPED_WEBCAM
    );

    try {
      if (newState) {
        await startWebcamStream();
      } else {
        stopWebcamStream();
      }

      await trpc.voice.updateState.mutate({
        webcamEnabled: newState
      });
    } catch (error) {
      updateOwnVoiceState({ webcamEnabled: false });

      try {
        await trpc.voice.updateState.mutate({ webcamEnabled: false });
      } catch {
        // ignore
      }

      toast.error(getMediaErrorText(error, t('voiceUpdateWebcamFailed')));
    }
  }, [
    ownVoiceState.webcamEnabled,
    currentVoiceChannelId,
    startWebcamStream,
    stopWebcamStream,
    t,
    getMediaErrorText
  ]);

  const toggleScreenShare = useCallback(async () => {
    const newState = !ownVoiceState.sharingScreen;
    const trpc = getTRPCClient();

    updateOwnVoiceState({ sharingScreen: newState });

    playSound(
      newState
        ? SoundType.OWN_USER_STARTED_SCREENSHARE
        : SoundType.OWN_USER_STOPPED_SCREENSHARE
    );

    try {
      if (newState) {
        const video = await startScreenShareStream();

        // handle native screen share end
        video.onended = async () => {
          stopScreenShareStream();
          updateOwnVoiceState({ sharingScreen: false });

          try {
            await trpc.voice.updateState.mutate({
              sharingScreen: false
            });
          } catch {
            // ignore
          }
        };
      } else {
        stopScreenShareStream();
      }

      await trpc.voice.updateState.mutate({
        sharingScreen: newState
      });
    } catch (error) {
      updateOwnVoiceState({ sharingScreen: false });

      try {
        await trpc.voice.updateState.mutate({ sharingScreen: false });
      } catch {
        // ignore
      }

      toast.error(
        getMediaErrorText(error, t('voiceUpdateScreenShareFailed'))
      );
    }
  }, [
    ownVoiceState.sharingScreen,
    startScreenShareStream,
    stopScreenShareStream,
    t,
    getMediaErrorText
  ]);

  return {
    toggleMic,
    toggleSound,
    toggleWebcam,
    toggleScreenShare
  };
};

export { useVoiceControls };


