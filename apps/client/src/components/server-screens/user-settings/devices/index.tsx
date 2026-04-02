import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import { getVoiceControlsBridge } from '@/components/voice-provider/controls-bridge';
import { closeServerScreens } from '@/features/server-screens/actions';
import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { usePublicServerSettings } from '@/features/server/hooks';
import { useOwnVoiceState } from '@/features/server/voice/hooks';
import { MICROPHONE_GATE_DEFAULT_THRESHOLD_DB } from '@/helpers/audio-gate';
import {
  getNoiseGateWorkletAvailabilitySnapshot,
  subscribeNoiseGateWorkletAvailability
} from '@/helpers/audio-worklet/noise-gate-worklet';
import { useForm } from '@/hooks/use-form';
import { Resolution, VideoCodec } from '@/types';
import { DEFAULT_BITRATE } from '@connectmessager/shared';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Group,
  Label,
  LoadingCard,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Slider,
  Switch
} from '@connectmessager/ui';
import { filesize } from 'filesize';
import { Info } from 'lucide-react';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore
} from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAvailableDevices } from './hooks/use-available-devices';
import { useMicrophoneTest } from './hooks/use-microphone-test';
import { useWebcamTest } from './hooks/use-webcam-test';
import { MicrophoneTestLevelBar } from './microphone-test-level-bar';
import ResolutionFpsControl from './resolution-fps-control';

const DEFAULT_NAME = 'default';

const Devices = memo(() => {
  const { t } = useTranslation('settings');
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const settings = usePublicServerSettings();
  const ownVoiceState = useOwnVoiceState();
  const {
    inputDevices,
    playbackDevices,
    videoDevices,
    loading: availableDevicesLoading,
    loadDevices
  } = useAvailableDevices();
  const { devices, saveDevices, loading: devicesLoading } = useDevices();
  const { values, onChange } = useForm(devices);
  const noiseGateWorkletAvailability = useSyncExternalStore(
    subscribeNoiseGateWorkletAvailability,
    getNoiseGateWorkletAvailabilitySnapshot,
    getNoiseGateWorkletAvailabilitySnapshot
  );
  const isNoiseGateAvailable = noiseGateWorkletAvailability.available;
  const {
    testAudioRef,
    permissionState,
    isTesting,
    getAudioLevelSnapshot,
    error: microphoneTestError,
    requestPermission,
    startTest,
    stopTest
  } = useMicrophoneTest({
    microphoneId: values.microphoneId,
    playbackId: values.playbackId,
    autoGainControl: !!values.autoGainControl,
    echoCancellation: !!values.echoCancellation,
    noiseSuppression: !!values.noiseSuppression,
    noiseGateEnabled: !!values.noiseGateEnabled,
    noiseGateThresholdDb:
      values.noiseGateThresholdDb ?? MICROPHONE_GATE_DEFAULT_THRESHOLD_DB
  });
  const {
    testVideoRef,
    isStarting: isVideoStarting,
    isTesting: isVideoTesting,
    isPreviewReady: isVideoPreviewReady,
    error: webcamTestError,
    startTest: startVideoTest,
    stopTest: stopVideoTest
  } = useWebcamTest({
    webcamId: values.webcamId,
    webcamResolution: values.webcamResolution,
    webcamFramerate: values.webcamFramerate
  });

  const saveDeviceSettings = useCallback(() => {
    saveDevices(values);
    toast.success(t('deviceSettingsSaved'));
  }, [saveDevices, values, t]);
  const getDeviceErrorText = useCallback(
    (errorCode: string) => {
      switch (errorCode) {
        case 'MIC_ERROR_PERMISSION_DENIED':
          return t('deviceErrorMicrophonePermissionDenied');
        case 'MIC_ERROR_NOT_FOUND':
          return t('deviceErrorMicrophoneNotFound');
        case 'MIC_ERROR_BUSY':
          return t('deviceErrorMicrophoneBusy');
        case 'MIC_ERROR_UNAVAILABLE':
          return t('deviceErrorMicrophoneUnavailable');
        case 'WEBCAM_ERROR_PERMISSION_DENIED':
          return t('deviceErrorWebcamPermissionDenied');
        case 'WEBCAM_ERROR_NOT_FOUND':
          return t('deviceErrorWebcamNotFound');
        case 'WEBCAM_ERROR_BUSY':
          return t('deviceErrorWebcamBusy');
        case 'WEBCAM_ERROR_UNAVAILABLE':
          return t('deviceErrorWebcamUnavailable');
        case 'WEBCAM_ERROR_PREVIEW_START_FAILED':
          return t('deviceErrorWebcamPreviewStartFailed');
        case 'MIC_ERROR_ACCESS_FAILED':
          return t('deviceErrorMicrophoneAccessFailed');
        case 'WEBCAM_ERROR_ACCESS_FAILED':
          return t('deviceErrorWebcamAccessFailed');
        default:
          return errorCode;
      }
    },
    [t]
  );
  const didPrimeDevicesOnGrantedRef = useRef(false);
  const lastMicErrorToastRef = useRef<string | undefined>(undefined);
  const lastWebcamErrorToastRef = useRef<string | undefined>(undefined);
  const mutedByTestRef = useRef<{
    previousMicMuted: boolean;
    previousSoundMuted: boolean;
  } | null>(null);
  const restoreVoiceStateAfterTestRef = useRef<() => Promise<void>>(
    async () => {}
  );

  const restoreVoiceStateAfterTest = useCallback(async () => {
    if (!currentVoiceChannelId) {
      mutedByTestRef.current = null;
      return;
    }

    const mutedByTest = mutedByTestRef.current;
    if (!mutedByTest) return;

    mutedByTestRef.current = null;

    const voiceControlsBridge = getVoiceControlsBridge();
    if (!voiceControlsBridge) {
      toast.error(t('voiceControlsUnavailable'));
      return;
    }

    await voiceControlsBridge.setMicMuted(mutedByTest.previousMicMuted);
    await voiceControlsBridge.setSoundMuted(mutedByTest.previousSoundMuted);
  }, [currentVoiceChannelId, t]);

  useEffect(() => {
    restoreVoiceStateAfterTestRef.current = restoreVoiceStateAfterTest;
  }, [restoreVoiceStateAfterTest]);

  const startMicrophoneTest = useCallback(async () => {
    if (currentVoiceChannelId) {
      const voiceControlsBridge = getVoiceControlsBridge();
      if (!voiceControlsBridge) {
        toast.error(t('voiceControlsUnavailable'));
        return;
      }

      mutedByTestRef.current = {
        previousMicMuted: ownVoiceState.micMuted,
        previousSoundMuted: ownVoiceState.soundMuted
      };

      await voiceControlsBridge.setMicMuted(true);
      await voiceControlsBridge.setSoundMuted(true);
    } else {
      mutedByTestRef.current = null;
    }

    const didStart = await startTest();

    if (!didStart) {
      await restoreVoiceStateAfterTest();
      return;
    }
  }, [
    currentVoiceChannelId,
    ownVoiceState.micMuted,
    ownVoiceState.soundMuted,
    startTest,
    restoreVoiceStateAfterTest,
    t
  ]);

  const stopMicrophoneTest = useCallback(async () => {
    stopTest();
    await restoreVoiceStateAfterTest();
  }, [stopTest, restoreVoiceStateAfterTest]);

  const requestMicrophonePermission = useCallback(async () => {
    await requestPermission();
    await loadDevices();
  }, [requestPermission, loadDevices]);

  const startWebcamTest = useCallback(async () => {
    const didStart = await startVideoTest();
    if (!didStart) return;

    await loadDevices();
  }, [startVideoTest, loadDevices]);

  useEffect(() => {
    if (permissionState !== 'granted') {
      didPrimeDevicesOnGrantedRef.current = false;
      return;
    }

    if (didPrimeDevicesOnGrantedRef.current) return;
    didPrimeDevicesOnGrantedRef.current = true;

    void (async () => {
      await requestPermission({ silent: true });
      await loadDevices();
    })();
  }, [permissionState, requestPermission, loadDevices]);

  useEffect(() => {
    return () => {
      void restoreVoiceStateAfterTestRef.current();
    };
  }, []);

  useEffect(() => {
    if (!microphoneTestError) {
      lastMicErrorToastRef.current = undefined;
      return;
    }
    if (lastMicErrorToastRef.current === microphoneTestError) return;
    lastMicErrorToastRef.current = microphoneTestError;
    toast.error(getDeviceErrorText(microphoneTestError));
  }, [microphoneTestError, getDeviceErrorText]);

  useEffect(() => {
    if (!webcamTestError) {
      lastWebcamErrorToastRef.current = undefined;
      return;
    }
    if (lastWebcamErrorToastRef.current === webcamTestError) return;
    lastWebcamErrorToastRef.current = webcamTestError;
    toast.error(getDeviceErrorText(webcamTestError));
  }, [webcamTestError, getDeviceErrorText]);

  const hasMicrophones = inputDevices.length > 0;
  const hasDefaultPlaybackOption = playbackDevices.some(
    (device) => device?.deviceId === DEFAULT_NAME
  );
  const hasDefaultVideoOption = videoDevices.some(
    (device) => device?.deviceId === DEFAULT_NAME
  );

  const maxBitrate = useMemo(
    () => (settings?.webRtcMaxBitrate ? settings.webRtcMaxBitrate / 1000 : 0),
    [settings?.webRtcMaxBitrate]
  );

  if (availableDevicesLoading || devicesLoading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('devicesTitle')}</CardTitle>
        <CardDescription>{t('devicesDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {currentVoiceChannelId && (
          <Alert variant="default">
            <Info />
            <AlertDescription>{t('voiceChannelActiveInfo')}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-6">
          <Group label={t('playbackLabel')}>
            <Select
              onValueChange={(value) => onChange('playbackId', value)}
              value={values.playbackId}
            >
              <SelectTrigger className="w-full sm:max-w-[28rem]">
                <SelectValue placeholder={t('playbackPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {!hasDefaultPlaybackOption && (
                    <SelectItem value={DEFAULT_NAME}>
                      {t('defaultOutput')}
                    </SelectItem>
                  )}
                  {playbackDevices.map((device) => (
                    <SelectItem
                      key={device?.deviceId}
                      value={device?.deviceId || DEFAULT_NAME}
                    >
                      {device?.label.trim() || t('defaultOutput')}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Group>

          <Group label={t('microphoneLabel')}>
            <Select
              onValueChange={(value) => onChange('microphoneId', value)}
              value={values.microphoneId}
            >
              <SelectTrigger className="w-full sm:max-w-[28rem]">
                <SelectValue placeholder={t('microphonePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {inputDevices.map((device) => (
                    <SelectItem
                      key={device?.deviceId}
                      value={device?.deviceId || DEFAULT_NAME}
                    >
                      {device?.label.trim() || t('defaultMicrophone')}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Group
                label={t('echoCancellationLabel')}
                className="rounded-sm border border-[#2b3544] bg-[#0f1722] px-3 py-2.5"
              >
                <Switch
                  checked={!!values.echoCancellation}
                  onCheckedChange={(checked) =>
                    onChange('echoCancellation', checked)
                  }
                />
              </Group>

              <Group
                label={t('noiseSuppressionLabel')}
                className="rounded-sm border border-[#2b3544] bg-[#0f1722] px-3 py-2.5"
              >
                <Switch
                  checked={!!values.noiseSuppression}
                  onCheckedChange={(checked) =>
                    onChange('noiseSuppression', checked)
                  }
                />
              </Group>

              <Group
                label={t('autoGainControlLabel')}
                className="rounded-sm border border-[#2b3544] bg-[#0f1722] px-3 py-2.5"
              >
                <Switch
                  checked={!!values.autoGainControl}
                  onCheckedChange={(checked) =>
                    onChange('autoGainControl', checked)
                  }
                />
              </Group>

              <Group
                label={t('noiseGateLabel')}
                className="rounded-sm border border-[#2b3544] bg-[#0f1722] px-3 py-2.5"
              >
                <Switch
                  checked={values.noiseGateEnabled}
                  disabled={!isNoiseGateAvailable}
                  onCheckedChange={(checked) =>
                    onChange('noiseGateEnabled', checked)
                  }
                />
              </Group>
            </div>

            {!isNoiseGateAvailable && (
              <p className="text-xs text-muted-foreground">
                {t('noiseGateUnavailable')}
                {noiseGateWorkletAvailability.reason
                  ? ` ${noiseGateWorkletAvailability.reason}`
                  : ''}
              </p>
            )}
          </Group>

          <Group label={t('microphoneTestLabel')}>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              {permissionState !== 'granted' && (
                <Button
                  variant="outline"
                  className="w-full justify-center bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white sm:w-auto"
                  onClick={requestMicrophonePermission}
                >
                  {t('permitMicAccess')}
                </Button>
              )}

              {!isTesting ? (
                <Button
                  variant="default"
                  className="w-full justify-center border-[#4677b8] bg-[#2c5ea8] text-white hover:border-[#5b8ed1] hover:bg-[#356cbe] sm:w-auto"
                  onClick={() => void startMicrophoneTest()}
                  disabled={permissionState === 'denied' || !hasMicrophones}
                >
                  {t('startTestBtn')}
                </Button>
              ) : (
                <Button
                  variant="default"
                  className="w-full justify-center border-[#7a3340] bg-[#7d2d3a] text-white hover:border-[#9f4353] hover:bg-[#933445] sm:w-auto"
                  onClick={() => void stopMicrophoneTest()}
                >
                  {t('stopTestBtn')}
                </Button>
              )}
            </div>

            {currentVoiceChannelId && isTesting && (
              <p className="text-sm text-muted-foreground">
                {t('mutedDuringTest')}
              </p>
            )}

            <MicrophoneTestLevelBar
              isTesting={isTesting}
              noiseGateEnabled={values.noiseGateEnabled}
              noiseGateControlsDisabled={!isNoiseGateAvailable}
              noiseGateThresholdDb={values.noiseGateThresholdDb}
              onThresholdChange={(value) =>
                onChange('noiseGateThresholdDb', value)
              }
              getAudioLevelSnapshot={getAudioLevelSnapshot}
            />

            <audio ref={testAudioRef} className="hidden" />
          </Group>
        </div>

        <Separator />

        <div className="space-y-6">
          <Group label={t('webcamLabel')}>
            <div className="space-y-4">
              <Select
                onValueChange={(value) => onChange('webcamId', value)}
                value={values.webcamId}
              >
                <SelectTrigger className="w-full sm:max-w-[28rem]">
                  <SelectValue placeholder={t('webcamPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {!hasDefaultVideoOption && (
                      <SelectItem value={DEFAULT_NAME}>
                        {t('defaultWebcam')}
                      </SelectItem>
                    )}
                    {videoDevices.map((device) => (
                      <SelectItem
                        key={device?.deviceId}
                        value={device?.deviceId || DEFAULT_NAME}
                      >
                        {device?.label.trim() || t('defaultWebcam')}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <div className="group relative aspect-video w-full max-w-[28rem] overflow-hidden rounded-sm border border-[#314055] bg-[#0f1722]">
                <video
                  ref={testVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`h-full w-full object-cover transition-opacity duration-150 ${
                    values.mirrorOwnVideo ? '-scale-x-100' : ''
                  } ${isVideoTesting ? 'opacity-100' : 'opacity-0'}`}
                />

                {!isVideoTesting && !isVideoStarting && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button
                      variant="default"
                      className="border-[#4677b8] bg-[#2c5ea8] text-white hover:border-[#5b8ed1] hover:bg-[#356cbe]"
                      onClick={() => void startWebcamTest()}
                    >
                      {t('startVideoPreviewBtn')}
                    </Button>
                  </div>
                )}

                {(isVideoStarting ||
                  (isVideoTesting && !isVideoPreviewReady)) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#0f1722]/80 px-3 text-center text-xs text-[#8fa2bb]">
                    {t('startingCamera')}
                  </div>
                )}

                {isVideoTesting && (
                  <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-3 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    <Button
                      variant="default"
                      className="pointer-events-auto border-[#7a3340] bg-[#7d2d3a] text-white hover:border-[#9f4353] hover:bg-[#933445]"
                      onClick={stopVideoTest}
                    >
                      {t('stopVideoPreviewBtn')}
                    </Button>
                  </div>
                )}
              </div>

              <ResolutionFpsControl
                framerate={values.webcamFramerate}
                resolution={values.webcamResolution}
                onFramerateChange={(value) =>
                  onChange('webcamFramerate', value)
                }
                onResolutionChange={(value) =>
                  onChange('webcamResolution', value as Resolution)
                }
              />

              <Group label={t('mirrorOwnVideoLabel')}>
                <Switch
                  checked={!!values.mirrorOwnVideo}
                  onCheckedChange={(checked) =>
                    onChange('mirrorOwnVideo', checked)
                  }
                />
              </Group>

              <Group label={t('screenSharingLabel')}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                  <ResolutionFpsControl
                    framerate={values.screenFramerate}
                    resolution={values.screenResolution}
                    onFramerateChange={(value) =>
                      onChange('screenFramerate', value)
                    }
                    onResolutionChange={(value) =>
                      onChange('screenResolution', value as Resolution)
                    }
                  />
                  <div className="w-full lg:ml-2 lg:w-auto">
                    <Select
                      value={values.screenCodec ?? VideoCodec.AUTO}
                      onValueChange={(value) =>
                        onChange('screenCodec', value as VideoCodec)
                      }
                    >
                      <SelectTrigger className="w-full lg:w-40">
                        <SelectValue
                          placeholder={t('selectCodecPlaceholder')}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value={VideoCodec.AUTO}>
                            {t('autoOption')}
                          </SelectItem>
                          <SelectItem value={VideoCodec.VP8}>VP8</SelectItem>
                          <SelectItem value={VideoCodec.VP9}>VP9</SelectItem>
                          <SelectItem value={VideoCodec.H264}>H264</SelectItem>
                          <SelectItem value={VideoCodec.AV1}>AV1</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>{t('maxBitrateLabel')}</Label>

                  <Slider
                    className="w-full sm:max-w-[28rem]"
                    min={200}
                    max={maxBitrate}
                    step={100}
                    value={[values.screenBitrate ?? DEFAULT_BITRATE]}
                    onValueChange={([value]) =>
                      onChange('screenBitrate', value)
                    }
                    rightSlot={
                      <span className="w-20 text-right text-sm text-[#8fa2bb]">
                        {filesize(
                          (values.screenBitrate ?? DEFAULT_BITRATE) * 125,
                          {
                            bits: true
                          }
                        )}
                        /s
                      </span>
                    }
                  />
                </div>

                <span className="text-sm text-muted-foreground">
                  {t('screenSharingNote')}
                </span>
              </Group>
            </div>
          </Group>
        </div>
        <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            className="w-full justify-center bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white sm:w-auto"
            onClick={closeServerScreens}
          >
            {t('cancel')}
          </Button>
          <Button
            className="w-full justify-center border-[#4677b8] bg-[#2c5ea8] text-white hover:border-[#5b8ed1] hover:bg-[#356cbe] sm:w-auto"
            onClick={saveDeviceSettings}
          >
            {t('saveChanges')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export { Devices };


