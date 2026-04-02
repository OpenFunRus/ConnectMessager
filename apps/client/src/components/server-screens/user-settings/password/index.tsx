import { closeServerScreens } from '@/features/server-screens/actions';
import { useForm } from '@/hooks/use-form';
import { getTRPCClient } from '@/lib/trpc';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Group,
  Input
} from '@connectmessager/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const Password = memo(() => {
  const { t } = useTranslation('settings');
  const { setTrpcErrors, r, values } = useForm({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });

  const updatePassword = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      await trpc.users.updatePassword.mutate(values);
      toast.success(t('passwordUpdated'));
    } catch (error) {
      setTrpcErrors(error);
    }
  }, [values, setTrpcErrors, t]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('passwordTitle')}</CardTitle>
        <CardDescription>{t('passwordDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Group label={t('currentPasswordLabel')}>
          <Input {...r('currentPassword', 'password')} />
        </Group>

        <Group label={t('newPasswordLabel')}>
          <Input {...r('newPassword', 'password')} />
        </Group>

        <Group label={t('confirmNewPasswordLabel')}>
          <Input {...r('confirmNewPassword', 'password')} />
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
            onClick={updatePassword}
          >
            {t('saveChanges')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export { Password };


