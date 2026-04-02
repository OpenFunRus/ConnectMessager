import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import {
  getLocalStorageItemAsJSON,
  LocalStorageKey,
  setLocalStorageItemAsJSON
} from '@/helpers/storage';
import { useCallback, useSyncExternalStore } from 'react';
import { findStandardEmoji } from './emoji-data';

const MAX_RECENT_EMOJIS = 32;

type StoredEmoji = {
  name: string;
  shortcodes: string[];
  fallbackImage?: string;
  emoji?: string;
};

let recentEmojisCache: TEmojiItem[] | null = null;

const subscribers = new Set<() => void>();

const notifySubscribers = () => {
  subscribers.forEach((callback) => callback());
};

const resolveStoredStandardEmoji = (emoji: StoredEmoji) => {
  if (emoji.emoji) {
    return findStandardEmoji(emoji.emoji) ?? findStandardEmoji(emoji.name);
  }

  const looksLikeOldStandardEmoji =
    emoji.fallbackImage?.includes('/twemoji/') ||
    emoji.fallbackImage?.includes('emoji-datasource') ||
    emoji.fallbackImage?.includes('githubassets.com/images/icons/emoji');

  if (!looksLikeOldStandardEmoji) {
    return undefined;
  }

  return (
    findStandardEmoji(emoji.name) ??
    emoji.shortcodes.map((shortcode) => findStandardEmoji(shortcode)).find(Boolean)
  );
};

const loadRecentEmojis = (): TEmojiItem[] => {
  if (recentEmojisCache !== null) {
    return recentEmojisCache;
  }

  const stored = getLocalStorageItemAsJSON<StoredEmoji[]>(
    LocalStorageKey.RECENT_EMOJIS,
    []
  );

  recentEmojisCache = (stored ?? []).map((emoji) => {
    const standardEmoji = resolveStoredStandardEmoji(emoji);

    if (!standardEmoji) {
      return emoji;
    }

    return {
      ...emoji,
      name: standardEmoji.name,
      shortcodes: standardEmoji.shortcodes,
      fallbackImage: standardEmoji.fallbackImage,
      emoji: standardEmoji.emoji
    };
  });

  return recentEmojisCache;
};

const saveRecentEmojis = (emojis: TEmojiItem[]): void => {
  const toStore: StoredEmoji[] = emojis.map((e) => ({
    name: e.name,
    shortcodes: e.shortcodes,
    fallbackImage: e.fallbackImage,
    emoji: e.emoji
  }));

  setLocalStorageItemAsJSON(LocalStorageKey.RECENT_EMOJIS, toStore);

  recentEmojisCache = emojis;

  notifySubscribers();
};

const addRecentEmoji = (emoji: TEmojiItem): void => {
  const current = loadRecentEmojis();

  const filtered = current.filter((e) => e.name !== emoji.name);
  const updated = [emoji, ...filtered].slice(0, MAX_RECENT_EMOJIS);

  saveRecentEmojis(updated);
};

const subscribe = (callback: () => void): (() => void) => {
  subscribers.add(callback);

  return () => subscribers.delete(callback);
};

const getSnapshot = (): TEmojiItem[] => {
  return loadRecentEmojis();
};

const useRecentEmojis = () => {
  const recentEmojis = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot
  );

  const addRecent = useCallback((emoji: TEmojiItem) => {
    addRecentEmoji(emoji);
  }, []);

  return {
    recentEmojis,
    addRecent
  };
};

export { addRecentEmoji, useRecentEmojis };
