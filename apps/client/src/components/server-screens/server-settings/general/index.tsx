import { closeServerScreens } from '@/features/server-screens/actions';
import { useAdminGeneral } from '@/features/server/admin/hooks';
import {
  MESSAGE_MAX_LINES,
  MESSAGE_MAX_TEXT_LENGTH,
  MESSAGE_MIN_LINES_LIMIT,
  MESSAGE_MIN_TEXT_LENGTH_LIMIT
} from '@connectmessager/shared';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Group,
  Input,
  LoadingCard,
  Switch,
  Textarea
} from '@connectmessager/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { LogoManager } from './logo-manager';

const General = memo(() => {
  const { t } = useTranslation('settings');
  const { settings, logo, loading, onChange, submit, errors, refetch } =
    useAdminGeneral();

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('serverInfoTitle')}</CardTitle>
        <CardDescription>{t('serverInfoDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Group label={t('nameLabel')}>
          <Input
            value={settings.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder={t('namePlaceholder')}
            error={errors.name}
          />
        </Group>

        <Group label={t('descriptionLabel')}>
          <Textarea
            value={settings.description}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder={t('descriptionPlaceholder')}
            rows={4}
          />
        </Group>

        <Group label={t('serverPasswordLabel')}>
          <Input
            value={settings.password}
            onChange={(e) => onChange('password', e.target.value)}
            placeholder={t('serverPasswordPlaceholder')}
            error={errors.password}
          />
        </Group>

        <LogoManager logo={logo} refetch={refetch} />

        <Group
          label={t('allowNewUsersLabel')}
          description={t('allowNewUsersDesc')}
        >
          <Switch
            checked={settings.allowNewUsers}
            onCheckedChange={(checked) => onChange('allowNewUsers', checked)}
          />
        </Group>

        <Group label={t('pluginsLabel')} description={t('pluginsDesc')}>
          <Switch
            checked={settings.enablePlugins}
            onCheckedChange={(checked) => onChange('enablePlugins', checked)}
          />
        </Group>

        <Group
          label={t('directMessagesEnabledLabel')}
          description={t('directMessagesEnabledDesc')}
        >
          <Switch
            checked={settings.directMessagesEnabled}
            onCheckedChange={(checked) =>
              onChange('directMessagesEnabled', checked)
            }
          />
        </Group>

        <Group
          label={t('searchEnabledLabel')}
          description={t('searchEnabledDesc')}
        >
          <Switch
            checked={settings.enableSearch}
            onCheckedChange={(checked) => onChange('enableSearch', checked)}
          />
        </Group>

        <Group
          label={t('maxMessageCharsLabel')}
          description={t('maxMessageCharsDesc')}
        >
          <Input
            type="number"
            min={MESSAGE_MIN_TEXT_LENGTH_LIMIT}
            max={MESSAGE_MAX_TEXT_LENGTH}
            step={1}
            value={settings.messageMaxTextLength}
            onChange={(e) => {
              const value = Number(e.target.value);

              if (!Number.isFinite(value)) {
                return;
              }

              onChange(
                'messageMaxTextLength',
                Math.max(
                  MESSAGE_MIN_TEXT_LENGTH_LIMIT,
                  Math.min(MESSAGE_MAX_TEXT_LENGTH, Math.round(value))
                )
              );
            }}
            placeholder={t('maxMessageCharsPlaceholder')}
          />
        </Group>

        <Group
          label={t('maxMessageLinesLabel')}
          description={t('maxMessageLinesDesc')}
        >
          <Input
            type="number"
            min={MESSAGE_MIN_LINES_LIMIT}
            max={MESSAGE_MAX_LINES}
            step={1}
            value={settings.messageMaxLines}
            onChange={(e) => {
              const value = Number(e.target.value);

              if (!Number.isFinite(value)) {
                return;
              }

              onChange(
                'messageMaxLines',
                Math.max(
                  MESSAGE_MIN_LINES_LIMIT,
                  Math.min(MESSAGE_MAX_LINES, Math.round(value))
                )
              );
            }}
            placeholder={t('maxMessageLinesPlaceholder')}
          />
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
            onClick={submit}
            disabled={loading}
          >
            {t('saveChanges')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export { General };


