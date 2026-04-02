import { DatePicker } from '@/components/date-picker';
import { useRoles } from '@/features/server/roles/hooks';
import { useForm } from '@/hooks/use-form';
import { getTRPCClient } from '@/lib/trpc';
import { getRandomString } from '@connectmessager/shared';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Group,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@connectmessager/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { TDialogBaseProps } from '../types';

type TCreateInviteDialogProps = TDialogBaseProps & {
  refetch: () => void;
};

const CreateInviteDialog = memo(
  ({ refetch, close, isOpen }: TCreateInviteDialogProps) => {
    const { t } = useTranslation('dialogs');
    const roles = useRoles();
    const { r, rrn, values, setTrpcErrors, onChange } = useForm({
      maxUses: 0,
      expiresAt: 0,
      code: getRandomString(24),
      roleId: 0
    });

    const handleCreate = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        const payload: Record<string, unknown> = { ...values };

        // Only send roleId if a role was selected (not "None")
        if (!payload.roleId) {
          delete payload.roleId;
        }

        await trpc.invites.add.mutate(payload);

        toast.success(t('inviteCreated'));

        refetch();
        close();
      } catch (error) {
        setTrpcErrors(error);
      }
    }, [close, refetch, setTrpcErrors, values, t]);

    return (
      <Dialog open={isOpen}>
        <DialogContent
          close={close}
          overlayClassName="bg-[#0b1220]/70 backdrop-blur-sm"
          closeClassName="top-4 right-4 h-9 w-9 rounded-lg border border-[#314055] !bg-[#101926] p-0 text-[#8fa2bb] opacity-100 shadow-none hover:border-[#3d516b] hover:!bg-[#1b2940] hover:text-white data-[state=open]:!bg-[#101926] data-[state=open]:text-[#8fa2bb]"
          className="w-[min(560px,calc(100vw-2rem))] max-w-[min(560px,calc(100vw-2rem))] rounded-[12px] border border-[#2b3544] bg-[#182433] p-0 text-[#d7e2f0] shadow-[0_24px_64px_rgba(2,6,23,0.5)] [&_.text-muted-foreground]:text-[#8fa2bb] [&_[data-slot=button]]:rounded-sm [&_[data-slot=button]]:border [&_[data-slot=button]]:border-[#314055] [&_[data-slot=button]]:shadow-none [&_[data-slot=input]]:rounded-sm [&_[data-slot=input]]:border-[#314055] [&_[data-slot=input]]:bg-[#0f1722] [&_[data-slot=input]]:text-[#d7e2f0] [&_[data-slot=input]]:placeholder:text-[#6f839b] [&_[data-slot=input]:focus-visible]:border-[#4677b8] [&_[data-slot=input]:focus-visible]:ring-2 [&_[data-slot=input]:focus-visible]:ring-[#4677b8]/25 [&_[data-slot=select-trigger]]:rounded-sm [&_[data-slot=select-trigger]]:border-[#314055] [&_[data-slot=select-trigger]]:bg-[#0f1722] [&_[data-slot=select-trigger]]:text-[#d7e2f0] [&_[data-slot=select-trigger]:focus-visible]:border-[#4677b8] [&_[data-slot=select-trigger]:focus-visible]:ring-2 [&_[data-slot=select-trigger]:focus-visible]:ring-[#4677b8]/25"
        >
          <DialogHeader className="border-b border-[#2b3544] bg-[#172231] px-5 py-4 text-left">
            <DialogTitle className="text-lg font-semibold text-white">
              {t('createInviteTitle')}
            </DialogTitle>
            <DialogDescription className="text-sm text-[#8fa2bb]">
              {t('createInviteDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-5 py-5">
            <Group label={t('inviteCodeLabel')}>
              <Input placeholder={t('inviteCodePlaceholder')} {...r('code')} />
            </Group>
            <Group label={t('maxUsesLabel')} description={t('maxUsesDesc')}>
              <Input
                placeholder={t('maxUsesPlaceholder')}
                {...r('maxUses', 'number')}
              />
            </Group>
            <Group label={t('expiresInLabel')} description={t('expiresInDesc')}>
              <DatePicker {...rrn('expiresAt')} minDate={Date.now()} />
            </Group>
            <Group
              label={t('assignRoleLabel')}
              description={t('assignRoleDesc')}
            >
              <Select
                onValueChange={(value) => onChange('roleId', Number(value))}
                value={values.roleId.toString()}
              >
                <SelectTrigger className="w-full sm:w-[230px]">
                  <SelectValue placeholder={t('selectRolePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t('roleDefault')}</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Group>
          </div>

          <DialogFooter className="gap-2 border-t border-[#243140] bg-[#16212f] px-5 py-4">
            <Button
              variant="ghost"
              onClick={close}
              className="bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleCreate}
              className="border-[#4677b8] bg-[#2b5ea7] text-white hover:border-[#5f90d1] hover:bg-[#346cbd]"
            >
              {t('createInviteBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export { CreateInviteDialog };


