import { Dialog } from '@/components/dialogs/dialogs';
import { openDialog } from '@/features/dialogs/actions';
import { useAdminInvites } from '@/features/server/admin/hooks';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LoadingCard
} from '@connectmessager/ui';
import { Plus } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { InvitesTable } from './invites-table';

const Invites = memo(() => {
  const { t } = useTranslation('settings');
  const { invites, loading, refetch } = useAdminInvites();

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{t('invitesTitle')}</CardTitle>
          <CardDescription>{t('invitesDesc')}</CardDescription>
        </div>
        <Button
          onClick={() =>
            openDialog(Dialog.CREATE_INVITE, {
              refetch
            })
          }
          className="w-full gap-2 border-[#4677b8] bg-[#2c5ea8] text-white hover:border-[#5b8ed1] hover:bg-[#356cbe] sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          {t('createInviteBtn')}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <InvitesTable invites={invites} refetch={refetch} />
      </CardContent>
    </Card>
  );
});

export { Invites };


