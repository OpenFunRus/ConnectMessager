import { createHttpServer } from '../http';
import { createWsServer } from './wss';

const createServers = async () => {
  const httpServer = await createHttpServer();
  const wsServer = await createWsServer(httpServer);

  return { httpServer, wsServer };
};

export { createServers };
