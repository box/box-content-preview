import { defineConfig } from 'cypress';
import * as plugins from './test/plugins/index.js';

export default defineConfig({
    defaultCommandTimeout: 15000,
    fileServerFolder: 'test',
    fixturesFolder: 'test/fixtures',
    screenshotsFolder: 'test/screenshots',
    video: false,
    videosFolder: 'test/videos',
    viewportHeight: 1260,
    viewportWidth: 1600,
    e2e: {
        setupNodeEvents(on, config): void {
            return plugins(on, config);
        },
        baseUrl: 'http://localhost:8000/#',
        specPattern: 'test/integration/**/*.test.{js,jsx,ts,tsx}',
        supportFile: 'test/support/index.js',
    },
});
