import { cn } from '@/lib/utils';
import { FileCategory, getFileCategory } from '@connectmessager/shared';
import { Button } from '@connectmessager/ui';
import { filesize } from 'filesize';
import {
  File,
  FileImage,
  FileMusic,
  FileText,
  FileVideo,
  Trash
} from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';

type TFileIconProps = {
  extension: string;
};

const categoryMap: Record<FileCategory, React.ElementType> = {
  [FileCategory.AUDIO]: FileMusic,
  [FileCategory.IMAGE]: FileImage,
  [FileCategory.VIDEO]: FileVideo,
  [FileCategory.DOCUMENT]: FileText,
  [FileCategory.OTHER]: File
};

const FileIcon = memo(({ extension }: TFileIconProps) => {
  const category = useMemo(() => getFileCategory(extension), [extension]);
  const className = 'h-5 w-5 text-muted-foreground';

  const Icon = categoryMap[category] || File;

  return <Icon className={className} />;
});

type TFileCardProps = {
  name: string;
  size: number;
  extension: string;
  href?: string;
  onRemove?: () => void;
};

const FileCard = ({
  name,
  size,
  extension,
  href,
  onRemove
}: TFileCardProps) => {
  const onRemoveClick = useCallback(
    (e: React.MouseEvent) => {
      if (onRemove) {
        e.preventDefault();
        onRemove();
      }
    },
    [onRemove]
  );

  return (
    <a
      className="flex h-full min-w-0 w-full items-center gap-3 rounded-xl border border-[#314055] bg-[#101926]/96 p-2.5 text-[#d7e2f0] select-none transition-all duration-200 hover:border-[#3d516b] hover:bg-[#162334] hover:shadow-[0_14px_32px_rgba(2,6,23,0.35)]"
      href={href}
      target="_blank"
    >
      <div className="flex shrink-0 items-center justify-center rounded-lg border border-[#2b3a4f] bg-[#172231] p-2 transition-colors duration-200">
        <FileIcon extension={extension} />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <span
          className={cn(
            'truncate text-sm font-medium text-[#e6edf7] transition-colors duration-200'
          )}
        >
          {name}
        </span>
        <span className="text-xs text-[#8fa2bb]">{filesize(size)}</span>
      </div>
      {onRemove && (
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0 rounded-lg border border-transparent !bg-transparent !text-[#8fa2bb] shadow-none transition-all duration-200 hover:!border-[#3d516b] hover:!bg-[#1b2940] hover:!text-white focus-visible:!border-[#4677b8] focus-visible:!bg-[#1b2940] focus-visible:!text-white focus-visible:!ring-[#4677b8]/25 data-[state=open]:!border-[#4677b8] data-[state=open]:!bg-[#223146] data-[state=open]:!text-white"
          onClick={onRemoveClick}
        >
          <Trash className="h-4 w-4" />
        </Button>
      )}
    </a>
  );
};

export { FileCard };


