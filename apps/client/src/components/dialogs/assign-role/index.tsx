import { PermissionsList } from '@/components/permissions-list';
import { useRoles } from '@/features/server/roles/hooks';
import { useOwnUserId } from '@/features/server/users/hooks';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@connectmessager/ui';
import { Info } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { TDialogBaseProps } from '../types';

type TAssignRoleDialogProps = TDialogBaseProps & {
  user: TJoinedUser;
  refetch: () => Promise<void>;
};

const AssignRoleDialog = memo(
  ({ isOpen, close, user, refetch }: TAssignRoleDialogProps) => {
    const { t } = useTranslation('dialogs');
    const ownUserId = useOwnUserId();
    const roles = useRoles();
    const [selectedRoleId, setSelectedRoleId] = useState<number>(0);
    const isOwnUser = ownUserId === user.id;

    // Filter out roles the user already has
    const availableRoles = useMemo(
      () => roles.filter((role) => !user.roleIds.includes(role.id)),
      [roles, user.roleIds]
    );

    const selectedRole = useMemo(
      () => roles.find((role) => role.id === selectedRoleId),
      [roles, selectedRoleId]
    );

    const onSubmit = useCallback(async () => {
      if (selectedRoleId === 0) {
        toast.error(t('pleaseSelectRole'));
        return;
      }

      try {
        const trpc = getTRPCClient();

        await trpc.users.addRole.mutate({
          userId: user.id,
          roleId: selectedRoleId
        });

        toast.success(t('roleAssigned'));
        close();
        refetch();
      } catch (error) {
        toast.error(getTrpcError(error, t('failedAssignRole')));
      }
    }, [user.id, selectedRoleId, close, refetch, t]);

    return (
      <AlertDialog open={isOpen}>
        <AlertDialogContent className="w-[min(560px,calc(100vw-2rem))] max-w-[min(560px,calc(100vw-2rem))] gap-0 overflow-hidden rounded-[12px] border border-[#2b3544] bg-[#182433] p-0 text-[#d7e2f0] shadow-[0_24px_64px_rgba(2,6,23,0.5)]">
          <AlertDialogHeader className="border-b border-[#2b3544] bg-[#172231] px-5 py-4 text-left">
            <AlertDialogTitle className="text-lg font-semibold text-white">
              {t('assignRoleTitle', { name: user.name })}
            </AlertDialogTitle>
            {isOwnUser && (
              <Alert className="mt-3 rounded-sm border-[#314055] bg-[#101926] text-[#d7e2f0]">
                <Info />
                <AlertDescription className="text-[#aab8cb]">
                  {t('selfRoleAssignWarning')}
                </AlertDescription>
              </Alert>
            )}
            {availableRoles.length === 0 && (
              <Alert className="mt-3 rounded-sm border-[#314055] bg-[#101926] text-[#d7e2f0]">
                <Info />
                <AlertDescription className="text-[#aab8cb]">
                  {t('userHasAllRoles')}
                </AlertDescription>
              </Alert>
            )}
          </AlertDialogHeader>
          <div className="flex flex-col gap-4 px-5 py-5">
            <Group label={t('roleLabel')}>
              <Select
                onValueChange={(value) => setSelectedRoleId(Number(value))}
                value={selectedRoleId.toString()}
                disabled={availableRoles.length === 0}
              >
                <SelectTrigger className="w-full rounded-sm border-[#314055] bg-[#0f1722] text-[#d7e2f0] sm:w-[230px]">
                  <SelectValue placeholder={t('selectRolePlaceholder')} />
                </SelectTrigger>
                <SelectContent className="rounded-sm border-[#314055] bg-[#182433] text-[#d7e2f0]">
                  {availableRoles.map((role) => (
                    <SelectItem
                      key={role.id}
                      value={role.id.toString()}
                      className="rounded-sm text-[#d7e2f0] data-[highlighted]:bg-[#1b2b40] data-[highlighted]:text-white"
                    >
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Group>

            {selectedRole && (
              <div className="rounded-sm border border-[#2b3544] bg-[#101926] p-3">
                <PermissionsList
                  permissions={selectedRole.permissions}
                  variant="default"
                  size="md"
                />
              </div>
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
                disabled={availableRoles.length === 0 || selectedRoleId === 0}
                className="rounded-sm border-[#4677b8] bg-[#2b5ea7] text-white hover:border-[#5f90d1] hover:bg-[#346cbd]"
              >
                {t('assignRoleBtn')}
              </AlertDialogAction>
            </AutoFocus>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

export { AssignRoleDialog };


