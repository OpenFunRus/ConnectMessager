import { Spinner } from '@connectmessager/ui';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type TGifItem = {
  id: string;
  url: string;
  previewUrl: string;
};

type TGifResponse = {
  results?: TGifItem[];
};

type TGifsTabProps = {
  open: boolean;
  active: boolean;
  search: string;
  reloadKey: number;
  onSelect: (gifUrl: string) => void;
};

const TENOR_LIMIT = 10;

const GifsTab = memo(
  ({ open, active, search, reloadKey, onSelect }: TGifsTabProps) => {
    const { t } = useTranslation('common');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [gifs, setGifs] = useState<TGifItem[]>([]);

    useEffect(() => {
      if (!open || !active) {
        return;
      }

      const isSearching = search.trim().length > 0;

      let cancelled = false;
      const debounceTimeout = setTimeout(async () => {
        try {
          setLoading(true);
          setError(false);
          const params = new URLSearchParams({
            limit: String(TENOR_LIMIT)
          });

          if (search.trim().length > 0) {
            params.set('q', search.trim());
          }

          const tenorUrl = import.meta.env.DEV
            ? `http://${window.location.hostname}:4991/tenor?${params.toString()}`
            : `/tenor?${params.toString()}`;

          const response = await fetch(tenorUrl);

          if (!response.ok) {
            throw new Error(`Tenor proxy failed: ${response.status}`);
          }

          const payload = (await response.json()) as TGifResponse;
          const items = (payload.results ?? []).slice(0, TENOR_LIMIT);

          if (!cancelled) {
            setGifs(items);
          }
        } catch {
          if (!cancelled) {
            setError(true);
            setGifs([]);
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      }, isSearching ? 250 : 0);

      return () => {
        cancelled = true;
        clearTimeout(debounceTimeout);
      };
    }, [active, open, reloadKey, search]);

    if (loading) {
      return (
        <div className="flex h-full items-center justify-center text-[#8fa2bb]">
          <Spinner size="sm" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex h-full items-center justify-center px-4 text-center text-sm text-[#8fa2bb]">
          {t('gifsLoadFailed')}
        </div>
      );
    }

    if (!gifs.length) {
      return (
        <div className="flex h-full items-center justify-center px-4 text-center text-sm text-[#8fa2bb]">
          {t('noGifsFound')}
        </div>
      );
    }

    return (
      <div className="h-full min-h-0 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-2">
        {gifs.map((gif) => (
          <button
            key={gif.id}
            type="button"
            onClick={() => onSelect(gif.url)}
            className="overflow-hidden rounded-lg border border-[#314055] bg-[#101926] transition-colors hover:border-[#3d516b]"
          >
            <img
              src={gif.previewUrl}
              alt={t('gifAlt')}
              className="h-24 w-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
        </div>
      </div>
    );
  }
);

export { GifsTab };

