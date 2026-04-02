import type { TDialogBaseProps } from '@/components/dialogs/types';
import { PaginatedList } from '@/components/paginated-list';
import { jumpToMessage } from '@/features/server/actions';
import { useUsernames } from '@/features/server/users/hooks';
import { useOnEsc } from '@/hooks/use-on-esc';
import type { TMessageJumpToTarget } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Spinner
} from '@connectmessager/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearch } from './hooks';
import { SearchResultFileCard } from './search-result-file';
import { SearchResultMessageCard } from './search-result-message';
import type { TUnifiedSearchResult } from './types';

const ITEMS_PER_PAGE = 12;

type TSearchDialogProps = TDialogBaseProps;

const SearchDialog = memo(({ isOpen, close }: TSearchDialogProps) => {
  const { t } = useTranslation('dialogs');
  useOnEsc(close);

  const usernames = useUsernames();

  const { query, setQuery, loading, canSearch, unifiedResults } =
    useSearch(isOpen);

  const onJump = useCallback(
    (target: TMessageJumpToTarget) => {
      jumpToMessage(target);
      close();
    },
    [close]
  );

  return (
    <Dialog open={isOpen}>
      <DialogContent
        className="h-[86vh] max-h-[94vh] gap-0 overflow-hidden border border-[#314055] bg-[#182433] p-0 text-[#d7e2f0] shadow-[0_24px_64px_rgba(2,6,23,0.45)] lg:min-w-7xl"
        onInteractOutside={close}
        close={close}
      >
        <div className="flex h-full min-h-0 flex-col">
          <DialogHeader className="border-b border-[#314055] bg-[#172231] px-5 py-4 text-left">
            <DialogTitle className="text-base text-white">
              {t('searchTitle')}
            </DialogTitle>
            <DialogDescription className="text-[#8fa2bb]">
              {t('searchDesc')}
            </DialogDescription>
            <div className="mt-3">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('searchPlaceholder')}
                autoFocus
                className="h-10 border-[#314055] bg-[#101926] text-[#d7e2f0] placeholder:text-[#6e819a] focus-visible:border-[#3d516b] focus-visible:ring-[#206bc4]/20"
              />
            </div>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
            {!canSearch && !loading && (
              <div className="flex h-full min-h-55 items-center justify-center rounded-xl border border-[#314055] bg-[#172231] px-6 text-sm text-[#8fa2bb]">
                {t('searchHint')}
              </div>
            )}

            {loading && (
              <div className="flex h-full min-h-55 items-center justify-center">
                <Spinner size="sm" />
              </div>
            )}

            {canSearch && !loading && (
              <PaginatedList
                items={unifiedResults}
                itemsPerPage={ITEMS_PER_PAGE}
              >
                <PaginatedList.Empty className="flex h-full min-h-55 items-center justify-center rounded-xl border border-[#314055] bg-[#172231] px-6 text-sm text-[#8fa2bb]">
                  {t('noResults')}
                </PaginatedList.Empty>

                <PaginatedList.List<TUnifiedSearchResult>
                  className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"
                  getItemKey={(entry) => entry.key}
                >
                  {(entry) => {
                    if (entry.type === 'message') {
                      return (
                        <SearchResultMessageCard
                          message={entry.item}
                          userName={
                            usernames[entry.item.userId] ?? t('unknownUser')
                          }
                          onJump={onJump}
                        />
                      );
                    }

                    return (
                      <SearchResultFileCard
                        result={entry.item}
                        onJump={onJump}
                      />
                    );
                  }}
                </PaginatedList.List>

                <PaginatedList.Pagination
                  alwaysShow
                  className="flex shrink-0 items-center justify-center gap-1 border-t border-[#314055] pt-3"
                />
              </PaginatedList>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export { SearchDialog };


