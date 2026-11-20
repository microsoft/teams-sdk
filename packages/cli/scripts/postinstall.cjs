'use strict';

if (process.env.DO_NOT_TRACK !== '1' && process.env.TEAMS_CLI_TELEMETRY_OPTOUT !== '1') {
  const timer = setTimeout(() => process.exit(0), 850);
  timer.unref();
  import('../dist/telemetry/postinstall.js')
    .then(({ sendPostinstall }) => sendPostinstall({ version: require('../package.json').version }))
    .catch(() => undefined)
    .finally(() => clearTimeout(timer));
}
