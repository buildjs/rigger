var expect = require('expect.js'),
    rigger = require('..'),
    fs = require('fs'),
    path = require('path'),
    inputPath = path.resolve(__dirname, 'input'),
    outputPath = path.resolve(__dirname, 'output');

// run tests for each of the input files
fs.readdir(inputPath, function(err, files) {
    describe('local rigging tests', function() {
        (files || []).forEach(function(file) {
            it('should be able to parse: ' + file, function(done) {
                // read the output file
                fs.readFile(path.join(outputPath, file), 'utf8', function(refErr, reference) {
                    expect(err).to.not.be.ok();

                    rigger.readFile(path.join(inputPath, file), 'utf8', function(parseErr, parsed) {
                        expect(parsed).to.equal(reference);
                    
                        done(parseErr);
                    });
                });
            });
        });
    });
});