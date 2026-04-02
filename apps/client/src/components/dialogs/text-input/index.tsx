import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AutoFocus,
  Input
} from '@connectmessager/ui';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TDialogBaseProps } from '../types';

type TTextInputDialogProps = TDialogBaseProps & {
  onCancel?: () => void;
  onConfirm?: (text: string | undefined) => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  allowEmpty?: boolean;
  isModalOpen: boolean;
  type?: 'text' | 'password';
};

const TextInputDialog = memo(
  ({
    isOpen,
    close,
    onCancel,
    onConfirm,
    title,
    message,
    confirmLabel,
    cancelLabel,
    allowEmpty,
    type
  }: TTextInputDialogProps) => {
    const { t } = useTranslation('dialogs');
    const [value, setValue] = useState<string | undefined>(undefined);

    const onSubmit = useCallback(() => {
      onConfirm?.(value);
    }, [onConfirm, value]);

    const onCancelClick = useCallback(() => {
      onCancel?.();
      close();
    }, [onCancel, close]);

    return (
      <AlertDialog open={isOpen}>
        <AlertDialogContent className="w-[min(520px,calc(100vw-2rem))] max-w-[min(520px,calc(100vw-2rem))] gap-0 overflow-hidden rounded-[12px] border border-[#2b3544] bg-[#182433] p-0 text-[#d7e2f0] shadow-[0_30px_80px_rgba(3,8,20,0.55)]">
          <AlertDialogHeader className="border-b border-[#2b3544] bg-[#172231] px-5 py-4 text-left">
            <AlertDialogTitle className="text-white">{title}</AlertDialogTitle>
            {message && (
              <AlertDialogDescription className="text-[#aab8cb]">
                {message}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <div className="px-5 py-5">
            <AutoFocus>
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onEnter={onSubmit}
                className="border-[#314055] bg-[#0f1722] text-[#d7e2f0] placeholder:text-[#6f839b] focus-visible:border-[#4677b8] focus-visible:ring-2 focus-visible:ring-[#4677b8]/25"
                type={type}
                autoFocus
              />
            </AutoFocus>
          </div>
          <AlertDialogFooter className="gap-2 border-t border-[#243140] bg-[#16212f] px-5 py-4">
            <AlertDialogCancel
              onClick={onCancelClick}
              className="border-[#314055] bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white"
            >
              {cancelLabel ?? t('cancel')}
            </AlertDialogCancel>
            <AutoFocus>
              <AlertDialogAction
                onClick={onSubmit}
                disabled={!allowEmpty && !value}
                className="border-[#4677b8] bg-[#2b5ea7] text-white hover:border-[#5f90d1] hover:bg-[#346cbd]"
              >
                {confirmLabel ?? t('confirm')}
              </AlertDialogAction>
            </AutoFocus>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

export { TextInputDialog };


