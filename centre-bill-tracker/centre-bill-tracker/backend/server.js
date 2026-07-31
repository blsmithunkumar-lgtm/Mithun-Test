const app = require('./src/app');
const env = require('./src/config/env');
const { testConnection } = require('./src/config/db');

async function start() {
  try {
    await testConnection();
    app.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`[SERVER] Centre Bill Tracker API listening on port ${env.port} (${env.nodeEnv})`);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[FATAL] Could not start server:', err.message);
    process.exit(1);
  }
}

start();
