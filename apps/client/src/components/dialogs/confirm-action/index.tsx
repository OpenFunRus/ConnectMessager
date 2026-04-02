import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AutoFocus
} from '@connectmessager/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TDialogBaseProps } from '../types';

type TConfirmActionDialogProps = TDialogBaseProps & {
  onCancel?: () => void;
  onConfirm?: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'info';
};

const ConfirmActionDialog = memo(
  ({
    isOpen,
    onCancel,
    onConfirm,
    title,
    message,
    confirmLabel,
    cancelLabel,
    variant = 'info'
  }: TConfirmActionDialogProps) => {
    const { t } = useTranslation('dialogs');
    const confirmClassName =
      variant === 'danger'
        ? 'h-10 rounded-sm border border-[#d35d6e] bg-[#b54556] px-4 text-sm font-semibold text-white hover:border-[#e17b89] hover:bg-[#9f3d4d]'
        : 'h-10 rounded-sm border border-[#2f7ad1] bg-[#206bc4] px-4 text-sm font-semibold text-white hover:border-[#5595de] hover:bg-[#1b5dab]';

    return (
      <AlertDialog open={isOpen}>
        <AlertDialogContent className="w-[min(520px,calc(100vw-2rem))] max-w-[min(520px,calc(100vw-2rem))] gap-0 overflow-hidden rounded-[12px] border border-[#2b3544] bg-[#182433] p-0 text-white shadow-[0_30px_80px_rgba(3,8,20,0.55)]">
          <AlertDialogHeader className="border-b border-[#2b3544] bg-[#172231] px-5 py-4">
            <AlertDialogTitle className="text-white">
              {title ?? t('confirmActionTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#aab8cb]">
              {message ?? t('confirmActionMsg')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 border-t border-[#243140] bg-[#16212f] px-5 py-4">
            <AlertDialogCancel
              onClick={onCancel}
              className="mt-0 h-10 rounded-sm border border-[#314055] bg-[#101926] px-4 text-sm font-medium text-[#d7e2f0] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white"
            >
              {cancelLabel ?? t('cancel')}
            </AlertDialogCancel>
            <AutoFocus>
              <AlertDialogAction onClick={onConfirm} className={confirmClassName}>
                {confirmLabel ?? t('confirm')}
              </AlertDialogAction>
            </AutoFocus>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

export default ConfirmActionDialog;


