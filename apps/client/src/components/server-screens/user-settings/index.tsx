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
import {
  Bell,
  LockKeyhole,
  ScanFace,
  SlidersHorizontal,
  SquareUserRound
} from 'lucide-react';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TServerScreenBaseProps } from '../screens';
import { Devices } from './devices';
import { Notifications } from './notifications';
import { Others } from './others';
import { Password } from './password';
import { Profile } from './profile';

type TUserSettingsProps = TServerScreenBaseProps;

const UserSettings = memo(({ close, isOpen }: TUserSettingsProps) => {
  const { t } = useTranslation('settings');
  const tabItems = useMemo(
    () => [
      {
        value: 'profile',
        label: t('profileTab'),
        icon: SquareUserRound
      },
      {
        value: 'devices',
        label: t('devicesTab'),
        icon: ScanFace
      },
      {
        value: 'password',
        label: t('passwordTab'),
        icon: LockKeyhole
      },
      {
        value: 'notifications',
        label: t('notificationsTab'),
        icon: Bell
      },
      {
        value: 'others',
        label: t('othersTab'),
        icon: SlidersHorizontal
      }
    ],
    [t]
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent
        close={close}
        overlayClassName="bg-[#0b1220]/80 backdrop-blur-sm"
        closeClassName="top-4 right-4 h-9 w-9 rounded-lg border border-[#314055] !bg-[#101926] p-0 text-[#8fa2bb] opacity-100 shadow-none hover:border-[#3d516b] hover:!bg-[#1b2940] hover:text-white data-[state=open]:!bg-[#101926] data-[state=open]:text-[#8fa2bb]"
        className="h-[min(88vh,860px)] w-[min(980px,calc(100vw-2rem))] max-w-[min(980px,calc(100vw-2rem))] sm:max-w-[min(980px,calc(100vw-2rem))] gap-0 overflow-hidden rounded-[12px] border border-[#2b3544] bg-[#182433] p-0 text-[#d7e2f0] shadow-[0_24px_64px_rgba(2,6,23,0.5)]"
        onInteractOutside={close}
      >
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.015)_0%,rgba(255,255,255,0)_18%),linear-gradient(135deg,rgba(38,84,148,0.08)_0%,rgba(24,36,51,0)_38%)]" />

          <DialogHeader className="relative border-b border-[#2b3544] bg-[#172231] px-5 py-4 text-left">
            <DialogTitle className="text-lg font-semibold tracking-[0.01em] text-white">
              {t('userSettingsTitle')}
            </DialogTitle>
          </DialogHeader>

          <Tabs
            defaultValue="profile"
            className="relative flex min-h-0 flex-1 flex-col"
          >
            <div className="border-b border-[#2b3544] bg-[#16212f] px-4 py-3">
              <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 sm:grid-cols-3 lg:grid-cols-5">
                {tabItems.map(({ value, label, icon: Icon }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="h-11 min-w-0 justify-center gap-2 rounded-sm border border-[#314055] !bg-[#101926] px-3 py-2 text-sm font-medium !text-[#8fa2bb] shadow-none transition-all hover:!border-[#3d516b] hover:!bg-[#1b2940] hover:!text-white focus-visible:!border-[#4677b8] focus-visible:!bg-[#1b2940] focus-visible:!text-white focus-visible:!ring-[#4677b8]/25 data-[state=active]:!border-[#4677b8] data-[state=active]:!bg-[#223146] data-[state=active]:!text-white data-[state=active]:shadow-none"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-[#182433] px-4 py-4 lg:px-5 lg:py-5 [&_[data-slot=alert]]:rounded-sm [&_[data-slot=alert]]:border-[#314055] [&_[data-slot=alert]]:bg-[#101926] [&_[data-slot=alert]]:text-[#d7e2f0] [&_[data-slot=button]]:rounded-sm [&_[data-slot=button]]:border [&_[data-slot=button]]:border-[#314055] [&_[data-slot=button]]:shadow-none [&_[data-slot=button]]:transition-colors [&_[data-slot=card]]:rounded-md [&_[data-slot=card]]:border-[#2b3544] [&_[data-slot=card]]:bg-[#101926] [&_[data-slot=card]]:text-[#d7e2f0] [&_[data-slot=card]]:shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] [&_[data-slot=card-content]]:pt-1 [&_[data-slot=card-description]]:text-[#8fa2bb] [&_[data-slot=card-header]]:border-b [&_[data-slot=card-header]]:border-[#243140] [&_[data-slot=card-header]]:pb-4 [&_[data-slot=card-title]]:text-[15px] [&_[data-slot=card-title]]:font-semibold [&_[data-slot=card-title]]:text-white [&_[data-slot=input]]:rounded-sm [&_[data-slot=input]]:border-[#314055] [&_[data-slot=input]]:bg-[#0f1722] [&_[data-slot=input]]:text-[#d7e2f0] [&_[data-slot=input]]:shadow-none [&_[data-slot=input]]:placeholder:text-[#6f839b] [&_[data-slot=input]:focus-visible]:border-[#4677b8] [&_[data-slot=input]:focus-visible]:ring-2 [&_[data-slot=input]:focus-visible]:ring-[#4677b8]/25 [&_[data-slot=label]]:text-[#aebfd3] [&_[data-slot=select-content]]:rounded-sm [&_[data-slot=select-content]]:border-[#314055] [&_[data-slot=select-content]]:bg-[#182433] [&_[data-slot=select-content]]:text-[#d7e2f0] [&_[data-slot=select-item]]:rounded-sm [&_[data-slot=select-item]]:text-[#d7e2f0] [&_[data-slot=select-item]:focus]:bg-[#1b2b40] [&_[data-slot=select-item]:focus]:text-white [&_[data-slot=select-trigger]]:rounded-sm [&_[data-slot=select-trigger]]:border-[#314055] [&_[data-slot=select-trigger]]:bg-[#0f1722] [&_[data-slot=select-trigger]]:text-[#d7e2f0] [&_[data-slot=select-trigger]:focus-visible]:border-[#4677b8] [&_[data-slot=select-trigger]:focus-visible]:ring-2 [&_[data-slot=select-trigger]:focus-visible]:ring-[#4677b8]/25 [&_[data-slot=slider-track]]:bg-[#223146] [&_[data-slot=slider-range]]:bg-[#4a90ff] [&_[data-slot=slider-thumb]]:border-[#4a90ff] [&_[data-slot=slider-thumb]]:bg-[#dcecff] [&_[data-slot=slider-thumb]]:shadow-[0_0_0_1px_rgba(12,18,28,0.45)] [&_[data-slot=switch]]:h-5 [&_[data-slot=switch]]:w-9 [&_[data-slot=switch]]:border-[#314055] [&_[data-slot=switch]]:data-[state=unchecked]:bg-[#243140] [&_[data-slot=switch]]:data-[state=checked]:bg-[#356fbd] [&_[data-slot=switch-thumb]]:bg-[#d7e2f0] [&_[data-slot=switch-thumb]]:data-[state=checked]:bg-white [&_[data-slot=textarea]]:rounded-sm [&_[data-slot=textarea]]:border-[#314055] [&_[data-slot=textarea]]:bg-[#0f1722] [&_[data-slot=textarea]]:text-[#d7e2f0] [&_[data-slot=textarea]]:placeholder:text-[#6f839b] [&_[data-slot=textarea]:focus-visible]:border-[#4677b8] [&_[data-slot=textarea]:focus-visible]:ring-2 [&_[data-slot=textarea]:focus-visible]:ring-[#4677b8]/25">
              <div className="w-full">
                <TabsContent value="profile" className="space-y-6">
                  <Profile />
                </TabsContent>
                <TabsContent value="devices" className="space-y-6">
                  <Devices />
                </TabsContent>
                <TabsContent value="password" className="space-y-6">
                  <Password />
                </TabsContent>
                <TabsContent value="notifications" className="space-y-6">
                  <Notifications />
                </TabsContent>
                <TabsContent value="others" className="space-y-6">
                  <Others />
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export { UserSettings };


