import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import type { TGifItem } from '../types';
import {
  MAX_RECENT_EMOJIS,
  MAX_RECENT_GIFS,
  RECENT_EMOJIS_STORAGE_KEY,
  RECENT_GIFS_STORAGE_KEY,
  TENOR_LIMIT
} from '../constants';
import { loadRecentEmojiNames, loadRecentGifUrls } from '../utils';
import { useCallback, useEffect, useRef, useState } from 'react';

const usePrototypeEmojiPicker = () => {
  const [recentEmojiNames, setRecentEmojiNames] = useState<string[]>(() =>
    loadRecentEmojiNames()
  );
  const [recentGifUrls, setRecentGifUrls] = useState<string[]>(() => loadRecentGifUrls());
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [emojiPanelTab, setEmojiPanelTab] = useState<'emoji' | 'gifs'>('emoji');
  const [gifSearch, setGifSearch] = useState('');
  const [gifItems, setGifItems] = useState<TGifItem[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifLoadFailed, setGifLoadFailed] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null);
  const emojiPopoverRef = useRef<HTMLDivElement | null>(null);

  const closeEmojiPicker = useCallback(() => {
    setIsEmojiPickerOpen(false);
  }, []);

  const addRecentEmoji = useCallback((emoji: TEmojiItem) => {
    setRecentEmojiNames((prev) => {
      const next = [emoji.name, ...prev.filter((name) => name !== emoji.name)].slice(
        0,
        MAX_RECENT_EMOJIS
      );
      return next;
    });
  }, []);

  const addRecentGif = useCallback((gifUrl: string) => {
    setRecentGifUrls((prev) =>
      [gifUrl, ...prev.filter((existing) => existing !== gifUrl)].slice(0, MAX_RECENT_GIFS)
    );
  }, []);

  useEffect(() => {
    if (!isEmojiPickerOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      if (emojiPopoverRef.current?.contains(target)) {
        return;
      }

      if (emojiButtonRef.current?.contains(target)) {
        return;
      }

      closeEmojiPicker();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeEmojiPicker();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeEmojiPicker, isEmojiPickerOpen]);

  useEffect(() => {
    if (!isEmojiPickerOpen || emojiPanelTab !== 'gifs') return;

    let cancelled = false;
    const timer = window.setTimeout(
      async () => {
        try {
          setGifLoading(true);
          setGifLoadFailed(false);
          const params = new URLSearchParams({
            limit: String(TENOR_LIMIT)
          });
          const query = gifSearch.trim();
          if (query.length > 0) {
            params.set('q', query);
          }

          const tenorUrl = import.meta.env.DEV
            ? `http://${window.location.hostname}:4991/tenor?${params.toString()}`
            : `/tenor?${params.toString()}`;
          const response = await fetch(tenorUrl);
          if (!response.ok) {
            throw new Error(`Tenor proxy failed: ${response.status}`);
          }

          const payload = (await response.json()) as { results?: TGifItem[] };
          if (cancelled) return;
          const fetched = (payload.results ?? []).slice(0, TENOR_LIMIT);
          if (query.length === 0) {
            const recentAsItems: TGifItem[] = recentGifUrls.slice(0, TENOR_LIMIT).map((url) => ({
              id: `recent-${url}`,
              url,
              previewUrl: url
            }));
            const uniqueFetched = fetched.filter(
              (item) => !recentGifUrls.some((recentUrl) => recentUrl === item.url)
            );
            setGifItems([...recentAsItems, ...uniqueFetched].slice(0, TENOR_LIMIT));
            return;
          }
          setGifItems(fetched);
        } catch {
          if (cancelled) return;
          setGifLoadFailed(true);
          setGifItems([]);
        } finally {
          if (!cancelled) {
            setGifLoading(false);
          }
        }
      },
      gifSearch.trim().length > 0 ? 250 : 0
    );

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [emojiPanelTab, gifSearch, isEmojiPickerOpen, recentGifUrls]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(
        RECENT_EMOJIS_STORAGE_KEY,
        JSON.stringify(recentEmojiNames.slice(0, MAX_RECENT_EMOJIS))
      );
    } catch {
      // ignore storage errors
    }
  }, [recentEmojiNames]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(
        RECENT_GIFS_STORAGE_KEY,
        JSON.stringify(recentGifUrls.slice(0, MAX_RECENT_GIFS))
      );
    } catch {
      // ignore storage errors
    }
  }, [recentGifUrls]);

  return {
    recentEmojiNames,
    recentGifUrls,
    isEmojiPickerOpen,
    setIsEmojiPickerOpen,
    closeEmojiPicker,
    emojiPanelTab,
    setEmojiPanelTab,
    gifSearch,
    setGifSearch,
    gifItems,
    gifLoading,
    gifLoadFailed,
    emojiButtonRef,
    emojiPopoverRef,
    addRecentEmoji,
    addRecentGif
  };
};

export { usePrototypeEmojiPicker };
