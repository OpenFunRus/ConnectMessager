import { RelativeTime } from '@/components/relative-time';
import { getFileUrl } from '@/helpers/get-file-url';
import type { TMessageJumpToTarget } from '@/types';
import { Button } from '@connectmessager/ui';
import { FileText, Hash } from 'lucide-react';
import { memo, useCallback } from 'react';
import type { TSearchResultFile } from './types';

type TSearchResultFileCardProps = {
  result: TSearchResultFile;
  onJump: (target: TMessageJumpToTarget) => void;
};

const SearchResultFileCard = memo(
  ({ result, onJump }: TSearchResultFileCardProps) => {
    const handleJump = useCallback(() => {
      onJump({
        channelId: result.channelId,
        messageId: result.messageId,
        isDm: result.channelIsDm
      });
    }, [onJump, result.channelId, result.messageId, result.channelIsDm]);

    return (
      <div className="overflow-hidden rounded-xl border border-[#314055] bg-[#172231] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="h-4 w-4 text-[#8fa2bb]" />
          <a
            href={getFileUrl(result.file)}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 flex-1 truncate text-sm font-medium text-white hover:underline"
          >
            {result.file.originalName}
          </a>
          <span className="ml-auto shrink-0 rounded-md border border-[#314055] bg-[#101926] px-2 py-0.5 text-[11px] text-[#8fa2bb]">
            {result.file.extension.toUpperCase()}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#8fa2bb]">
          <span className="inline-flex min-w-0 max-w-full items-center gap-1">
            <Hash className="h-3 w-3" />
            <span className="truncate wrap-anywhere">{result.channelName}</span>
          </span>
          <RelativeTime date={new Date(result.messageCreatedAt)}>
            {(relativeTime) => <span>{relativeTime}</span>}
          </RelativeTime>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-2 border border-[#314055] bg-[#101926] text-[#d7e2f0] hover:border-[#3d516b] hover:bg-[#223146] hover:text-white"
          onClick={handleJump}
        >
          Jump to message
        </Button>
      </div>
    );
  }
);

export { SearchResultFileCard };


