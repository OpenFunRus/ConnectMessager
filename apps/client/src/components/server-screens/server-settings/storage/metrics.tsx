import type { TDiskMetrics } from '@connectmessager/shared';
import { filesize } from 'filesize';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

interface DiskMetricsProps {
  diskMetrics: TDiskMetrics;
}

const DiskMetrics = memo(({ diskMetrics }: DiskMetricsProps) => {
  const { t } = useTranslation('settings');

  return (
    <div className="grid grid-cols-1 gap-4 rounded-md border border-[#2b3544] bg-[#101926] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] sm:grid-cols-2">
      <div>
        <div className="text-sm font-medium text-[#8fa2bb]">
          {t('diskTotalSpace')}
        </div>
        <div className="text-lg font-semibold text-white">
          {filesize(diskMetrics.totalSpace, { standard: 'jedec' })}
        </div>
      </div>
      <div>
        <div className="text-sm font-medium text-[#8fa2bb]">
          {t('diskAvailableSpace')}
        </div>
        <div className="text-lg font-semibold text-white">
          {filesize(diskMetrics.freeSpace, { standard: 'jedec' })}
        </div>
      </div>
      <div>
        <div className="text-sm font-medium text-[#8fa2bb]">
          {t('diskSystemUsed')}
        </div>
        <div className="text-lg font-semibold text-white">
          {filesize(diskMetrics.usedSpace, { standard: 'jedec' })}
        </div>
      </div>
      <div>
        <div className="text-sm font-medium text-[#8fa2bb]">
          {t('diskConnect MessagerUsed')}
        </div>
        <div className="text-lg font-semibold text-white">
          {filesize(diskMetrics.connectmessagerUsedSpace, { standard: 'jedec' })}
        </div>
      </div>
      <div className="col-span-2 mt-2">
        <div className="mb-2 text-sm font-medium text-[#8fa2bb]">
          {t('diskUsage')}
        </div>
        <div className="h-2 w-full rounded-full border border-[#2d3c4e] bg-[#1a2636]">
          <div
            className="h-full rounded-full bg-[#4a90ff] transition-all duration-300"
            style={{
              width: `${Math.min(
                (diskMetrics.usedSpace / diskMetrics.totalSpace) * 100,
                100
              )}%`
            }}
          />
        </div>
        <div className="mt-1 text-xs text-[#8fa2bb]">
          {t('diskUsedPercent', {
            percent: (
              (diskMetrics.usedSpace / diskMetrics.totalSpace) *
              100
            ).toFixed(1)
          })}
        </div>
      </div>
    </div>
  );
});

DiskMetrics.displayName = 'DiskMetrics';

export { DiskMetrics };


