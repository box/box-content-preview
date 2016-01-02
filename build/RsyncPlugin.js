// Rsync plugin that copies things from the dist folder to our dev machine
var exec = require('child_process').exec;

function RsyncPlugin(source, destination) {
    this.source = source;
    this.destination = destination;
}

RsyncPlugin.prototype.apply = function(compiler) {
    var self = this;
    compiler.plugin('done', function() {
        console.log('');
        console.log('🔄  Rsync starting for ' + self.source);
        exec('rsync -avz --delete --exclude=".*" "' + self.source + '" "' + self.destination + '"', function(err) {
            if (err === null) {
                console.log('✅  Push SUCCEEDED for '  + self.source);
            } else {
                console.log('❌  Push FAILED with error ' + err);
                process.exit(1);
            }
        });
    });
};

module.exports = RsyncPlugin;