import { createServer } from 'http';
import app from './app';
import { config } from './config';

const server = createServer(app);

server.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Codeloom backend listening on port ${config.port} (env: ${config.env})`);
});
