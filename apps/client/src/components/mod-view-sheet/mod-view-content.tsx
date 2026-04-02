import { Button } from '@connectmessager/ui';
import { ArrowLeft } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ModViewScreen, useModViewContext } from './context';
import { Details } from './details';
import { Header } from './header';
import { ServerActivity } from './server-activity';
import { Files } from './server-activity/files';
import { Links } from './server-activity/links';
import { Messages } from './server-activity/messages';

type TWrapperProps = {
  children: React.ReactNode;
};

const Wrapper = memo(({ children }: TWrapperProps) => {
  const { t } = useTranslation('settings');
  const { setView } = useModViewContext();

  const onBackClick = useCallback(() => {
    setView(undefined);
  }, [setView]);

  return (
    <div className="w-full space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBackClick}
          className="h-auto border border-[#314055] bg-[#101926] p-1.5 text-xs text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white"
      >
        <ArrowLeft className="h-3 w-3 mr-1" />
        {t('goBack')}
      </Button>
      {children}
    </div>
  );
});

type TRoutingProps = {
  view: ModViewScreen | undefined;
};

const Routing = memo(({ view }: TRoutingProps) => {
  if (view === ModViewScreen.FILES) {
    return (
      <Wrapper>
        <Files />
      </Wrapper>
    );
  }

  if (view === ModViewScreen.MESSAGES) {
    return (
      <Wrapper>
        <Messages />
      </Wrapper>
    );
  }

  if (view === ModViewScreen.LINKS) {
    return (
      <Wrapper>
        <Links />
      </Wrapper>
    );
  }

  return (
    <>
      <ServerActivity />
      <Details />
    </>
  );
});

const ModViewContent = memo(() => {
  const { view } = useModViewContext();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-[#243140] bg-[#182433]/95 p-4 backdrop-blur-sm">
        <Header />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <Routing view={view} />
      </div>
    </div>
  );
});

export { ModViewContent };


