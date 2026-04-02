import { closeServerScreens } from '@/features/server-screens/actions';
import { useOwnPublicUser } from '@/features/server/users/hooks';
import { useForm } from '@/hooks/use-form';
import { getTRPCClient } from '@/lib/trpc';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Color,
  Group,
  Input,
  Textarea
} from '@connectmessager/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AvatarManager } from './avatar-manager';
import { BannerManager } from './banner-manager';

const Profile = memo(() => {
  const { t } = useTranslation('settings');
  const ownPublicUser = useOwnPublicUser();
  const { setTrpcErrors, r, rr, values } = useForm({
    name: ownPublicUser?.name ?? '',
    bannerColor: ownPublicUser?.bannerColor ?? '#FFFFFF',
    bio: ownPublicUser?.bio ?? ''
  });

  const onUpdateUser = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      await trpc.users.update.mutate(values);
      toast.success(t('profileUpdated'));
    } catch (error) {
      setTrpcErrors(error);
    }
  }, [values, setTrpcErrors, t]);

  if (!ownPublicUser) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profileTitle')}</CardTitle>
        <CardDescription>{t('profileDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AvatarManager user={ownPublicUser} />

        <Group label={t('usernameLabel')}>
          <Input placeholder={t('usernamePlaceholder')} {...r('name')} />
        </Group>

        <Group label={t('bioLabel')}>
          <Textarea placeholder={t('bioPlaceholder')} {...r('bio')} />
        </Group>

        <Group label={t('bannerColorLabel')}>
          <Color {...rr('bannerColor')} defaultValue="#FFFFFF" />
        </Group>

        <BannerManager user={ownPublicUser} />

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
            onClick={onUpdateUser}
          >
            {t('saveChanges')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export { Profile };


