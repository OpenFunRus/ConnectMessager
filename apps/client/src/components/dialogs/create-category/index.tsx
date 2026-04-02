import { useForm } from '@/hooks/use-form';
import { getTRPCClient } from '@/lib/trpc';
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
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TDialogBaseProps } from '../types';

type TCreateCategoryDialogProps = TDialogBaseProps;

const CreateCategoryDialog = memo(
  ({ isOpen, close }: TCreateCategoryDialogProps) => {
    const { t } = useTranslation('dialogs');
    const { values, r, setTrpcErrors } = useForm({
      name: 'New Category'
    });
    const [loading, setLoading] = useState(false);

    const onSubmit = useCallback(async () => {
      const trpc = getTRPCClient();

      setLoading(true);

      try {
        await trpc.categories.add.mutate({
          name: values.name
        });

        close();
      } catch (error) {
        setTrpcErrors(error);
      } finally {
        setLoading(false);
      }
    }, [values.name, close, setTrpcErrors]);

    return (
      <Dialog open={isOpen}>
        <DialogContent
          close={close}
          overlayClassName="bg-[#0b1220]/70 backdrop-blur-sm"
          closeClassName="top-4 right-4 h-9 w-9 rounded-lg border border-[#314055] !bg-[#101926] p-0 text-[#8fa2bb] opacity-100 shadow-none hover:border-[#3d516b] hover:!bg-[#1b2940] hover:text-white data-[state=open]:!bg-[#101926] data-[state=open]:text-[#8fa2bb]"
          className="w-[min(520px,calc(100vw-2rem))] max-w-[min(520px,calc(100vw-2rem))] rounded-[12px] border border-[#2b3544] bg-[#182433] p-0 text-[#d7e2f0] shadow-[0_24px_64px_rgba(2,6,23,0.5)] [&_.text-muted-foreground]:text-[#8fa2bb] [&_[data-slot=button]]:rounded-sm [&_[data-slot=button]]:border [&_[data-slot=button]]:border-[#314055] [&_[data-slot=button]]:shadow-none [&_[data-slot=input]]:rounded-sm [&_[data-slot=input]]:border-[#314055] [&_[data-slot=input]]:bg-[#0f1722] [&_[data-slot=input]]:text-[#d7e2f0] [&_[data-slot=input]]:placeholder:text-[#6f839b] [&_[data-slot=input]:focus-visible]:border-[#4677b8] [&_[data-slot=input]:focus-visible]:ring-2 [&_[data-slot=input]:focus-visible]:ring-[#4677b8]/25"
        >
          <DialogHeader className="border-b border-[#2b3544] bg-[#172231] px-5 py-4 text-left">
            <DialogTitle className="text-lg font-semibold text-white">
              {t('createCategoryTitle')}
            </DialogTitle>
          </DialogHeader>

          <div className="px-5 py-5">
            <Group label={t('categoryNameLabel')}>
              <AutoFocus>
                <Input
                  {...r('name')}
                  placeholder={t('categoryNamePlaceholder')}
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
              disabled={loading}
              className="border-[#4677b8] bg-[#2b5ea7] text-white hover:border-[#5f90d1] hover:bg-[#346cbd]"
            >
              {t('createCategoryBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export { CreateCategoryDialog };


