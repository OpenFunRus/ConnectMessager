import { Toaster as Sonner, type ToasterProps } from 'sonner';

const TOASTER_CLASSNAMES: NonNullable<ToasterProps['toastOptions']>['classNames'] = {
  toast:
    '!border !border-[#314055] !bg-[#182433] !text-[#d7e2f0] shadow-[0_20px_48px_rgba(2,6,23,0.5)] backdrop-blur-sm',
  title: 'text-sm font-extrabold tracking-[0.01em]',
  description: 'text-xs font-bold',
  closeButton:
    'border border-[#314055] bg-[#101926] text-[#8fa2bb] hover:bg-[#1b2940] hover:text-white',
  success:
    '!border-[#2f7a52] !bg-[#12261f] !text-[#7ef3b8] [&_[data-title]]:!text-[#7ef3b8] [&_[data-description]]:!text-[#b7f9d7]',
  error:
    '!border-[#a9485a] !bg-[#2b1720] !text-[#ff8b9a] [&_[data-title]]:!text-[#ff8b9a] [&_[data-description]]:!text-[#ffc0ca]',
  warning:
    '!border-[#9b6b2f] !bg-[#2a2215] !text-[#ffd089] [&_[data-title]]:!text-[#ffd089] [&_[data-description]]:!text-[#ffe4bb]',
  info: '!border-[#2f7ad1] !bg-[#142638] !text-[#8fc2ff] [&_[data-title]]:!text-[#8fc2ff] [&_[data-description]]:!text-[#c5e1ff]',
  loading:
    '!border-[#3d516b] !bg-[#182433] !text-[#d7e2f0] [&_[data-title]]:!text-[#d7e2f0] [&_[data-description]]:!text-[#9fb2c8]',
  default:
    '!border-[#314055] !bg-[#182433] !text-[#d7e2f0] [&_[data-title]]:!text-white [&_[data-description]]:!text-[#9fb2c8]',
  content: 'gap-1'
};

const Toaster = ({ toastOptions, style, ...props }: ToasterProps) => {
  return (
    <Sonner
      theme={'dark' as ToasterProps['theme']}
      className="toaster group"
      richColors
      toastOptions={{
        ...toastOptions,
        classNames: {
          ...TOASTER_CLASSNAMES,
          ...toastOptions?.classNames
        }
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          ...style
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
