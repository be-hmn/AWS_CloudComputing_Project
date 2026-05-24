import { env } from './config/env.js';
import { createApp } from './app.js';
import { authService } from './services/auth.service.js';

async function bootstrap() {
  const app = createApp();
  await authService.seedAdmin();
  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] listening on :${env.PORT} (${env.NODE_ENV})`);
  });
}

bootstrap().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('[server] failed to start', e);
  process.exit(1);
});
