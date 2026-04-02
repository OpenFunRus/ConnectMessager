import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  ChannelType,
  parseTrpcErrors,
  type TTrpcErrors
} from '@connectmessager/shared';
import {
  AutoFocus,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Group,
  Input
} from '@connectmessager/ui';
import { Hash, Mic } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TDialogBaseProps } from '../types';

type TChannelTypeItemProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
};

const ChannelTypeItem = ({
  icon,
  title,
  description,
  isActive,
  onClick
}: TChannelTypeItemProps) => (
  <div
    className={cn(
      'flex cursor-pointer items-start gap-3 rounded-sm border px-3 py-3 transition-colors',
      isActive
        ? 'border-[#4677b8] bg-[#1b2b40] text-white'
        : 'border-[#2b3544] bg-[#101926] text-[#d7e2f0] hover:border-[#38506d] hover:bg-[#16212f]'
    )}
    onClick={onClick}
  >
    <div
      className={cn(
        'mt-0.5 flex h-9 w-9 items-center justify-center rounded-sm border',
        isActive
          ? 'border-[#5f90d1] bg-[#22385a] text-[#d7e8ff]'
          : 'border-[#314055] bg-[#111a26] text-[#8fa2bb]'
      )}
    >
      {icon}
    </div>
    <div className="flex flex-col">
      <span className="font-medium">{title}</span>
      <span className="text-sm text-[#8fa2bb]">{description}</span>
    </div>
  </div>
);

type TCreateChannelDialogProps = TDialogBaseProps & {
  categoryId: number;
  defaultChannelType?: ChannelType;
};

const CreateChannelDialog = memo(
  ({
    isOpen,
    categoryId,
    close,
    defaultChannelType = ChannelType.TEXT
  }: TCreateChannelDialogProps) => {
    const { t } = useTranslation('dialogs');
    const [channelType, setChannelType] = useState(defaultChannelType);
    const [name, setName] = useState('New Channel');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<TTrpcErrors>({});

    const onSubmit = useCallback(async () => {
      const trpc = getTRPCClient();

      setLoading(true);

      try {
        await trpc.channels.add.mutate({
          type: channelType,
          name,
          categoryId
        });

        close();
      } catch (error) {
        setErrors(parseTrpcErrors(error));
      } finally {
        setLoading(false);
      }
    }, [name, categoryId, close, channelType]);

    return (
      <Dialog open={isOpen}>
        <DialogContent
          close={close}
          overlayClassName="bg-[#0b1220]/70 backdrop-blur-sm"
          closeClassName="top-4 right-4 h-9 w-9 rounded-lg border border-[#314055] !bg-[#101926] p-0 text-[#8fa2bb] opacity-100 shadow-none hover:border-[#3d516b] hover:!bg-[#1b2940] hover:text-white data-[state=open]:!bg-[#101926] data-[state=open]:text-[#8fa2bb]"
          className="w-[min(560px,calc(100vw-2rem))] max-w-[min(560px,calc(100vw-2rem))] rounded-[12px] border border-[#2b3544] bg-[#182433] p-0 text-[#d7e2f0] shadow-[0_24px_64px_rgba(2,6,23,0.5)] [&_.text-muted-foreground]:text-[#8fa2bb] [&_[data-slot=button]]:rounded-sm [&_[data-slot=button]]:border [&_[data-slot=button]]:border-[#314055] [&_[data-slot=button]]:shadow-none [&_[data-slot=input]]:rounded-sm [&_[data-slot=input]]:border-[#314055] [&_[data-slot=input]]:bg-[#0f1722] [&_[data-slot=input]]:text-[#d7e2f0] [&_[data-slot=input]]:placeholder:text-[#6f839b] [&_[data-slot=input]:focus-visible]:border-[#4677b8] [&_[data-slot=input]:focus-visible]:ring-2 [&_[data-slot=input]:focus-visible]:ring-[#4677b8]/25"
        >
          <DialogHeader className="border-b border-[#2b3544] bg-[#172231] px-5 py-4 text-left">
            <DialogTitle className="text-lg font-semibold text-white">
              {t('createChannelTitle')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 px-5 py-5">
            <Group label={t('channelTypeLabel')}>
              <div className="space-y-2">
                <ChannelTypeItem
                  title={t('textChannelTitle')}
                  description={t('textChannelDesc')}
                  icon={<Hash className="h-5 w-5" />}
                  isActive={channelType === ChannelType.TEXT}
                  onClick={() => setChannelType(ChannelType.TEXT)}
                />

                <ChannelTypeItem
                  title={t('voiceChannelTitle')}
                  description={t('voiceChannelDesc')}
                  icon={<Mic className="h-5 w-5" />}
                  isActive={channelType === ChannelType.VOICE}
                  onClick={() => setChannelType(ChannelType.VOICE)}
                />
              </div>
            </Group>

            <Group label={t('channelNameLabel')}>
              <AutoFocus>
                <Input
                  placeholder={t('channelNamePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  name="name"
                  error={errors.name}
                  resetError={setErrors}
                  onEnter={onSubmit}
                />
              </AutoFocus>
            </Group>
          </div>

          <DialogFooter className="gap-2 border-t border-[#243140] bg-[#16212f] px-5 py-4">
            <Button
              variant="ghost"
              onClick={close}
              className="bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={onSubmit}
              disabled={loading || !name || !channelType}
              className="border-[#4677b8] bg-[#2b5ea7] text-white hover:border-[#5f90d1] hover:bg-[#346cbd]"
            >
              {t('createChannelBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export { CreateChannelDialog };


