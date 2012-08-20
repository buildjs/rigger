var assert = require('assert'),
    rigger = require('..'),
    fs = require('fs'),
    path = require('path'),
    inputPath = path.resolve(__dirname, 'input'),
    outputPath = path.resolve(__dirname, 'output');

// run tests for each of the input files
fs.readdir(inputPath, function(err, files) {
    describe('local rigging tests', function() {
        
        // create a test for each of the input files
        (files || []).forEach(function(file) {
            it('should be able to rig: ' + file, function(done) {
                var targetPath = path.join(inputPath, file);
                
                fs.stat(targetPath, function(err, stats) {
                    if ((! err) && stats.isFile()) {
                        // read the output file
                        fs.readFile(path.join(outputPath, file), 'utf8', function(refErr, reference) {
                            assert.ifError(refErr, 'No output file found for test');

                            rigger(path.join(inputPath, file), function(parseErr, parsed) {
                                if (! parseErr) {
                                    assert.equal(parsed, reference);
                                }

                                done(parseErr);
                            });
                        });
                    }
                    else {
                        done(err);
                    }
                });
            });
        });
    });
});