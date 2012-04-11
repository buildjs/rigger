var async = require('async'),
    debug = require('debug')('rigger'),
    getit = require('getit'),
    Stream = require('stream').Stream,
    fs = require('fs'),
    path = require('path'),
    util = require('util'),
    
    // define some reusable regexes,
    reLeadingDot = /^\./,
    reTrailingDot = /\.$/,
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
    // save a reference to the options
    // these options will be passed through to getit calls
    this.opts = opts || {};
    
    // initialise the default file format
    this.filetype = (this.opts.filetype || 'js').replace(reLeadingDot, '');
    
    // initialise the encoding (default to utf8)
    this.encoding = this.opts.encoding || 'utf8';
    
    // initiliase the include pattern
    this.regexes = this.opts.regexes || includeRegexes[this.filetype] || includeRegexes.js;

    // initialise the stream as writable
    this.writable = true;
    
    // create a resolving queue to track resolving includes progress
    this.activeIncludes = 0;
    
    // create a simple memcache for serving requests for the same resource simply
    // more advanced caching can be implementing by passing cache options that
    // getit will understand
    this.memcache = {};
}

util.inherits(Rigger, Stream);

Rigger.prototype.end = function() {
    // if we have active includes, then wait
    if (this.activeIncludes) {
        this.once('resume', this.end.bind(this));
    }
    else {
        this.emit('end');
    }
};

Rigger.prototype.write = function(data) {
    var changed = false,
        rigger = this, 
        ii, regexes = this.regexes;
        
    // if we have active includes, then wait until we resume before pushing out more data
    // otherwise we risk pushing data back not in order (which would be less than ideal)
    if (this.activeIncludes) {
        this.once('resume', this.write.bind(this, data));
    }
        
    // process each of the lines
    async.map(
        data.toString(this.encoding).split(/\n/),
        
        function(line, itemCallback) {
            var getTarget = '';
            
            // iterate through the regexes and see if this line is a match
            for (ii = regexes.length; ii--; ) {
                // if we have a match, then process the result
                if (regexes[ii].test(line)) {
                    var target = RegExp.$1.replace(reTrailingDot, ''),
                        targetExt = path.extname(target);
                        
                    // if the file does not have a target extension, then specify the default file type
                    if (! targetExt) {
                        target += '.' + rigger.filetype;
                    }
                    
                    // update the get target to the specified target
                    getTarget = target;
                    
                    break;
                }
            }
            
            // if we have a getTarget, then get that content and pass that back
            if (getTarget) {
                var cacheResults = rigger.memcache[getTarget];
                
                if (cacheResults) {
                    itemCallback(null, cacheResults);
                }
                else {
                    debug('getting: ' + getTarget);

                    // increment the number of active includes
                    rigger.activeIncludes += 1;

                    // flag that we have changed the output
                    changed = true;

                    // get the include
                    getit(getTarget, rigger.opts, function(err, content) {
                        // reduce the number of active includes
                        rigger.activeIncludes -=1 ;
                        debug('received: ' + content + ', active includes: ' + rigger.activeIncludes);
                        
                        // update the memcache
                        if (! err) {
                            rigger.memcache[getTarget] = content;
                        }

                        // trigger the item callback
                        itemCallback(err, content);
                    });                    
                }
            }
            // otherwise, pass this line back unchanged
            else {
                itemCallback(null, line);
            }
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
    parser = new Rigger({
        // initialise the filetype based on the extension of the target file
        filetype: path.extname(targetFile),
        
        // pass the rigger the cwd which will be provided to getit
        cwd: path.dirname(targetFile),
        
        // initialise the encoding
        encoding: encoding
    });
    
    // pipe the input to the parser
    input.pipe(parser);
    
    // if we have a callback, then process the data and handle end and error events
    if (callback) {
        parser
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
    }

    // return the parser instance
    return parser;
};

module.exports = _rigger;