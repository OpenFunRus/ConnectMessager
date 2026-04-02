import 'ws';

declare module 'ws' {
  interface WebSocket {
    userId?: number;
    token: string;
  }
}

type TCommandMap = {
  [pluginId: string]: {
    [commandName: string]: TCommand;
  };
};

type TCommand = (...args: unknown[]) => Promise<unknown> | unknown;

declare global {
  interface Window {
    __plugins?: {
      commands: TCommandMap;
    };
  }
  // eslint-disable-next-line no-var
  var disableRateLimiting: boolean | undefined;
}

declare module 'bun' {
  interface Env {
    // CONNECTMESSAGER_ prefixed environment variables
    CONNECTMESSAGER_PORT?: string;
    CONNECTMESSAGER_DEBUG?: string;
    CONNECTMESSAGER_WEBRTC_PORT?: string;
    CONNECTMESSAGER_WEBRTC_ANNOUNCED_ADDRESS?: string;
    CONNECTMESSAGER_WEBRTC_MAX_BITRATE?: string;
    CONNECTMESSAGER_DATA_PATH?: string;
  }
}

declare module 'node:fs/promises' {
  export function exists(path: import('node:fs').PathLike): Promise<boolean>;
}

declare module 'fs/promises' {
  export function exists(path: import('node:fs').PathLike): Promise<boolean>;
}


