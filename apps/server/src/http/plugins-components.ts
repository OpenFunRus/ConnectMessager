import http from 'http';
import { getSettings } from '../db/queries/server';
import { pluginManager } from '../plugins';

const pluginsComponentsRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  const { enablePlugins } = await getSettings();

  if (!enablePlugins) {
    // Plugins can be intentionally disabled. Return empty list instead of 403
    // to avoid noisy browser errors in the client bootstrap flow.
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify([]));

    return;
  }

  const pluginIds = pluginManager.getPluginIdsWithComponents();

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(pluginIds));

  return res;
};

export { pluginsComponentsRouteHandler };
