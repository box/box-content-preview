const { execSync } = require('child_process');

function ApiRsyncPlugin(source, destination) {
    this.source = source;
    this.destination = destination;
}

/* eslint-disable no-console */
ApiRsyncPlugin.prototype.apply = function rsync(compiler) {
    compiler.hooks.done.tap('ApiRsyncPlugin', () => {
        console.log('');
        console.log(`🔄 🔄 🔄  Rsync starting for ${this.source} 🔄 🔄 🔄`);
        execSync(
            `rsync -avz -e "ssh -p 8022 -o ConnectTimeout=3 ${process.env.DEVPOD_RSYNC_OPTIONS}" ${this.source} ${this.destination}`,
            {
                stdio: [0, 1, 2],
            },
        );
    });
};

module.exports = ApiRsyncPlugin;
