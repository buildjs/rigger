var assert = require('assert'),
    rigger = require('..'),
    path = require('path'),
    fs = require('fs'),
    async = require('async'),
    inputPath = path.resolve(__dirname, 'input'),
    outputPath = path.resolve(__dirname, 'output'),
    testFiles = {
        'noincludes.js': ''
    };

describe('event tests', function() {
    it('it should trigger an include:file for a local file include', function(done) {
        var included = false;
        
        rigger.process('//= noincludes', { cwd: inputPath }, function(err, output) {
            assert(included);
            done(err);
        })
        .on('include:file', function() {
            included = true;
        });
    });
    
    it('should trigger an include:error for a missing file include (in tolerant mode)', function(done) {
        var caughtError = false;
        
        rigger.process('//= noincludes-missing', { cwd: inputPath, tolerant: true }, function(err, output) {
            assert(caughtError, 'include:error event not fired');
            done(err);
        })
        .on('include:error', function() {
            caughtError = true;
        });
    });

    it('it should trigger an include:dir for a local dir include', function(done) {
        var includedDir = false;
        
        rigger.process('//= input', { cwd: __dirname }, function(err, output) {
            assert(includedDir, 'include:dir event not fired');
            done();
        })
        .on('include:dir', function() {
            includedDir = true;
        });
    });
    
    it('it should trigger an include:remote for a remote include', function(done) {
        var includedRemote = false;
        
        rigger.process('//= github://DamonOehlman/snippets/qsa', function(err, output) {
            assert(includedRemote, 'include:remote not fired');
            done(err);
        })
        .on('include:remote', function() {
            includedRemote = true;
        });
    });

    it('should trigger an alias:invalid error when an alias is invalid', function(done) {
        var aliasInvalid = false;

        rigger.process('//= test!test', function(err, output) {
            assert(aliasInvalid, 'alias:invalid not fired');
            done();
        })
        .on('alias:invalid', function(alias) {
            assert.equal(alias, 'test');
            aliasInvalid = true;
        });
    });
});