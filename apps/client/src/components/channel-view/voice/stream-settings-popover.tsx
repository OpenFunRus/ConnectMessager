import {
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Slider
} from '@connectmessager/ui';
import { Settings, Volume2, VolumeX } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TStreamSettingsPopoverProps = {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
};

const StreamSettingsPopover = memo(
  ({
    volume,
    isMuted,
    onVolumeChange,
    onMuteToggle
  }: TStreamSettingsPopoverProps) => {
    const { t } = useTranslation(['topbar', 'sidebar']);

    return (
      <Popover>
        <PopoverTrigger asChild>
          <IconButton
            variant="ghost"
            icon={Settings}
            title={t('topbar:streamSettingsTitle')}
            size="sm"
            className="rounded-lg border border-[#314055] bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white"
          />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="bottom"
          className="w-56 border border-[#314055] bg-[#182433] p-3 text-[#d7e2f0] shadow-[0_20px_48px_rgba(2,6,23,0.45)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-3">
            <div className="text-xs font-medium uppercase tracking-wide text-[#8fa2bb]">
              {t('topbar:volumeLabel')}
            </div>
            <div className="flex items-center gap-2">
              <IconButton
                variant="ghost"
                icon={isMuted ? VolumeX : Volume2}
                onClick={onMuteToggle}
                title={isMuted ? t('sidebar:unmute') : t('sidebar:mute')}
                size="sm"
                className={
                  isMuted
                    ? 'rounded-lg border border-[#7a3340] bg-[#3a1d26] text-[#ff8b9a] hover:border-[#9f4353] hover:bg-[#4a222e] hover:text-[#ffb0bb]'
                    : 'rounded-lg border border-[#314055] bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white'
                }
              />
              <Slider
                value={[volume]}
                onValueChange={([value]) => onVolumeChange(value)}
                min={0}
                max={100}
                step={1}
                className="flex-1 cursor-pointer"
              />
              <span className="w-8 text-right text-xs text-[#8fa2bb]">
                {Math.round(volume)}%
              </span>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
);

StreamSettingsPopover.displayName = 'StreamSettingsPopover';

export { StreamSettingsPopover };


