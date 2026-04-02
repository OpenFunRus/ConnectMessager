import { MessageRenderer } from '@/components/channel-view/text/renderer';
import { PaginatedList } from '@/components/paginated-list';
import { useDateLocale } from '@/hooks/use-date-locale';
import type { TMessage } from '@connectmessager/shared';
import { format } from 'date-fns';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useModViewContext } from '../context';

const searchFilter = (message: TMessage, term: string) =>
  message.content?.toLowerCase().includes(term.toLowerCase()) ?? false;

const Messages = memo(() => {
  const { t } = useTranslation('settings');
  const dateLocale = useDateLocale();
  const { messages } = useModViewContext();

  return (
    <PaginatedList
      items={messages}
      itemsPerPage={8}
      searchFilter={searchFilter}
    >
      <PaginatedList.Search
        placeholder={t('searchMessagesPlaceholder')}
        className="mb-2"
      />
      <PaginatedList.Empty className="text-xs">
        {t('noMessagesFound')}
      </PaginatedList.Empty>
      <PaginatedList.List<TMessage>
        className="flex flex-col gap-2"
        getItemKey={(message) => message.id}
      >
        {(message) => (
          <div className="rounded-sm border border-[#2b3544] bg-[#111a26] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            <span className="text-xs text-[#8fa2bb]">
              {format(new Date(message.createdAt), 'PPpp', {
                locale: dateLocale
              })}
            </span>
            <MessageRenderer
              message={{
                ...message,
                files: [],
                reactions: []
              }}
            />
          </div>
        )}
      </PaginatedList.List>
      <PaginatedList.Pagination className="mt-2" />
    </PaginatedList>
  );
});

export { Messages };


