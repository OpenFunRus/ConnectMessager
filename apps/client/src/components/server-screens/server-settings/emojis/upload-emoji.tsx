import { Button, Card, CardContent } from '@connectmessager/ui';
import { Upload } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TUploadEmojiProps = {
  uploadEmoji: () => void;
  isUploading: boolean;
};

const UploadEmoji = memo(({ uploadEmoji, isUploading }: TUploadEmojiProps) => {
  const { t } = useTranslation('settings');

  return (
    <Card className="flex flex-1 items-center justify-center">
      <CardContent className="max-w-md py-12 text-center text-[#8fa2bb]">
        <div className="mb-4 text-4xl">:)</div>
        <h3 className="mb-2 font-medium text-white">{t('uploadEmojiTitle')}</h3>
        <p className="mb-4 text-sm">{t('uploadEmojiDesc')}</p>
        <Button
          className="border-[#4677b8] bg-[#2c5ea8] text-white hover:border-[#5b8ed1] hover:bg-[#356cbe]"
          onClick={uploadEmoji}
          disabled={isUploading}
        >
          <Upload className="mr-2 h-4 w-4" />
          {t('uploadEmojiBtn')}
        </Button>
      </CardContent>
    </Card>
  );
});

export { UploadEmoji };


