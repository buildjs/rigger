var rigger = require('../lib/rigger'),
    fs = require('fs'),
    path = require('path');

describe('local rigging tests', function() {
    it('should be able to parse a simple file', function(done) {
        rigger.readFile(path.resolve(__dirname, 'samples/local.js'), 'utf8', function(err, data) {
            console.log(data);
            done(err);
        });
    });
});