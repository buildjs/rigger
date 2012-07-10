var assert = require('assert'),
    rigger = require('..'),
    fs = require('fs'),
    path = require('path'),
    inputPath = path.resolve(__dirname, 'input-remote'),
    outputPath = path.resolve(__dirname, 'output');

// run tests for each of the input files
fs.readdir(inputPath, function(err, files) {
    describe('remote rigging tests', function() {
        
        // create a test for each of the input files
        (files || []).forEach(function(file) {
            it('should be able to rig: ' + file, function(done) {
                // read the output file
                fs.readFile(path.join(outputPath, file), 'utf8', function(refErr, reference) {
                    assert.ifError(refErr);

                    rigger(path.join(inputPath, file), function(parseErr, parsed) {
                        assert.ifError(parseErr);
                        assert.equal(parsed, reference);
                    
                        done(parseErr);
                    });
                });
            });
        });
    });
});