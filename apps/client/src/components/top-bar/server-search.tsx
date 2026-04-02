import { openDialog } from '@/features/dialogs/actions';
import { Search } from 'lucide-react';
import { memo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '../dialogs/dialogs';

const ServerSearch = memo(() => {
  const { t } = useTranslation('topbar');
  const openSearchDialog = useCallback(() => {
    openDialog(Dialog.SEARCH);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openSearchDialog();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openSearchDialog]);

  return (
    <button
      type="button"
      onClick={openSearchDialog}
      className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-[#314055] bg-[#101926] px-3 py-2 text-sm text-[#8fa2bb] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:border-[#3d516b] hover:bg-[#162132] hover:text-white lg:gap-3 lg:px-3.5"
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="truncate text-left">{t('searchContent')}</span>
    </button>
  );
});

export { ServerSearch };
