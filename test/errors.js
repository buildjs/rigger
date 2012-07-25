var expect = require('expect.js'),
    rigger = require('..'),
    fs = require('fs'),
    path = require('path'),
    inputPath = path.resolve(__dirname, 'input-errors');

// run tests for each of the input files
fs.readdir(inputPath, function(err, files) {
    describe('rigger error handling tests', function() {
        
        // create a test for each of the input files
        (files || []).forEach(function(file) {
            it('should produce an error when rigging: ' + file, function(done) {
                var targetPath = path.join(inputPath, file);
                
                fs.stat(targetPath, function(err, stats) {
                    if ((! err) && stats.isFile()) {
                        rigger(path.join(inputPath, file), function(parseErr, parsed) {
                            expect(parseErr).to.be.ok();
                            done();
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