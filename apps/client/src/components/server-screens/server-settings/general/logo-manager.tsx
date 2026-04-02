import { ImagePicker } from '@/components/image-picker';
import { uploadFile } from '@/helpers/upload-file';
import { useFilePicker } from '@/hooks/use-file-picker';
import { getTRPCClient } from '@/lib/trpc';
import type { TFile } from '@connectmessager/shared';
import { Group } from '@connectmessager/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TLogoManagerProps = {
  logo: TFile | null;
  refetch: () => Promise<void>;
};

const LogoManager = memo(({ logo, refetch }: TLogoManagerProps) => {
  const { t } = useTranslation('settings');
  const openFilePicker = useFilePicker();

  const removeLogo = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      await trpc.others.changeLogo.mutate({ fileId: undefined });
      await refetch();

      toast.success(t('logoRemoved'));
    } catch (error) {
      console.error(error);
      toast.error(t('logoRemoveFailed'));
    }
  }, [refetch, t]);

  const onLogoClick = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      const [file] = await openFilePicker('image/*');

      const temporaryFile = await uploadFile(file);

      if (!temporaryFile) {
        toast.error(t('uploadFailedTryAgain'));
        return;
      }

      await trpc.others.changeLogo.mutate({ fileId: temporaryFile.id });
      await refetch();

      toast.success(t('logoUpdated'));
    } catch {
      toast.error(t('logoUpdateFailed'));
    }
  }, [openFilePicker, refetch, t]);

  return (
    <Group
      label={t('logoLabel')}
      description={t('logoRecommendedResolution')}
    >
      <ImagePicker
        image={logo}
        onImageClick={onLogoClick}
        onRemoveImageClick={removeLogo}
        className="object-scale-down"
      />
    </Group>
  );
});

export { LogoManager };


