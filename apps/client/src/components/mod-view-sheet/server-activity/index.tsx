import { Card, CardContent, CardHeader, CardTitle } from '@connectmessager/ui';
import { Activity, File, Link, MessageSquareText } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ModViewScreen, useModViewContext } from '../context';

const ServerActivity = memo(() => {
  const { t } = useTranslation('settings');
  const { files, messages, links, setView } = useModViewContext();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="px-5 py-4">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-[#a8c9ff]" />
          {t('serverActivityTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-4 py-4">
        <div
          className="flex cursor-pointer items-center justify-between rounded-sm border border-transparent px-3 py-3 transition-colors hover:border-[#314055] hover:bg-[#16212f]"
          onClick={() => setView(ModViewScreen.MESSAGES)}
        >
          <div className="flex items-center gap-3">
            <MessageSquareText className="h-4 w-4 text-[#8fa2bb]" />
            <span className="text-sm">{t('serverActivityMessages')}</span>
          </div>
          <span className="text-sm text-[#aebfd3]">
            {messages.length}
          </span>
        </div>

        <div
          className="flex cursor-pointer items-center justify-between rounded-sm border border-transparent px-3 py-3 transition-colors hover:border-[#314055] hover:bg-[#16212f]"
          onClick={() => setView(ModViewScreen.LINKS)}
        >
          <div className="flex items-center gap-3">
            <Link className="h-4 w-4 text-[#8fa2bb]" />
            <span className="text-sm">{t('serverActivityLinks')}</span>
          </div>
          <span className="text-sm text-[#aebfd3]">{links.length}</span>
        </div>

        <div
          className="flex cursor-pointer items-center justify-between rounded-sm border border-transparent px-3 py-3 transition-colors hover:border-[#314055] hover:bg-[#16212f]"
          onClick={() => setView(ModViewScreen.FILES)}
        >
          <div className="flex items-center gap-3">
            <File className="h-4 w-4 text-[#8fa2bb]" />
            <span className="text-sm">{t('serverActivityFiles')}</span>
          </div>
          <span className="text-sm text-[#aebfd3]">{files.length}</span>
        </div>
      </CardContent>
    </Card>
  );
});

export { ServerActivity };


