import { getFileUrl } from '@/helpers/get-file-url';
import { cn } from '@/lib/utils';
import type { TFile } from '@connectmessager/shared';
import { Button, buttonVariants } from '@connectmessager/ui';
import { Upload } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TImagePickerProps = {
  onImageClick: () => Promise<void>;
  onRemoveImageClick?: () => Promise<void>;
  image: TFile | null;
  className?: string;
};

const ImagePicker = memo(
  ({
    onImageClick,
    onRemoveImageClick,
    image,
    className
  }: TImagePickerProps) => {
    const { t } = useTranslation('common');

    return (
      <>
        <div className="w-full space-y-2">
          <div
            className={cn(
              'group relative aspect-[10/3] w-full max-w-[20rem] cursor-pointer overflow-hidden rounded-sm border border-[#314055] bg-[#0f1722]',
              className
            )}
            onClick={onImageClick}
          >
            {image ? (
              <img
                src={getFileUrl(image)}
                alt={t('imageAlt')}
                className={cn(
                  'h-full w-full object-cover transition-opacity group-hover:opacity-70',
                  className
                )}
              />
            ) : (
              <div
                className={cn(
                  buttonVariants({ variant: 'outline' }),
                  'h-full w-full cursor-pointer rounded-none border-0 bg-[linear-gradient(135deg,#1a2838_0%,#22344a_100%)] text-[#8fa2bb] transition-opacity group-hover:opacity-70',
                  className
                )}
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
              <div className="rounded-sm border border-[#4a6280] bg-[#0b1220]/70 p-3 backdrop-blur-sm">
                <Upload className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>
        {image && (
          <div>
            <Button size="sm" variant="outline" onClick={onRemoveImageClick}>
              {t('removeImageBtn')}
            </Button>
          </div>
        )}
      </>
    );
  }
);

export { ImagePicker };


