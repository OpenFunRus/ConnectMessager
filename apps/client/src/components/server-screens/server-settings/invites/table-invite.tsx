import { RoleBadge } from '@/components/role-badge';
import { UserAvatar } from '@/components/user-avatar';
import { requestConfirmation } from '@/features/dialogs/actions';
import { useDateLocale } from '@/hooks/use-date-locale';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import type { TJoinedInvite } from '@connectmessager/shared';
import { getTrpcError } from '@connectmessager/shared';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@connectmessager/ui';
import { format, formatDistanceToNow } from 'date-fns';
import { Copy, MoreVertical, Trash2 } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TTableInviteProps = {
  invite: TJoinedInvite;
  refetch: () => void;
};

const copyTextWithFallback = async (text: string) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back for local HTTP builds or restricted clipboard contexts.
  }

  let copiedFromEvent = false;
  const onCopy = (event: ClipboardEvent) => {
    event.preventDefault();
    event.clipboardData?.setData('text/plain', text);
    copiedFromEvent = true;
  };

  document.addEventListener('copy', onCopy);

  try {
    document.execCommand('copy');
  } catch {
    // Ignore and continue to textarea fallback below.
  } finally {
    document.removeEventListener('copy', onCopy);
  }

  if (copiedFromEvent) {
    return true;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  textarea.style.opacity = '0.001';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  try {
    const copied = document.execCommand('copy');
    return copied;
  } finally {
    document.body.removeChild(textarea);
  }
};

const TableInvite = memo(({ invite, refetch }: TTableInviteProps) => {
  const { t } = useTranslation('settings');
  const dateLocale = useDateLocale();
  const isExpired = invite.expiresAt && invite.expiresAt < Date.now();
  const isMaxUsesReached = invite.maxUses && invite.uses >= invite.maxUses;

  const handleCopyCode = useCallback(async () => {
    const inviteText = `${window.location.protocol}//${window.location.host}/?invite=${encodeURIComponent(invite.code)}`;
    const copied = await copyTextWithFallback(inviteText);

    if (copied) {
      toast.success(t('inviteCopied'));
      return;
    }

    toast.error(t('failedCopyInvite', { defaultValue: 'Failed to copy invite' }));
  }, [invite.code, t]);

  const handleDelete = useCallback(async () => {
    const answer = await requestConfirmation({
      title: t('deleteInviteTitle'),
      message: t('deleteInviteMsg'),
      confirmLabel: t('deleteBtn'),
      variant: 'danger'
    });

    if (!answer) return;

    const trpc = getTRPCClient();

    try {
      await trpc.invites.delete.mutate({ inviteId: invite.id });
      toast.success(t('inviteDeletedSuccess'));
      refetch();
    } catch (error) {
      toast.error(getTrpcError(error, t('failedDeleteInvite')));
    }
  }, [invite.id, refetch, t]);

  const usesText = useMemo(() => {
    if (!invite.maxUses) {
      return `${invite.uses} / РІв‚¬С›`;
    }
    return `${invite.uses} / ${invite.maxUses}`;
  }, [invite.uses, invite.maxUses]);

  const expiresText = useMemo(() => {
    if (!invite.expiresAt) {
      return t('inviteNever');
    }
    if (isExpired) {
      return t('inviteExpired');
    }
    return formatDistanceToNow(invite.expiresAt, {
      addSuffix: true,
      locale: dateLocale
    });
  }, [invite.expiresAt, isExpired, t, dateLocale]);

  const statusBadge = useMemo(() => {
    if (isExpired) {
      return (
        <Badge variant="destructive" className="text-xs">
          {t('inviteExpired')}
        </Badge>
      );
    }
    if (isMaxUsesReached) {
      return (
        <Badge variant="secondary" className="text-xs">
          {t('inviteMaxUses')}
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="text-xs">
        {t('inviteActive')}
      </Badge>
    );
  }, [isExpired, isMaxUsesReached, t]);

  return (
    <div
      key={invite.id}
      className="grid min-w-max grid-cols-[1fr_80px_50px_70px_90px_110px_70px_60px] gap-4 px-4 py-3 text-sm transition-colors hover:bg-[#16212f]"
    >
      <div className="flex items-center min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <code className="text-xs font-mono bg-muted px-2 py-1 rounded truncate">
            {invite.code}
          </code>
          <Button
            variant="ghost"
            size="icon"
              className="h-6 w-6 shrink-0 border border-[#314055] !bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:!bg-[#1b2940] hover:text-white"
            onClick={handleCopyCode}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="flex items-center">
        {invite.role ? (
          <RoleBadge role={invite.role} />
        ) : (
          <span className="text-xs text-muted-foreground">
            {t('inviteDefault')}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 min-w-0">
        <UserAvatar userId={1} showUserPopover />
      </div>

      <div className="flex items-center text-muted-foreground">
        <span className="text-xs">{usesText}</span>
      </div>

      <div className="flex items-center text-muted-foreground">
        <span
          className={cn('text-xs', {
            'text-destructive': isExpired
          })}
          title={
            invite.expiresAt
              ? format(invite.expiresAt, 'PPP p', { locale: dateLocale })
              : undefined
          }
        >
          {expiresText}
        </span>
      </div>

      <div className="flex items-center text-muted-foreground">
        <span
          className="text-xs"
          title={format(invite.createdAt, 'PPP p', { locale: dateLocale })}
        >
          {formatDistanceToNow(invite.createdAt, {
            addSuffix: true,
            locale: dateLocale
          })}
        </span>
      </div>

      <div className="flex items-center">{statusBadge}</div>

      <div className="flex items-center justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 border border-[#314055] !bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:!bg-[#1b2940] hover:text-white"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleCopyCode}>
              <Copy className="h-4 w-4" />
              {t('copyInviteLink')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              {t('deleteBtn')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

export { TableInvite };


