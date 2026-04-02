import { setModViewOpen } from '@/features/app/actions';
import { useModViewOpen } from '@/features/app/hooks';
import { useAdminUserInfo } from '@/features/server/admin/hooks';
import { extractUrls } from '@connectmessager/shared';
import { Dialog, DialogContent, DialogTitle } from '@connectmessager/ui';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ModViewContext, ModViewScreen, type TModViewContext } from './context';
import { ModViewContent } from './mod-view-content';

type TContentWrapperProps = {
  userId: number;
};

const ContentWrapper = memo(({ userId }: TContentWrapperProps) => {
  const { t } = useTranslation('settings');
  const [currentView, setCurrentView] = useState<ModViewScreen | undefined>(
    undefined
  );
  const { user, loading, refetch, logins, files, messages } =
    useAdminUserInfo(userId);

  const contextValue = useMemo<TModViewContext>(() => {
    const links: string[] = messages
      .map((msg) => extractUrls(msg.content ?? ''))
      .flat()
      .filter((value, index, self) => self.indexOf(value) === index);

    return {
      userId,
      user: user!,
      logins,
      files,
      messages,
      links,
      refetch,
      view: currentView,
      setView: setCurrentView
    };
  }, [userId, refetch, files, user, logins, messages, currentView]);

  if (loading || !user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">{t('modViewLoading')}</p>
      </div>
    );
  }

  return (
    <ModViewContext.Provider value={contextValue}>
      <ModViewContent key={userId} />
    </ModViewContext.Provider>
  );
});

const ModViewSheet = memo(() => {
  const { t } = useTranslation('settings');
  const { isOpen, userId } = useModViewOpen();

  const handleClose = useCallback(() => {
    setModViewOpen(false);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, handleClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        close={handleClose}
        overlayClassName="bg-[#0b1220]/80 backdrop-blur-sm"
        closeClassName="top-4 right-4 h-9 w-9 rounded-lg border border-[#314055] !bg-[#101926] p-0 text-[#8fa2bb] opacity-100 shadow-none hover:border-[#3d516b] hover:!bg-[#1b2940] hover:text-white data-[state=open]:!bg-[#101926] data-[state=open]:text-[#8fa2bb]"
        className="h-[min(88vh,860px)] w-[min(960px,calc(100vw-2rem))] max-w-[min(960px,calc(100vw-2rem))] sm:max-w-[min(960px,calc(100vw-2rem))] gap-0 overflow-hidden rounded-[12px] border border-[#2b3544] bg-[#182433] p-0 text-[#d7e2f0] shadow-[0_24px_64px_rgba(2,6,23,0.5)] [&_.text-muted-foreground]:text-[#8fa2bb] [&_[data-slot=alert]]:rounded-sm [&_[data-slot=alert]]:border-[#314055] [&_[data-slot=alert]]:bg-[#101926] [&_[data-slot=alert]]:text-[#d7e2f0] [&_[data-slot=button]]:rounded-sm [&_[data-slot=button]]:border [&_[data-slot=button]]:border-[#314055] [&_[data-slot=button]]:shadow-none [&_[data-slot=button]]:transition-colors [&_[data-slot=card]]:gap-0 [&_[data-slot=card]]:rounded-[12px] [&_[data-slot=card]]:border-[#2b3544] [&_[data-slot=card]]:bg-[#101926] [&_[data-slot=card]]:text-[#d7e2f0] [&_[data-slot=card]]:shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] [&_[data-slot=card-content]]:pt-0 [&_[data-slot=card-header]]:border-b [&_[data-slot=card-header]]:border-[#243140] [&_[data-slot=card-header]]:bg-[#111a26] [&_[data-slot=card-header]]:pb-4 [&_[data-slot=card-title]]:text-[15px] [&_[data-slot=card-title]]:font-semibold [&_[data-slot=card-title]]:text-white [&_[data-slot=input]]:rounded-sm [&_[data-slot=input]]:border-[#314055] [&_[data-slot=input]]:bg-[#0f1722] [&_[data-slot=input]]:text-[#d7e2f0] [&_[data-slot=input]]:placeholder:text-[#6f839b] [&_[data-slot=input]:focus-visible]:border-[#4677b8] [&_[data-slot=input]:focus-visible]:ring-2 [&_[data-slot=input]:focus-visible]:ring-[#4677b8]/25 [&_[data-slot=icon-button]]:rounded-sm [&_[data-slot=icon-button]]:border [&_[data-slot=icon-button]]:border-[#314055] [&_[data-slot=icon-button]]:bg-[#101926] [&_[data-slot=icon-button]]:text-[#8fa2bb] [&_[data-slot=icon-button]]:hover:border-[#3d516b] [&_[data-slot=icon-button]]:hover:bg-[#1b2940] [&_[data-slot=icon-button]]:hover:text-white"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{t('modViewTitle')}</DialogTitle>
        {userId && <ContentWrapper userId={userId} />}
      </DialogContent>
    </Dialog>
  );
});

export { ModViewSheet };


