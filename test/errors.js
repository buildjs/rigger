var assert = require('assert'),
    rigger = require('..'),
    fs = require('fs'),
    path = require('path'),
    inputPath = path.resolve(__dirname, 'input-errors'),
    targetContext = {
        coffee: '.js',
        styl: '.css'
    };

// run tests for each of the input files
fs.readdir(inputPath, function(err, files) {
    describe('rigger error handling tests', function() {
        
        // create a test for each of the input files
        (files || []).forEach(function(file) {
            it('should produce an error when rigging: ' + file, function(done) {
                var targetExt = targetContext[path.extname(file).slice(1)] || path.extname(file),
                    targetPath = path.join(inputPath, file);
                
                fs.stat(targetPath, function(err, stats) {
                    if ((! err) && stats.isFile()) {
                        rigger(targetPath, { targetType: targetExt }, function(parseErr, parsed) {
                            assert(parseErr, 'Did not receive an error when one was expected');
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