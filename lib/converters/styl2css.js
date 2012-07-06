var squirrel = require('squirrel');

module.exports = function(input, callback) {
    var opts = this.opts;
    
    squirrel('stylus', function(err, stylus) {
        if (err) {
            callback(new Error('Stylus not available'));
        }
        else {
            // render stylus (pass through opts)
            stylus.render(input, opts.stylus || {}, callback);
        }
    });
};