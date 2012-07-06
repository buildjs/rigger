var expect = require('expect.js'),
    rigger = require('..'),
    fs = require('fs'),
    path = require('path'),
    squirrel = require('squirrel'),
    inputPath = path.resolve(__dirname, 'input-plugins'),
    outputPath = path.resolve(__dirname, 'output'),
    riggerOpts = {
        encoding: 'utf8'
    };
    
// override squirrel default functional allowing installation
squirrel.defaults.allowInstall = true;

// run tests for each of the input files
fs.readdir(inputPath, function(err, files) {
    describe('local rigging (via plugins) tests', function() {
        /*
        after(function(done) {
            squirrel.rm(['coffee-script', 'jade', 'stylus'], done);
        });
        */
        
        // create a test for each of the input files
        (files || []).forEach(function(file) {
            it('should be able to rig: ' + file, function(done) {
                fs.stat(path.join(inputPath, file), function(err, stats) {
                    // skip directories
                    if (stats.isDirectory()) {
                        done();
                        return;
                    }
                    
                    // read the output file
                    fs.readFile(path.join(outputPath, file), 'utf8', function(refErr, reference) {
                        expect(refErr).to.not.be.ok();

                        rigger(path.join(inputPath, file), riggerOpts, function(parseErr, parsed) {
                            if (! parseErr) {
                                expect(parsed).to.equal(reference);
                            }

                            done(parseErr);
                        });
                    });
                });
            });
        });
    });
});