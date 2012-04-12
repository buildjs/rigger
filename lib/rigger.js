var async = require('async'),
    debug = require('debug')('rigger'),
    getit = require('getit'),
    Stream = require('stream').Stream,
    fs = require('fs'),
    path = require('path'),
    util = require('util'),
    
    // define some reusable regexes,
    reLineBreak = /\n/,
    reLeadingDot = /^\./,
    reTrailingDot = /\.$/,
    reMultiTarget = /^(.*?)\[(.*)\]$/,
    
    reIncludeDoubleSlash = /^\s*\/\/\=(\w*)\s*(.*)$/,
    reIncludeSlashStar = /^\s*\/\*\=(\w*)\s*(.*?)\s*\*\/$/,
    reIncludeHash = /^\s*\#\=(\w*)\s*(.*)$/,
    reQuotesLeadAndTrail = /(^[\"\']|[\"\']$)/g,
    
    // include patterns as used in interleave
    includeRegexes = {
        // core supported file types
        js:     [ reIncludeDoubleSlash, reIncludeSlashStar ],
        css:    [ reIncludeSlashStar ],

        // other cool languages that I use every now and again
        coffee: [ reIncludeHash ],
        roy:    [ reIncludeDoubleSlash ],
        styl:   [ reIncludeDoubleSlash ]
    },

    // define converters that can convert from one file type to another
    converters = {};
    
function Rigger(opts) {
    // save a reference to the options
    // these options will be passed through to getit calls
    this.opts = opts || {};
    
    // initialise the default file format
    this.filetype = (this.opts.filetype || 'js').replace(reLeadingDot, '');
    
    // initialise the encoding (default to utf8)
    this.encoding = this.opts.encoding || 'utf8';
    
    // initialise the cwd (this is also used by getit)
    this.cwd = this.opts.cwd || process.cwd();
    
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

Rigger.prototype.convert = function(conversion, input, callback) {
    // get the converter
    var converter = converters[conversion];
    
    // if we don't have a converter, then return an error
    if (! converter) {
        callback(new Error('Unable to run converter: ' + conversion));
        return;
    }

    // start the conversion process
    async.waterfall([
        function(itemCb) {
            itemCb(null, input);
        }
    ].concat(converter), callback);
};

Rigger.prototype.get = function(getTarget, callback) {
    var multiMatch = reMultiTarget.exec(getTarget),
        targets = [getTarget];
    
    // check whether we have more than one target
    if (multiMatch) {
        targets = multiMatch[2].split(/\,\s*/).map(function(item) {
            return multiMatch[1] + item;
        });
    }
    
    async.map(
        targets,
        this._getSingle.bind(this),
        function(err, results) {
            callback(err, (results || []).join('\n'));
        }
    );
};

Rigger.prototype.include = function(target, line, callback) {
    var targetExt = path.extname(target),
        rigger = this, conversion;
        
    // otherwise, check whether a conversion is required
    if (targetExt && targetExt.slice(1).toLowerCase() !== this.filetype.toLowerCase()) {
        conversion = (targetExt.slice(1) + '2' + this.filetype).toLowerCase();
    }
    
    // if we have cached results, then return those
    if (this.memcache[target]) return callback(null, this.memcache[target]);
    
    // get the file
    debug('including: ' + target);
    this.get(target, function(err, data) {
        callback(err, data, conversion);
    });
};

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
    var rigger = this;
    
    // if we have active includes, then wait until we resume before pushing out more data
    // otherwise we risk pushing data back not in order (which would be less than ideal)
    if (this.activeIncludes) {
        this.once('resume', this.write.bind(this, data));
    }
        
    // process each of the lines
    async.map(
        data.toString(this.encoding).split(reLineBreak),
        
        this._expandIncludes.bind(this),
        
        function(err, result) {
            // if we processed everything successfully, emit the data
            if (! err) {
                // emit a buffer for the parsed lines
                rigger.emit('data', new Buffer(result.join('\n')));
                    
                // resume processing the stream
                rigger.emit('resume');
            }
            else {
                rigger.emit('error', err);
            }
        }
    );
    
    // pause the stream
    this.emit('pause');
};

Rigger.prototype._expandIncludes = function(line, callback) {
    var rigger = this, 
        ii, regexes = this.regexes,
        action, target,
        conversion = '', cacheResults;
    
    // iterate through the regexes and see if this line is a match
    for (ii = regexes.length; ii--; ) {
        // if we have a match, then process the result
        if (regexes[ii].test(line)) {
            action = RegExp.$1 || 'include';
            target = RegExp.$2.replace(reTrailingDot, '').replace(reQuotesLeadAndTrail, '');
            
            break;
        }
    }
    
    // if we have a target, then get that content and pass that back
    if (! target) return callback(null, line);
    
    // increment the number of active includes
    this.activeIncludes += 1;

    // run the specified action
    this[action].call(this, target, line, function(err, content, conversion) {
        // reduce the number of active includes
        rigger.activeIncludes -=1;
        debug('received: ' + content + ', active includes: ' + this.activeIncludes);
        
        // if we have an error, trigger the callback
        if (err) return callback(err);
        
        // parse the lines
        async.map(
            (content || '').split(reLineBreak),
            rigger._expandIncludes.bind(rigger),
            rigger._recombinate.bind(rigger, target, conversion, callback)
        );
    });
};

Rigger.prototype._getSingle = function(target, callback) {
    var rigger = this;
    
    // if the target is remote, then let getit do it's job
    if (getit.isRemote(target)) {
        // ensure the extension is provided
        if (path.extname(target) === '') {
            target += '.' + this.filetype;
        }

        // get the include
        getit(target, this.opts, callback);
    }
    // otherwise, we'll do a little more work
    else {
        var testTargets = [path.resolve(this.cwd, target)];

        // if the test target does not have an extension then add it
        // ensure the extension is provided
        if (path.extname(testTargets[0]) === '') {
            testTargets[1] = testTargets[0] + '.' + rigger.filetype;
        }

        // find the first of the targets that actually exists
        async.detect(testTargets, path.exists, function(realTarget) {
            // determine the type of the real target
            fs.stat(realTarget, function(err, stats) {
                if (err) {
                    callback(err);
                    return;
                }

                // if it is a file, then read the file and pass the content back
                if (stats.isFile()) {
                    fs.readFile(realTarget, rigger.encoding, callback);
                }
                // otherwise, if the target is a directory, read the files and then read the 
                // valid file types from the specified directory
                else if (stats.isDirectory()) {
                    fs.readdir(realTarget, function(dirErr, files) {
                        // get only the files that match the current file type
                        files = (files || []).filter(function(file) {
                            return path.extname(file).slice(1).toLowerCase() === rigger.filetype;
                        })
                        // explicitlly sort the files
                        .sort()
                        // turn into the fully resolved path
                        .map(function(file) {
                            return path.join(realTarget, file);
                        });

                        // read each of the file contents
                        async.map(files, fs.readFile, function(readErr, results) {
                            callback(readErr, (results || []).join('\n'));
                        });
                    });
                }
            });            
        });
    }
};

Rigger.prototype._recombinate = function(target, conversion, callback, processingError, results) {
    var content, rigger = this;
    
    if (processingError) return callback(processingError);

    // update the content
    content = results.join('\n');

    // if a conversion is required, then do that now
    if (conversion) {
        rigger.convert(conversion, content, function(convertErr, convertedContent) {
            // update the memcache
            if (! convertErr) {
                rigger.memcache[target] = convertedContent;
            }

            // trigger the item callback
            callback(convertErr, convertedContent);
        });
    }
    else {
        // update the memcache
        this.memcache[target] = content;

        // trigger the item callback
        callback(null, content);
    }
};

exports = module.exports = function(targetFile, encoding, callback) {
    var input, parser, output = [];
    
    // if we have no arguments passed to the function, then return a new rigger instance
    if (arguments.length === 0) {
        return new Rigger();
    }
    
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

// export the rigger class
exports.Rigger = Rigger;

// expose the regexes for tweaking
exports.regexes = includeRegexes;

// intialise the default converters
['coffee2js'].forEach(function(converter) {
    converters[converter] = require('./converters/' + converter);
});

// expose the converters
exports.converters = converters;