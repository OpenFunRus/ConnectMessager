import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@connectmessager/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TServerScreenBaseProps } from '../screens';
import { General } from './general';
import { ChannelPermissions } from './permissions';
import { Security } from './security';

type TChannelSettingsProps = TServerScreenBaseProps & {
  channelId: number;
};

const ChannelSettings = memo(({ close, isOpen, channelId }: TChannelSettingsProps) => {
  const { t } = useTranslation('settings');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent
        close={close}
        overlayClassName="bg-[#0b1220]/80 backdrop-blur-sm"
        closeClassName="top-4 right-4 h-9 w-9 rounded-lg border border-[#314055] !bg-[#101926] p-0 text-[#8fa2bb] opacity-100 shadow-none hover:border-[#3d516b] hover:!bg-[#1b2940] hover:text-white data-[state=open]:!bg-[#101926] data-[state=open]:text-[#8fa2bb]"
        className="h-[min(88vh,880px)] w-[min(1040px,calc(100vw-2rem))] max-w-[min(1040px,calc(100vw-2rem))] sm:max-w-[min(1040px,calc(100vw-2rem))] gap-0 overflow-hidden rounded-[12px] border border-[#2b3544] bg-[#182433] p-0 text-[#d7e2f0] shadow-[0_24px_64px_rgba(2,6,23,0.5)]"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.015)_0%,rgba(255,255,255,0)_18%),linear-gradient(135deg,rgba(38,84,148,0.08)_0%,rgba(24,36,51,0)_38%)]" />

          <DialogHeader className="relative border-b border-[#2b3544] bg-[#172231] px-5 py-4 text-left">
            <DialogTitle className="text-lg font-semibold tracking-[0.01em] text-white">
              {t('channelSettingsTitle')}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="general" className="relative flex min-h-0 flex-1 flex-col">
            <div className="border-b border-[#2b3544] bg-[#16212f] px-4 py-3">
              <TabsList className="grid h-auto w-full grid-cols-1 gap-2 bg-transparent p-0 sm:grid-cols-3">
                <TabsTrigger
                  value="general"
                  className="h-11 min-w-0 justify-center rounded-sm border border-[#2b3544] bg-[#101926] px-3 py-2 text-sm font-medium text-[#8fa2bb] shadow-none transition-all hover:border-[#38506d] hover:bg-[#172231] hover:text-white data-[state=active]:border-[#4677b8] data-[state=active]:bg-[#1b2b40] data-[state=active]:text-white"
                >
                  {t('generalTab')}
                </TabsTrigger>
                <TabsTrigger
                  value="permissions"
                  className="h-11 min-w-0 justify-center rounded-sm border border-[#2b3544] bg-[#101926] px-3 py-2 text-sm font-medium text-[#8fa2bb] shadow-none transition-all hover:border-[#38506d] hover:bg-[#172231] hover:text-white data-[state=active]:border-[#4677b8] data-[state=active]:bg-[#1b2b40] data-[state=active]:text-white"
                >
                  {t('permissionsTab')}
                </TabsTrigger>
                <TabsTrigger
                  value="security"
                  className="h-11 min-w-0 justify-center rounded-sm border border-[#2b3544] bg-[#101926] px-3 py-2 text-sm font-medium text-[#8fa2bb] shadow-none transition-all hover:border-[#38506d] hover:bg-[#172231] hover:text-white data-[state=active]:border-[#4677b8] data-[state=active]:bg-[#1b2b40] data-[state=active]:text-white"
                >
                  {t('securityTab')}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-[#182433] px-4 py-4 lg:px-5 lg:py-5 [&_.text-muted-foreground]:text-[#8fa2bb] [&_[data-slot=alert]]:rounded-sm [&_[data-slot=alert]]:border-[#314055] [&_[data-slot=alert]]:bg-[#101926] [&_[data-slot=alert]]:text-[#d7e2f0] [&_[data-slot=button]]:rounded-sm [&_[data-slot=button]]:border [&_[data-slot=button]]:border-[#314055] [&_[data-slot=button]]:shadow-none [&_[data-slot=button]]:transition-colors [&_[data-slot=card]]:rounded-md [&_[data-slot=card]]:border-[#2b3544] [&_[data-slot=card]]:bg-[#101926] [&_[data-slot=card]]:text-[#d7e2f0] [&_[data-slot=card]]:shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] [&_[data-slot=card-content]]:pt-1 [&_[data-slot=card-description]]:text-[#8fa2bb] [&_[data-slot=card-header]]:border-b [&_[data-slot=card-header]]:border-[#243140] [&_[data-slot=card-header]]:pb-4 [&_[data-slot=card-title]]:text-[15px] [&_[data-slot=card-title]]:font-semibold [&_[data-slot=card-title]]:text-white [&_[data-slot=input]]:rounded-sm [&_[data-slot=input]]:border-[#314055] [&_[data-slot=input]]:bg-[#0f1722] [&_[data-slot=input]]:text-[#d7e2f0] [&_[data-slot=input]]:shadow-none [&_[data-slot=input]]:placeholder:text-[#6f839b] [&_[data-slot=input]:focus-visible]:border-[#4677b8] [&_[data-slot=input]:focus-visible]:ring-2 [&_[data-slot=input]:focus-visible]:ring-[#4677b8]/25 [&_[data-slot=textarea]]:rounded-sm [&_[data-slot=textarea]]:border-[#314055] [&_[data-slot=textarea]]:bg-[#0f1722] [&_[data-slot=textarea]]:text-[#d7e2f0] [&_[data-slot=textarea]]:placeholder:text-[#6f839b] [&_[data-slot=textarea]:focus-visible]:border-[#4677b8] [&_[data-slot=textarea]:focus-visible]:ring-2 [&_[data-slot=textarea]:focus-visible]:ring-[#4677b8]/25 [&_[data-slot=switch]]:h-5 [&_[data-slot=switch]]:w-9 [&_[data-slot=switch]]:border-[#314055] [&_[data-slot=switch]]:data-[state=unchecked]:bg-[#243140] [&_[data-slot=switch]]:data-[state=checked]:bg-[#356fbd] [&_[data-slot=switch-thumb]]:bg-[#d7e2f0] [&_[data-slot=switch-thumb]]:data-[state=checked]:bg-white">
              <div className="mx-auto w-full max-w-5xl">
                <TabsContent value="general" className="space-y-6">
                  <General channelId={channelId} />
                </TabsContent>
                <TabsContent value="permissions" className="space-y-6">
                  <ChannelPermissions channelId={channelId} />
                </TabsContent>
                <TabsContent value="security" className="space-y-6">
                  <Security channelId={channelId} />
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export { ChannelSettings };


