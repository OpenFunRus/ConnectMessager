import { requestConfirmation } from '@/features/dialogs/actions';
import { useForm } from '@/hooks/use-form';
import { getTRPCClient } from '@/lib/trpc';
import {
  getTrpcError,
  OWNER_ROLE_ID,
  type TJoinedRole
} from '@connectmessager/shared';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Tooltip
} from '@connectmessager/ui';
import { Info, Star, Trash2 } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PermissionList } from './permissions-list';

type TUpdateRoleProps = {
  selectedRole: TJoinedRole;
  setSelectedRoleId: (id: number | undefined) => void;
  refetch: () => void;
};

const UpdateRole = memo(
  ({ selectedRole, setSelectedRoleId, refetch }: TUpdateRoleProps) => {
    const { t } = useTranslation('settings');
    const { setTrpcErrors, r, onChange, values } = useForm({
      name: selectedRole.name,
      color: selectedRole.color,
      permissions: selectedRole.permissions
    });

    const isOwnerRole = selectedRole.id === OWNER_ROLE_ID;

    const onDeleteRole = useCallback(async () => {
      const choice = await requestConfirmation({
        title: t('deleteRoleTitle'),
        message: t('deleteRoleMsg'),
        confirmLabel: t('deleteRoleBtn')
      });

      if (!choice) return;

      const trpc = getTRPCClient();

      try {
        await trpc.roles.delete.mutate({ roleId: selectedRole.id });
        toast.success(t('roleDeleted'));
        refetch();
        setSelectedRoleId(undefined);
      } catch {
        toast.error(t('roleDeleteFailed'));
      }
    }, [selectedRole.id, refetch, setSelectedRoleId, t]);

    const onUpdateRole = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        await trpc.roles.update.mutate({
          roleId: selectedRole.id,
          ...values
        });

        toast.success(t('roleUpdated'));
        refetch();
      } catch (error) {
        setTrpcErrors(error);
      }
    }, [selectedRole.id, values, refetch, setTrpcErrors, t]);

    const onSetAsDefaultRole = useCallback(async () => {
      const choice = await requestConfirmation({
        title: t('setDefaultRoleTitle'),
        message: t('setDefaultRoleMsg'),
        confirmLabel: t('setDefaultRoleBtn')
      });

      if (!choice) return;

      const trpc = getTRPCClient();

      try {
        await trpc.roles.setDefault.mutate({ roleId: selectedRole.id });

        toast.success(t('defaultRoleUpdated'));
        refetch();
      } catch (error) {
        toast.error(getTrpcError(error, t('failedSetDefaultRole')));
      }
    }, [selectedRole.id, refetch, t]);

    return (
      <Card className="flex-1">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{t('editRoleTitle')}</CardTitle>
            <div className="flex items-center gap-2">
              <Tooltip content={t('setAsDefaultRoleTooltip')}>
                <Button
                  size="icon"
                  variant="ghost"
                  className="bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white"
                  disabled={selectedRole.isDefault}
                  onClick={onSetAsDefaultRole}
                >
                  <Star className="h-4 w-4" />
                </Button>
              </Tooltip>
              <Button
                size="icon"
                variant="ghost"
                className="bg-[#101926] text-[#8fa2bb] hover:border-[#7a3340] hover:bg-[#3a1d26] hover:text-[#ffb0bb]"
                disabled={selectedRole.isPersistent || selectedRole.isDefault}
                onClick={onDeleteRole}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {selectedRole.isDefault && (
            <Alert variant="default">
              <Star />
              <AlertDescription>{t('defaultRoleInfo')}</AlertDescription>
            </Alert>
          )}

          {isOwnerRole && (
            <Alert variant="default">
              <Info />
              <AlertDescription>{t('ownerRoleInfo')}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">{t('roleNameLabel')}</Label>
              <Input {...r('name')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-color">{t('roleColorLabel')}</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input className="h-10 w-20" {...r('color', 'color')} />
                <Input className="flex-1" {...r('color')} />
              </div>
            </div>
          </div>

          <PermissionList
            permissions={values.permissions}
            disabled={OWNER_ROLE_ID === selectedRole.id}
            setPermissions={(permissions) =>
              onChange('permissions', permissions)
            }
          />

          <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="w-full justify-center bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white sm:w-auto"
              onClick={() => setSelectedRoleId(undefined)}
            >
              {t('close')}
            </Button>
            <Button
              className="w-full justify-center border-[#4677b8] bg-[#2c5ea8] text-white hover:border-[#5b8ed1] hover:bg-[#356cbe] sm:w-auto"
              onClick={onUpdateRole}
            >
              {t('saveRoleBtn')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
);

export { UpdateRole };


