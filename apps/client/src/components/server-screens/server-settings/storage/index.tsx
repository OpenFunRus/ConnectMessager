import { closeServerScreens } from '@/features/server-screens/actions';
import { useAdminStorage } from '@/features/server/admin/hooks';
import {
  STORAGE_MAX_AVATAR_SIZE,
  STORAGE_MAX_BANNER_SIZE,
  STORAGE_MAX_FILES_PER_MESSAGE,
  STORAGE_MAX_FILE_SIZE,
  STORAGE_MAX_QUOTA,
  STORAGE_MAX_QUOTA_PER_USER,
  STORAGE_MIN_FILES_PER_MESSAGE,
  STORAGE_MIN_FILE_SIZE,
  STORAGE_MIN_QUOTA,
  STORAGE_MIN_QUOTA_PER_USER,
  StorageOverflowAction
} from '@connectmessager/shared';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Group,
  Input,
  LoadingCard,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch
} from '@connectmessager/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { DiskMetrics } from './metrics';
import {
  MAX_AVATAR_SIZE_PRESETS,
  MAX_BANNER_SIZE_PRESETS,
  MAX_FILES_PER_MESSAGE_PRESETS,
  MAX_FILE_SIZE_PRESETS,
  QUOTA_BY_USER_PRESETS,
  QUOTA_PRESETS
} from './presets';
import { StorageSizeControl } from './storage-size-control';

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));

const Storage = memo(() => {
  const { t } = useTranslation('settings');
  const { values, loading, submit, onChange, labels, diskMetrics } =
    useAdminStorage();

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('storageTitle')}</CardTitle>
        <CardDescription>{t('storageDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <DiskMetrics diskMetrics={diskMetrics!} />

        <Group
          label={t('allowUploadsLabel')}
          description={t('allowUploadsDesc')}
        >
          <Switch
            checked={!!values.storageUploadEnabled}
            onCheckedChange={(checked) =>
              onChange('storageUploadEnabled', checked)
            }
          />
        </Group>

        <Group
          label={t('allowFileSharingInDMsLabel')}
          description={t('allowFileSharingInDMsDesc')}
        >
          <Switch
            checked={!!values.storageFileSharingInDirectMessages}
            onCheckedChange={(checked) =>
              onChange('storageFileSharingInDirectMessages', checked)
            }
            disabled={!values.storageUploadEnabled}
          />
        </Group>

        <Group
          label={t('quotaLabel')}
          description={t('quotaDesc')}
          help={t('quotaHelp')}
        >
          <StorageSizeControl
            value={Number(values.storageQuota)}
            max={STORAGE_MAX_QUOTA}
            min={STORAGE_MIN_QUOTA}
            disabled={!values.storageUploadEnabled}
            onChange={(value) => onChange('storageQuota', value)}
            preview={
              <>
                {labels.storageQuota.value} {labels.storageQuota.unit}
              </>
            }
            presets={QUOTA_PRESETS}
          />
        </Group>

        <Group label={t('maxFileSizeLabel')} description={t('maxFileSizeDesc')}>
          <StorageSizeControl
            value={Number(values.storageUploadMaxFileSize)}
            max={STORAGE_MAX_FILE_SIZE}
            min={STORAGE_MIN_FILE_SIZE}
            disabled={!values.storageUploadEnabled}
            onChange={(value) => onChange('storageUploadMaxFileSize', value)}
            preview={
              <>
                {labels.storageUploadMaxFileSize.value}{' '}
                {labels.storageUploadMaxFileSize.unit}
              </>
            }
            presets={MAX_FILE_SIZE_PRESETS}
          />
        </Group>

        <Group
          label={t('maxAvatarSizeLabel')}
          description={t('maxAvatarSizeDesc')}
        >
          <StorageSizeControl
            value={Number(values.storageMaxAvatarSize)}
            max={STORAGE_MAX_AVATAR_SIZE}
            min={STORAGE_MIN_FILE_SIZE}
            disabled={!values.storageUploadEnabled}
            onChange={(value) => onChange('storageMaxAvatarSize', value)}
            preview={
              <>
                {labels.storageMaxAvatarSize.value}{' '}
                {labels.storageMaxAvatarSize.unit}
              </>
            }
            presets={MAX_AVATAR_SIZE_PRESETS}
          />
        </Group>

        <Group
          label={t('maxBannerSizeLabel')}
          description={t('maxBannerSizeDesc')}
        >
          <StorageSizeControl
            value={Number(values.storageMaxBannerSize)}
            max={STORAGE_MAX_BANNER_SIZE}
            min={STORAGE_MIN_FILE_SIZE}
            disabled={!values.storageUploadEnabled}
            onChange={(value) => onChange('storageMaxBannerSize', value)}
            preview={
              <>
                {labels.storageMaxBannerSize.value}{' '}
                {labels.storageMaxBannerSize.unit}
              </>
            }
            presets={MAX_BANNER_SIZE_PRESETS}
          />
        </Group>

        <Group
          label={t('quotaPerUserLabel')}
          description={t('quotaPerUserDesc')}
        >
          <StorageSizeControl
            value={Number(values.storageSpaceQuotaByUser)}
            max={STORAGE_MAX_QUOTA_PER_USER}
            min={STORAGE_MIN_QUOTA_PER_USER}
            disabled={!values.storageUploadEnabled}
            onChange={(value) => onChange('storageSpaceQuotaByUser', value)}
            preview={
              Number(values.storageSpaceQuotaByUser) === 0 ? (
                t('unlimitedLabel')
              ) : (
                <>
                  {labels.storageSpaceQuotaByUser.value}{' '}
                  {labels.storageSpaceQuotaByUser.unit}
                </>
              )
            }
            presets={QUOTA_BY_USER_PRESETS}
          />
        </Group>

        <Group
          label={t('maxFilesPerMessageLabel')}
          description={t('maxFilesPerMessageDesc')}
        >
          <div className="flex w-full max-w-[42rem] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="h-8 w-28 px-2 text-sm"
                min={STORAGE_MIN_FILES_PER_MESSAGE}
                max={STORAGE_MAX_FILES_PER_MESSAGE}
                step={1}
                value={Number(values.storageMaxFilesPerMessage)}
                disabled={!values.storageUploadEnabled}
                onChange={(e) => {
                  const nextValue = Number(e.target.value);

                  if (!Number.isFinite(nextValue)) {
                    return;
                  }

                  onChange(
                    'storageMaxFilesPerMessage',
                    clamp(
                      Math.round(nextValue),
                      STORAGE_MIN_FILES_PER_MESSAGE,
                      STORAGE_MAX_FILES_PER_MESSAGE
                    )
                  );
                }}
              />
              <span className="text-xs text-muted-foreground">
                {t('filesUnit')}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {MAX_FILES_PER_MESSAGE_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  size="sm"
                  variant="outline"
                  className="bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white"
                  disabled={!values.storageUploadEnabled}
                  onClick={() =>
                    onChange('storageMaxFilesPerMessage', preset.value)
                  }
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </Group>

        <Group
          label={t('overflowActionLabel')}
          description={t('overflowActionDesc')}
        >
          <Select
            onValueChange={(value) =>
              onChange('storageOverflowAction', value as StorageOverflowAction)
            }
            value={values.storageOverflowAction}
            disabled={!values.storageUploadEnabled}
          >
            <SelectTrigger className="w-full sm:w-[230px]">
              <SelectValue placeholder={t('overflowActionPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={StorageOverflowAction.DELETE_OLD_FILES}>
                {t('overflowDeleteOldFiles')}
              </SelectItem>
              <SelectItem value={StorageOverflowAction.PREVENT_UPLOADS}>
                {t('overflowPreventUploads')}
              </SelectItem>
            </SelectContent>
          </Select>
        </Group>

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
            onClick={submit}
            disabled={loading}
          >
            {t('saveChanges')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export { Storage };


