import { useVoice } from '@/features/server/voice/hooks';
import { formatBigNumber } from '@/helpers/format-big-number';
import { Popover, PopoverContent, PopoverTrigger } from '@connectmessager/ui';
import { filesize } from 'filesize';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type StatsPopoverProps = {
  children: React.ReactNode;
};

const hardwareEncoders = [
  'external',
  'hardware',
  'nvenc',
  'vaapi',
  'videotoolbox',
  'qsv',
  'amf',
  'mediacodec'
];

const softwareEncoders = ['libvpx', 'openh264', 'libaom', 'software'];

const StatsPopover = memo(({ children }: StatsPopoverProps) => {
  const { t } = useTranslation('sidebar');
  const { transportStats } = useVoice();

  const {
    producer,
    consumer,
    screenShare,
    totalBytesSent,
    totalBytesReceived,
    currentBitrateSent,
    currentBitrateReceived
  } = transportStats;

  const encoder = useMemo(() => {
    if (!screenShare?.encoderImplementation) return null;

    const lowerImpl = screenShare?.encoderImplementation.toLowerCase();

    if (hardwareEncoders.some((hw) => lowerImpl.includes(hw))) {
      return {
        label: t('gpuEncoder', { encoder: screenShare.encoderImplementation }),
        isHardware: true
      };
    }

    if (softwareEncoders.some((sw) => lowerImpl.includes(sw))) {
      return {
        label: t('cpuEncoder', { encoder: screenShare.encoderImplementation }),
        isHardware: false
      };
    }

    return {
      label: t('unknownEncoder', {
        encoder: screenShare.encoderImplementation
      }),
      isHardware: null
    };
  }, [screenShare?.encoderImplementation, t]);

  const codec = useMemo(() => {
    const parts = screenShare?.codec.split('/');

    return parts && parts.length > 1 ? parts[1] : screenShare?.codec;
  }, [screenShare?.codec]);

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="border border-[#314055] bg-[#182433] p-0 text-[#d7e2f0] shadow-[0_20px_48px_rgba(2,6,23,0.45)]"
      >
        <div className="w-72 p-3 text-xs">
          <h3 className="mb-2 text-sm font-semibold text-white">
            {t('transportStats')}
          </h3>
          <div className="mb-3 grid grid-cols-2 gap-4">
            <div>
              <h4 className="mb-1 font-medium text-[#76d7b6]">
                {t('outgoing')}
              </h4>
              {producer ? (
                <div className="space-y-1 text-[#8fa2bb]">
                  <div>{t('rate', { rate: filesize(currentBitrateSent) })}</div>
                  <div>
                    {t('packets', {
                      packets: formatBigNumber(producer.packetsSent)
                    })}
                  </div>
                  <div>{t('rtt', { rtt: producer.rtt.toFixed(1) })}</div>
                </div>
              ) : (
                <div className="text-[#8fa2bb]">{t('noData')}</div>
              )}
            </div>

            <div>
              <h4 className="mb-1 font-medium text-[#73a7ff]">
                {t('incoming')}
              </h4>
              {consumer ? (
                <div className="space-y-1 text-[#8fa2bb]">
                  <div>
                    {t('rate', { rate: filesize(currentBitrateReceived) })}
                  </div>
                  <div>
                    {t('packets', {
                      packets: formatBigNumber(consumer.packetsReceived)
                    })}
                  </div>
                  {consumer.packetsLost > 0 && (
                    <div className="text-red-400">
                      {t('packetsLost', {
                        lost: formatBigNumber(consumer.packetsLost)
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[#8fa2bb]">
                  {t('noRemoteStreams')}
                </div>
              )}
            </div>
          </div>

          {screenShare && (
            <div className="mb-3 border-t border-[#2b3544] pt-2">
              <h4 className="mb-1 font-medium text-[#73a7ff]">
                {t('screenShare')}
              </h4>
              <div className="space-y-1 text-[#8fa2bb]">
                {screenShare.codec && <div>{t('codec', { codec })}</div>}
                {encoder && (
                  <div>
                    {t('encoder')}{' '}
                    <span
                      className={
                        encoder.isHardware === true
                          ? 'text-green-400'
                          : encoder.isHardware === false
                            ? 'text-yellow-400'
                            : undefined
                      }
                    >
                      {encoder.label}
                    </span>
                  </div>
                )}
                <div>
                  {t('resolution', {
                    width: screenShare.width,
                    height: screenShare.height
                  })}
                </div>
                <div>
                  {t('frameRate', { fps: Math.round(screenShare.frameRate) })}
                </div>
                <div>
                  {t('bitrate', { bitrate: filesize(screenShare.bitrate) })}
                </div>
                <div>
                  {t('framesEncoded', {
                    frames: formatBigNumber(screenShare.framesEncoded)
                  })}
                </div>
                {screenShare.qualityLimitationReason !== 'none' && (
                  <div className="text-yellow-400">
                    {t('qualityLimited', {
                      reason: screenShare.qualityLimitationReason
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="border-t border-[#2b3544] pt-2">
            <h4 className="mb-1 font-medium text-[#d9a441]">
              {t('sessionTotals')}
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[#8fa2bb]">
              <div>РІвЂ вЂ {filesize(totalBytesSent)}</div>
              <div>РІвЂ вЂњ {filesize(totalBytesReceived)}</div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

export { StatsPopover };


