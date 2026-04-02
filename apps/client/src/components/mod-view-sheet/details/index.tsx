import { Protect } from '@/components/protect';
import { useDateLocale } from '@/hooks/use-date-locale';
import { Permission } from '@connectmessager/shared/src/statics/permissions';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  IconButton,
  Tooltip
} from '@connectmessager/ui';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Calendar,
  ClipboardList,
  Clock,
  Eye,
  EyeClosed,
  Gavel,
  Globe,
  IdCard,
  Network
} from 'lucide-react';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useModViewContext } from '../context';

type TRowProps = {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  details?: string;
  hidden?: boolean;
};

const Row = memo(
  ({ icon, label, value, details, hidden = false }: TRowProps) => {
    const [visible, setVisible] = useState(!hidden);

    let valContent = (
      <span className="text-sm text-muted-foreground truncate max-w-[160px]">
        {visible ? value : '***'}
      </span>
    );

    if (details) {
      valContent = <Tooltip content={details}>{valContent}</Tooltip>;
    }

    return (
      <div className="flex items-center justify-between gap-4 rounded-sm border border-transparent px-3 py-3 transition-colors hover:border-[#314055] hover:bg-[#16212f]">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {icon}
          <span className="text-sm truncate">{label}</span>
        </div>
        {valContent}
        {hidden && (
          <IconButton
            role="button"
            onClick={() => setVisible(!visible)}
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm border border-[#314055] bg-[#101926] text-[#8fa2bb] transition-colors hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white focus:outline-none"
            icon={visible ? EyeClosed : Eye}
          />
        )}
      </div>
    );
  }
);

const Details = memo(() => {
  const { t } = useTranslation('settings');
  const dateLocale = useDateLocale();
  const { user, logins } = useModViewContext();
  const lastLogin = logins[0]; // TODO: in the future we might show a list of logins, atm we just show info about the last one

  return (
    <Card className="overflow-hidden">
      <CardHeader className="px-5 py-4">
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-[#a8c9ff]" />
          {t('detailsTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-4 py-4">
        <div className="space-y-2">
          <Row
            icon={<IdCard className="h-4 w-4 text-[#8fa2bb]" />}
            label={t('userIdLabel')}
            value={user.id}
          />

          <Protect permission={Permission.VIEW_USER_SENSITIVE_DATA}>
            <Row
              icon={<IdCard className="h-4 w-4 text-[#8fa2bb]" />}
              label={t('identityDetailLabel')}
              value={user.identity}
              hidden
            />

            <Row
              icon={<Network className="h-4 w-4 text-[#8fa2bb]" />}
              label={t('ipAddressLabel')}
              value={lastLogin?.ip || t('unknownValue')}
              hidden
            />

            <Row
              icon={<Globe className="h-4 w-4 text-[#8fa2bb]" />}
              label={t('locationLabel')}
              value={`${lastLogin?.country || t('naValue')} - ${lastLogin?.city || t('naValue')}`}
              hidden
            />
          </Protect>

          <Row
            icon={<Calendar className="h-4 w-4 text-[#8fa2bb]" />}
            label={t('joinedServerLabel')}
            value={formatDistanceToNow(user.createdAt, {
              addSuffix: true,
              locale: dateLocale
            })}
          />

          <Row
            icon={<Clock className="h-4 w-4 text-[#8fa2bb]" />}
            label={t('lastActiveLabel')}
            value={formatDistanceToNow(user.lastLoginAt, {
              addSuffix: true,
              locale: dateLocale
            })}
          />

          {user.banned && (
            <>
              <Row
                icon={<Gavel className="h-4 w-4 text-[#ff9aa6]" />}
                label={t('bannedDetailLabel')}
                value={t('bannedDetailValue')}
              />

              <Row
                icon={<Gavel className="h-4 w-4 text-[#ff9aa6]" />}
                label={t('banReasonLabel')}
                value={user.banReason || t('noReasonProvidedDetail')}
              />

              <Row
                icon={<Gavel className="h-4 w-4 text-[#ff9aa6]" />}
                label={t('bannedAtLabel')}
                value={format(user.bannedAt ?? 0, 'PPP', {
                  locale: dateLocale
                })}
                details={format(user.bannedAt ?? 0, 'PPpp', {
                  locale: dateLocale
                })}
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export { Details };


