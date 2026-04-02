import { PaginatedList } from '@/components/paginated-list';
import { Button } from '@connectmessager/ui';
import { ExternalLink, Link as LinkIcon } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useModViewContext } from '../context';

type TLinkCardProps = {
  url: string;
  onOpen: () => void;
};

const LinkCard = memo(({ url, onOpen }: TLinkCardProps) => {
  const { t } = useTranslation('settings');

  const truncatedUrl = useMemo(() => {
    const maxLength = 50;

    if (url.length <= maxLength) return url;

    return `${url.slice(0, maxLength)}...`;
  }, [url]);

  const domain = useMemo(() => {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace(/^www\./, '');
    } catch {
      return t('naValue');
    }
  }, [url, t]);

  return (
    <div className="rounded-sm border border-[#2b3544] bg-[#111a26] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <LinkIcon className="h-4 w-4 flex-shrink-0 text-[#8fa2bb]" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate" title={url}>
              {truncatedUrl}
            </div>
            <div className="text-xs text-[#8fa2bb]">{domain}</div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onOpen}
          className="ml-2 flex-shrink-0 border border-[#314055] bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

const searchFilter = (url: string, term: string) =>
  url.toLowerCase().includes(term.toLowerCase());

const Links = memo(() => {
  const { t } = useTranslation('settings');
  const { links } = useModViewContext();

  const onOpenClick = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  return (
    <PaginatedList items={links} itemsPerPage={8} searchFilter={searchFilter}>
      <PaginatedList.Search
        placeholder={t('searchLinksPlaceholder')}
        className="mb-2"
      />
      <PaginatedList.Empty className="text-xs">
        {t('noLinksFound')}
      </PaginatedList.Empty>
      <PaginatedList.List<string> className="flex flex-col gap-2">
        {(url) => <LinkCard url={url} onOpen={() => onOpenClick(url)} />}
      </PaginatedList.List>
      <PaginatedList.Pagination className="mt-2" />
    </PaginatedList>
  );
});

export { Links };


