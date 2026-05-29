// Re-export the legacy Preview class as the default export of the npm package.
// Consumers can `import Preview from 'box-content-preview'` to use the imperative API.
import Preview from './lib/Preview';

export default Preview;
export { Preview };
