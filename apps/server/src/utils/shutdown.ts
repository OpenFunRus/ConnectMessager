import type http from 'http';
import { pluginManager } from '../plugins';
import { shutdownVoiceRuntimes } from '../runtimes';
import { logger } from '../logger';
import { shutdownMediasoup } from './mediasoup';
import { closeWsServer } from './wss';

type TShutdownDeps = {
  httpServer: http.Server;
};

const registerGracefulShutdown = ({ httpServer }: TShutdownDeps) => {
  let shuttingDown = false;

  const shutdown = async (reason: string) => {
    if (shuttingDown) return;

    shuttingDown = true;
    logger.info('Shutting down Connect Messager (%s)...', reason);

    const forceExitTimer = setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing process exit');
      process.exit(1);
    }, 8_000);

    forceExitTimer.unref();

    try {
      await closeWsServer();
      await pluginManager.unloadPlugins();
      await shutdownVoiceRuntimes();
      await shutdownMediasoup();

      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      clearTimeout(forceExitTimer);
      process.exit(0);
    } catch (error) {
      logger.error('Failed to shut down cleanly: %o', error);
      clearTimeout(forceExitTimer);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGBREAK', () => void shutdown('SIGBREAK'));
  process.on('SIGHUP', () => void shutdown('SIGHUP'));
};

export { registerGracefulShutdown };

