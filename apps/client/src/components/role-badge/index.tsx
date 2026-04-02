import type { TRole } from '@connectmessager/shared';
import { Badge, IconButton } from '@connectmessager/ui';
import { X } from 'lucide-react';
import { memo } from 'react';

type TRoleBadgeProps = {
  role: Pick<TRole, 'id' | 'name' | 'color'>;
  onRemoveRole?: (roleId: number, roleName: string) => void;
};

const RoleBadge = memo(({ role, onRemoveRole }: TRoleBadgeProps) => {
  return (
    <Badge
      className="gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
      style={{
        backgroundColor: role.color + '14',
        borderColor: role.color + '55'
      }}
    >
      <span
        className="inline-flex items-center gap-1"
        style={{ color: role.color }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: role.color }}
        />
        {role.name}
      </span>
      {onRemoveRole && (
        <IconButton
          icon={X}
          size="xs"
          aria-label={`Remove ${role.name} role`}
          className="h-4 w-4 rounded-sm bg-transparent hover:bg-white/8"
          style={{ color: role.color }}
          onClick={() => onRemoveRole(role.id, role.name)}
        />
      )}
    </Badge>
  );
});

export { RoleBadge };


