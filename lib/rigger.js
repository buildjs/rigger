var async = require('async'),
    debug = require('debug')('rigger'),
    getit = require('getit'),
    Stream = require('stream').Stream,
    fs = require('fs'),
    path = require('path'),
    util = require('util'),
    
    // define some reusable regexes,
    reLeadingDot = /^\./,
    reIncludeDoubleSlash = /^\s*(?:\/\/\=\s*)(.*)$/,
    reIncludeSlashStar = /^\s*(?:\/\*\=\s*)(.*)\s*\*\/$/,
    reIncludeHash = /^\s*(?:\#\=\s*)(.*)$/,
    
    // include patterns as used in interleave
    includeRegexes = {
        js:     [ reIncludeDoubleSlash, reIncludeSlashStar ],
        coffee: [ reIncludeHash ],
        css:    [ reIncludeSlashStar ]
    };
    
function Rigger(opts) {
    // ensure we have options
    opts = opts || {};
    
    // initialise the default file format
    this.filetype = (opts.filetype || 'js').replace(reLeadingDot, '');
    
    // initialise the encoding (default to utf8)
    this.encoding = opts.encoding || 'utf8';
    
    // initiliase the include pattern
    this.regexes = opts.regexes || includeRegexes[this.filetype] || includeRegexes.js;

    // initialise the stream as writable
    this.writable = true;
}

util.inherits(Rigger, Stream);

Rigger.prototype.end = function() {
    this.emit('end');
};

Rigger.prototype.write = function(data) {
    var changed = false,
        rigger = this, 
        ii, regexes = this.regexes;
        
    // process each of the lines
    async.map(
        data.toString(this.encoding).split(/\n/),
        
        function(line, itemCallback) {
            // iterate through the regexes and see if this line is a match
            for (ii = regexes.length; ii--; ) {
                // if we have a match, then process the result
                if (regexes[ii].test(line)) {
                    debug('found include: ' + RegExp.$1);
                }
            }
            
            itemCallback(null, line);
        },
        
        function(err, result) {
            // if we processed everything successfully, emit the data
            if (! err) {
                // emit a buffer for the parsed lines
                rigger.emit('data', changed ? new Buffer(result.join('\n')) : data);
            }
            
            rigger.emit('resume');
        }
    );
    
    // pause the stream
    this.emit('pause');
};

function _rigger(opts) {
    return new Rigger(opts);
}

_rigger.readFile = function(targetFile, encoding, callback) {
    var input, parser, output = [];
    
    // remap arguments if required
    if (typeof encoding == 'function') {
        callback = encoding;
        encoding = undefined;
    }
    
    // create the input stream
    input = fs.createReadStream(targetFile, { encoding: encoding || 'utf8' });
    
    // create the parser
    parser = new Rigger({ filetype: path.extname(targetFile), encoding: encoding });

    // pipe the input to the parser
    input.pipe(parser)
        .on('data', function(data) {
            output[output.length] = data.toString(encoding || 'utf8');
        })
    
        // on error, trigger the callback
        .on('error', callback)
        
        // on end emit the data
        .on('end', function() {
            if (callback) {
                callback(null, output.join('\n'));
            }
        });
};

module.exports = _rigger;