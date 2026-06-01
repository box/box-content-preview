const { execSync } = require('child_process');

function RsyncPlugin(source, destination) {
    this.source = source;
    this.destination = destination;
}

/* eslint-disable no-console */
RsyncPlugin.prototype.apply = function rsync(compiler) {
    compiler.hooks.done.tap('RsyncPlugin', () => {
        console.log('');
        console.log(`🔄 🔄 🔄  Rsync starting for ${this.source} 🔄 🔄 🔄`);
        execSync(`rsync -avzq --delete --exclude=".*" "${this.source}" "${this.destination}"`, { stdio: [0, 1, 2] });
    });
};

module.exports = RsyncPlugin;
