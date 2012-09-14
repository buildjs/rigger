var debug = require('debug')('rigger-pegjs'),
    path = require('path'),
    squirrel = require('squirrel');

module.exports = function(input, opts, callback) {
    var rigger = this;
    
    squirrel('pegjs', function(err, PEG) {
        if (err) {
            callback(new Error('PEG.js not available'));
        }
        else {
            // create the parser
            var parser = PEG.buildParser(input),
                output = parser.toSource(),
                basename;
                
            // if we have a current file that we are converting, then 
            // derive the basename from that file
            if (opts.filename) {
                basename = path.basename(opts.filename, path.extname(opts.filename));
            }
            
            // fallback to the rigger basename or just parser
            basename = basename || rigger.basename || 'parser';
            
            // fire the callback
            callback(null, 'var ' + basename + ' = ' + output + ';', opts);
        }
    });
};