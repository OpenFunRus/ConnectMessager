import { logDebug } from '@/helpers/browser-logger';
import {
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@connectmessager/ui';
import { Bug } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { withTranslation, type WithTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TErrorBoundaryProps = WithTranslation<'common'> & {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  pluginId: string;
  slotId: string;
};

type TState = {
  hasError: boolean;
  error: Error | null;
};

class ErrorBoundary extends Component<TErrorBoundaryProps, TState> {
  state: TState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): TState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logDebug('ErrorBoundary caught an error:', { error, errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  private reset = () => {
    this.setState({ hasError: false, error: null });
  };

  copyErrorDetails = () => {
    const { error } = this.state;
    const { t } = this.props;

    if (!error) return;

    const errorDetails = `Error: ${error.message}\nStack: ${error.stack}`;

    navigator.clipboard.writeText(errorDetails);

    toast.success(t('errorDetailsCopied'));
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      if (typeof fallback === 'function') {
        return fallback(error, this.reset);
      }

      if (fallback) {
        return fallback;
      }

      return (
        <Popover>
          <PopoverTrigger asChild>
            <IconButton
              icon={Bug}
              className="text-red-500 border-red-500"
              size="xs"
              title={this.props.t('copyErrorDetailsTitle')}
            />
          </PopoverTrigger>
          <PopoverContent className="w-96">
            <div>
              <span className="text-xs text-red-500 mb-2 block">
                {this.props.t('pluginErrorOccurred', {
                  pluginId: this.props.pluginId,
                  slotId: this.props.slotId
                })}
              </span>

              <span className="text-xs text-red-500 mb-2 block">
                {this.props.t('reportToPluginDeveloper')}
              </span>

              <details>
                <summary className="text-[10px] text-red-500">
                  {this.props.t('errorDetails')}
                </summary>

                <div>
                  <span
                    className="text-red-500 underline text-xs cursor-pointer"
                    onClick={this.copyErrorDetails}
                  >
                    {this.props.t('copyDetails')}
                  </span>

                  <pre className="text-xs text-red-500 overflow-auto max-h-48">
                    {error.message}
                    <br />
                    {error.stack}
                  </pre>
                </div>
              </details>
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    return children;
  }
}

const TranslatedErrorBoundary = withTranslation('common')(ErrorBoundary);

export { TranslatedErrorBoundary as ErrorBoundary };


