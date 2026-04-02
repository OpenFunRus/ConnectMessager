import { getFileUrl } from '@/helpers/get-file-url';
import { uploadFile } from '@/helpers/upload-file';
import { useFilePicker } from '@/hooks/use-file-picker';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import type { TJoinedPublicUser } from '@connectmessager/shared';
import { Button, buttonVariants, Group } from '@connectmessager/ui';
import { Upload } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TBannerManagerProps = {
  user: TJoinedPublicUser;
};

const BannerManager = memo(({ user }: TBannerManagerProps) => {
  const { t } = useTranslation('settings');
  const openFilePicker = useFilePicker();

  const removeBanner = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      await trpc.users.changeBanner.mutate({ fileId: undefined });

      toast.success(t('bannerRemoved'));
    } catch {
      toast.error(t('bannerRemoveFailed'));
    }
  }, [t]);

  const onBannerClick = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      const [file] = await openFilePicker('image/*');

      const temporaryFile = await uploadFile(file);

      if (!temporaryFile) {
        toast.error(t('uploadFailedTryAgain'));
        return;
      }

      await trpc.users.changeBanner.mutate({ fileId: temporaryFile.id });

      toast.success(t('bannerUpdated'));
    } catch {
      toast.error(t('bannerUpdateFailed'));
    }
  }, [openFilePicker, t]);

  return (
    <Group label={t('bannerLabel')}>
      <div className="w-full space-y-2">
        <div
          className="group relative aspect-[10/3] w-full max-w-[20rem] cursor-pointer overflow-hidden rounded-sm border border-[#314055] bg-[#0f1722]"
          onClick={onBannerClick}
        >
          {user.banner ? (
            <img
              src={getFileUrl(user.banner)}
              alt={t('bannerAlt')}
              className="h-full w-full object-cover transition-opacity group-hover:opacity-70"
            />
          ) : (
            <div
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'h-full w-full cursor-pointer rounded-none border-0 bg-[linear-gradient(135deg,#1a2838_0%,#22344a_100%)] text-[#8fa2bb] transition-opacity group-hover:opacity-70'
              )}
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
            <div className="rounded-sm border border-[#4a6280] bg-[#0b1220]/70 p-3 backdrop-blur-sm">
              <Upload className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>
      {user.bannerId && (
        <div>
          <Button size="sm" variant="outline" onClick={removeBanner}>
            {t('removeBannerBtn')}
          </Button>
        </div>
      )}
    </Group>
  );
});

export { BannerManager };


