import { getTRPCClient } from '@/lib/trpc';
import type { TJoinedRole } from '@connectmessager/shared';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@connectmessager/ui';
import { Plus } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TRolesListProps = {
  roles: TJoinedRole[];
  selectedRoleId: number | undefined;
  setSelectedRoleId: (roleId: number) => void;
  refetch: () => void;
};

const RolesList = memo(
  ({ roles, selectedRoleId, setSelectedRoleId, refetch }: TRolesListProps) => {
    const { t } = useTranslation('settings');
    const onAddRole = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        const newRoleId = await trpc.roles.add.mutate();

        await refetch();

        setSelectedRoleId(newRoleId);
        toast.success(t('roleCreated'));
      } catch {
        toast.error(t('roleCreateFailed'));
      }
    }, [refetch, setSelectedRoleId, t]);

    return (
      <Card className="w-full flex-shrink-0 xl:w-64">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t('rolesTitle')}</CardTitle>
            <Button
              size="icon"
              variant="ghost"
              className="border border-[#314055] !bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:!bg-[#1b2940] hover:text-white"
              onClick={onAddRole}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 p-2">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRoleId(role.id)}
              className={`flex w-full items-center justify-between rounded-sm border px-3 py-2 text-left text-sm transition-colors ${
                selectedRoleId === role.id
                  ? 'border-[#4677b8] bg-[#1b2b40] text-white'
                  : 'border-transparent text-[#d7e2f0] hover:border-[#314055] hover:bg-[#172231]'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: role.color }}
                />
                <span>{role.name}</span>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>
    );
  }
);

export { RolesList };


