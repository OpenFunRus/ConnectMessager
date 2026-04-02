import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import { useCustomEmojis } from '@/features/server/emojis/hooks';
import {
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@connectmessager/ui';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomEmojiTab } from './custom-emoji-tab';
import { ALL_EMOJIS, searchEmojis, toTEmojiItem } from './emoji-data';
import { EmojiGrid } from './emoji-grid';
import { GifsTab } from './gifs-tab';
import { NativeEmojiTab } from './native-emoji-tab';
import { useRecentEmojis } from './use-recent-emojis';

type TEmojiPickerProps = {
  children: React.ReactNode;
  onEmojiSelect: (emoji: TEmojiItem) => void;
  onGifSelect?: (gifUrl: string) => void;
  defaultTab?: 'native' | 'custom' | 'gifs';
};

const EmojiPicker = memo(
  ({
    children,
    onEmojiSelect,
    onGifSelect,
    defaultTab = 'native'
  }: TEmojiPickerProps) => {
    const { t } = useTranslation('common');
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'native' | 'custom' | 'gifs'>(
      defaultTab
    );
    const [gifReloadKey, setGifReloadKey] = useState(0);
    const customEmojis = useCustomEmojis();
    const { addRecent } = useRecentEmojis();

    const convertedCustomEmojis = useMemo(
      () => customEmojis.map(toTEmojiItem),
      [customEmojis]
    );

    const allEmojis = useMemo(
      () => [...ALL_EMOJIS, ...convertedCustomEmojis],
      [convertedCustomEmojis]
    );

    const isSearching = search.trim().length > 0;
    const isGifsTab = activeTab === 'gifs';

    const searchResults = useMemo(
      () => (isSearching && !isGifsTab ? searchEmojis(allEmojis, search) : []),
      [isSearching, isGifsTab, allEmojis, search]
    );

    const handleEmojiSelect = useCallback(
      (emoji: TEmojiItem) => {
        onEmojiSelect(emoji);
        setOpen(false);
      },
      [onEmojiSelect]
    );

    const handleSearchResultSelect = useCallback(
      (emoji: TEmojiItem) => {
        handleEmojiSelect(emoji);
        requestAnimationFrame(() => addRecent(emoji));
      },
      [handleEmojiSelect, addRecent]
    );

    const handleSearchChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
      },
      []
    );

    const handleGifSelect = useCallback(
      (gifUrl: string) => {
        onGifSelect?.(gifUrl);
        setOpen(false);
      },
      [onGifSelect]
    );

    const handleTabChange = useCallback(
      (tab: string) => {
        if (tab !== 'native' && tab !== 'custom' && tab !== 'gifs') {
          return;
        }

        setActiveTab(tab);
        setSearch('');

        if (tab === 'gifs') {
          setGifReloadKey((value) => value + 1);
        }
      },
      []
    );

    const handleOpenChange = useCallback((nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        setSearch('');
        return;
      }

      if (activeTab === 'gifs') {
        setGifReloadKey((value) => value + 1);
      }
    }, [activeTab]);

    return (
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent
          className="h-100 w-[320px] overflow-hidden border border-[#314055] bg-[#172231] p-0 text-[#d7e2f0] shadow-[0_20px_48px_rgba(2,6,23,0.45)]"
          align="start"
          sideOffset={8}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-[#314055] p-3">
              <Input
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={handleSearchChange}
                className="h-9 border-[#314055] bg-[#101926] text-[#d7e2f0] placeholder:text-[#6e819a] focus-visible:border-[#3d516b] focus-visible:ring-[#206bc4]/20"
                autoFocus
              />
            </div>

            {isSearching && !isGifsTab ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="px-3 py-2 text-xs font-medium text-[#8fa2bb]">
                  {t('searchResults', { count: searchResults.length })}
                </div>
                <div className="min-h-0 flex-1">
                  <EmojiGrid
                    emojis={searchResults}
                    onSelect={handleSearchResultSelect}
                  />
                </div>
              </div>
            ) : (
              <Tabs
                value={activeTab}
                onValueChange={handleTabChange}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="px-3 pt-2 pb-1">
                  <TabsList className="grid w-full grid-cols-3 gap-1 overflow-hidden rounded-md border border-[#314055] bg-[#1a2738] p-1">
                    <TabsTrigger
                      value="native"
                      className="h-7 w-full min-w-0 overflow-hidden rounded-sm border border-[#314055] bg-[#101926] px-1 text-[11px] leading-none text-[#8fa2bb] data-[state=active]:border-[#4677b8] data-[state=active]:bg-[#223146] data-[state=active]:text-white"
                    >
                      <span className="block w-full truncate">{t('emojiTab')}</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="custom"
                      className="h-7 w-full min-w-0 overflow-hidden rounded-sm border border-[#314055] bg-[#101926] px-1 text-[11px] leading-none text-[#8fa2bb] data-[state=active]:border-[#4677b8] data-[state=active]:bg-[#223146] data-[state=active]:text-white"
                    >
                      <span className="block w-full truncate">{t('customTab')}</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="gifs"
                      className="h-7 w-full min-w-0 overflow-hidden rounded-sm border border-[#314055] bg-[#101926] px-1 text-[11px] leading-none text-[#8fa2bb] data-[state=active]:border-[#4677b8] data-[state=active]:bg-[#223146] data-[state=active]:text-white"
                    >
                      <span className="block w-full truncate">{t('gifsTab')}</span>
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="native" className="flex-1 mt-0 min-h-0">
                  <NativeEmojiTab onEmojiSelect={handleEmojiSelect} />
                </TabsContent>
                <TabsContent value="custom" className="flex-1 mt-0 min-h-0">
                  <CustomEmojiTab
                    customEmojis={customEmojis}
                    onEmojiSelect={handleEmojiSelect}
                  />
                </TabsContent>
                <TabsContent
                  value="gifs"
                  className="mt-0 flex-1 min-h-0 overflow-hidden"
                >
                  <GifsTab
                    open={open}
                    active={isGifsTab}
                    search={search}
                    reloadKey={gifReloadKey}
                    onSelect={handleGifSelect}
                  />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }
);

EmojiPicker.displayName = 'EmojiPicker';

export { EmojiPicker };


