import { getTRPCClient } from '@/lib/trpc';
import { getTrpcError, type TJoinedUser } from '@connectmessager/shared';
import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AutoFocus,
  Group,
  Switch
} from '@connectmessager/ui';
import { AlertCircleIcon } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { TDialogBaseProps } from '../types';

type TDeleteUserDialogProps = TDialogBaseProps & {
  user: TJoinedUser;
  refetch: () => Promise<void>;
  onDelete?: () => void;
};

const DeleteUserDialog = memo(
  ({ isOpen, close, user, refetch, onDelete }: TDeleteUserDialogProps) => {
    const { t } = useTranslation('dialogs');
    const [wipe, setWipe] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const onSubmit = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        setIsDeleting(true);

        await trpc.users.delete.mutate({
          userId: user.id,
          wipe
        });

        toast.success(t('userDeletedSuccess'));

        close();
        refetch();
        onDelete?.();
      } catch (error) {
        toast.error(getTrpcError(error, t('failedDeleteUser')));
      } finally {
        setIsDeleting(false);
      }
    }, [close, refetch, wipe, user.name, user.id, onDelete, t]);

    return (
      <AlertDialog open={isOpen}>
        <AlertDialogContent className="w-[min(520px,calc(100vw-2rem))] max-w-[min(520px,calc(100vw-2rem))] gap-0 overflow-hidden rounded-[12px] border border-[#2b3544] bg-[#182433] p-0 text-[#d7e2f0] shadow-[0_24px_64px_rgba(2,6,23,0.5)]">
          <AlertDialogHeader className="border-b border-[#2b3544] bg-[#172231] px-5 py-4 text-left">
            <AlertDialogTitle className="text-lg font-semibold text-white">
              {t('deleteUserTitle', { name: user.name })}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="flex flex-col gap-4 px-5 py-5">
            <Group label={t('wipeAllDataLabel')}>
              <Switch
                checked={wipe}
                onCheckedChange={(checked) => setWipe(checked)}
                className="data-[state=unchecked]:bg-[#243140] data-[state=checked]:bg-[#356fbd]"
              />
            </Group>

            {wipe ? (
              <Alert
                variant="destructive"
                className="rounded-sm border-[#7a3340] bg-[#2d1720] py-2 text-[#ffd1d7]"
              >
                <AlertCircleIcon className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {t('wipeDestructiveWarning')}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert
                variant="info"
                className="rounded-sm border-[#314055] bg-[#101926] py-2 text-[#d7e2f0]"
              >
                <AlertCircleIcon className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {t('wipeInfoWarning')}
                </AlertDescription>
              </Alert>
            )}
          </div>
          <AlertDialogFooter className="gap-2 border-t border-[#243140] bg-[#16212f] px-5 py-4">
            <AlertDialogCancel
              onClick={close}
              className="border-[#314055] bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white"
            >
              {t('cancel')}
            </AlertDialogCancel>
            <AutoFocus>
              <AlertDialogAction
                onClick={onSubmit}
                disabled={isDeleting}
                className="rounded-sm border-[#a64554] bg-[#8d2f3d] text-white hover:border-[#c15b6a] hover:bg-[#a53a49]"
              >
                {t('deleteUserBtn')}
              </AlertDialogAction>
            </AutoFocus>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

export { DeleteUserDialog };


