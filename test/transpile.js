var assert = require('assert'),
    expect = require('expect.js'),
    rigger = require('..'),
    fs = require('fs'),
    path = require('path'),
    squirrel = require('squirrel'),
    _ = require('underscore'),
    inputPath = path.resolve(__dirname, 'input-transpile'),
    outputPath = path.resolve(__dirname, 'output'),
    outputFile,
    extname,
    riggerOpts = {
        encoding: 'utf8',
        stylus: {
            plugins: [ require('nib') ]
        }
    },
    targetContext = {
        coffee: '.js',
        styl: '.css'
    };
    
// override squirrel default functional allowing installation
squirrel.defaults.allowInstall = true;

// run tests for each of the input files
fs.readdir(inputPath, function(err, files) {
    describe('local rigging (via plugins) tests', function() {
        after(function(done) {
            // squirrel.rm(['coffee-script', 'jade', 'stylus'], done);
        });
        
        // create a test for each of the input files
        (files || []).forEach(function(file) {
            it('should be able to rig: ' + file, function(done) {
                fs.stat(path.join(inputPath, file), function(err, stats) {
                    var targetExt = targetContext[path.extname(file).slice(1)] || path.extname(file);
                    
                    // skip directories
                    if (stats.isDirectory()) {
                        done();
                        return;
                    }
                    
                    // extract the file extension
                    extname = path.extname(file);
                    
                    // initialise the output filename
                    outputFile = path.join(outputPath, path.basename(file, extname)) + targetExt;
                    
                    // read the output file
                    fs.readFile(outputFile, 'utf8', function(refErr, reference) {
                        assert.ifError(refErr);

                        rigger(
                            path.join(inputPath, file), 
                            _.extend({}, riggerOpts, { targetType: path.extname(outputFile) }),
                            function(parseErr, parsed) {
                                assert.ifError(parseErr);
                                assert.equal(parsed, reference);
                                done(parseErr);
                            }
                        );
                    });
                });
            });
        });
    });
});