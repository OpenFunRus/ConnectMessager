import { Dialog } from '@/components/dialogs/dialogs';
import { openDialog } from '@/features/dialogs/actions';
import { useAdminPlugins } from '@/features/server/admin/hooks';
import { usePluginsEnabled } from '@/features/server/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import type { TPluginInfo } from '@connectmessager/shared';
import { getTrpcError } from '@connectmessager/shared';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LoadingCard,
  Separator,
  Switch
} from '@connectmessager/ui';
import {
  AlertCircle,
  FileText,
  Package,
  RefreshCw,
  Settings,
  Terminal,
  User
} from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TPluginItemProps = {
  plugin: TPluginInfo;
  onToggle: (pluginId: string, enabled: boolean) => Promise<void>;
};

const PluginItem = memo(({ plugin, onToggle }: TPluginItemProps) => {
  const { t } = useTranslation('settings');
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = useCallback(
    async (checked: boolean) => {
      setIsToggling(true);
      try {
        await onToggle(plugin.id, checked);
      } finally {
        setIsToggling(false);
      }
    },
    [plugin.id, onToggle]
  );

  const handleViewLogs = useCallback(() => {
    openDialog(Dialog.PLUGIN_LOGS, {
      pluginName: plugin.name,
      pluginId: plugin.id,
      logs: [] // will be populated by subscription later
    });
  }, [plugin.name, plugin.id]);

  const handleViewCommands = useCallback(() => {
    openDialog(Dialog.PLUGIN_COMMANDS, {
      pluginId: plugin.id
    });
  }, [plugin.id]);

  const handleViewSettings = useCallback(() => {
    openDialog(Dialog.PLUGIN_SETTINGS, {
      pluginId: plugin.id,
      pluginName: plugin.name
    });
  }, [plugin.id, plugin.name]);

  return (
    <div className="flex flex-col gap-4 rounded-md border border-[#2b3544] bg-[#101926] p-4 transition-colors hover:border-[#38506d] hover:bg-[#16212f] sm:flex-row sm:items-start">
      <div className="flex-shrink-0">
        {plugin.logo ? (
          <img
            src={plugin.logo}
            alt={`${plugin.name} logo`}
            className="w-12 h-12 rounded-md object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : (
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-md border border-[#314055] bg-[#172231]'
            )}
          >
            <Package className="h-6 w-6 text-[#8fa2bb]" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight">
              {plugin.name}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-[#8fa2bb]">
              {plugin.description}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewLogs}
              className="h-8 bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              {t('logsBtn')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewCommands}
              className="h-8 bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white"
              disabled={!plugin.enabled}
            >
              <Terminal className="w-4 h-4 mr-1.5" />
              {t('commandsBtn')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewSettings}
              className="h-8 bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white"
              disabled={!plugin.enabled}
            >
              <Settings className="w-4 h-4 mr-1.5" />
              {t('settingsBtn')}
            </Button>
            {plugin.loadError ? (
              <Badge variant="destructive">{t('errorBadge')}</Badge>
            ) : (
              <Badge variant={plugin.enabled ? 'default' : 'outline'}>
                {plugin.enabled ? t('enabledBadge') : t('disabledBadge')}
              </Badge>
            )}
            <Switch
              checked={plugin.enabled}
              onCheckedChange={handleToggle}
              disabled={isToggling}
            />
          </div>
        </div>

        {plugin.loadError && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {plugin.loadError}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap items-center gap-x-4 text-xs text-[#8fa2bb]">
          <div className="flex items-center gap-1">
            <span className="font-mono">v{plugin.version}</span>
          </div>
          <div className="flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            <span>{plugin.author}</span>
          </div>
          <div className="flex items-center gap-1">
            {plugin.homepage ? (
              <>
                <a
                  href={plugin.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-primary transition-colors"
                >
                  {plugin.homepage}
                </a>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
});

const Plugins = memo(() => {
  const { t } = useTranslation('settings');
  const enabled = usePluginsEnabled();
  const { loading, plugins, refetch } = useAdminPlugins();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success(t('pluginsRefreshed'));
    } catch (error) {
      toast.error(getTrpcError(error, t('failedRefreshPlugins')));
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, t]);

  const handleToggle = useCallback(
    async (pluginId: string, enabled: boolean) => {
      const trpc = getTRPCClient();

      try {
        await trpc.plugins.toggle.mutate({ pluginId, enabled });
        toast.success(enabled ? t('pluginEnabled') : t('pluginDisabled'));
      } catch (error) {
        toast.error(getTrpcError(error, t('failedTogglePlugin')));
      } finally {
        refetch();
      }
    },
    [refetch, t]
  );

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
      <Card>
        <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t('pluginsTitle')}</CardTitle>
            <CardDescription>{t('pluginsManageDesc')}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || loading || !enabled}
            className="w-full shrink-0 bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white sm:w-auto"
          >
            <RefreshCw
              className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')}
            />
            {t('refreshBtn')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {enabled ? (
          <>
            {plugins.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#314055] bg-[#172231]">
                  <Package className="h-8 w-8 text-[#8fa2bb]" />
                </div>
                <h3 className="font-semibold text-lg mb-1">
                  {t('noPluginsTitle')}
                </h3>
                <p className="max-w-sm text-sm text-[#8fa2bb]">
                  {t('noPluginsDesc')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {plugins.map((plugin, index) => (
                  <div key={plugin.id}>
                    <PluginItem plugin={plugin} onToggle={handleToggle} />
                    {index < plugins.length - 1 && (
                      <Separator className="mt-3" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="mb-4 h-16 w-16 text-[#8fa2bb]" />
            <h3 className="font-semibold text-lg mb-1">
              {t('pluginsDisabledTitle')}
            </h3>
            <p className="max-w-sm text-sm text-[#8fa2bb]">
              {t('pluginsDisabledDesc')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export { Plugins };


