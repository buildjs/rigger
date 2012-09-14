var squirrel = require('squirrel');

module.exports = function(input, callback) {
    var rigger = this;
    
    squirrel('pegjs', function(err, PEG) {
        if (err) {
            callback(new Error('PEG.js not available'));
        }
        else {
            // create the parser
            var parser = PEG.buildParser(input),
                output = parser.toSource(),
                basename = rigger.basename || 'parser';
                
            callback(null, 'var ' + basename + ' = ' + output + ';');
        }
    });
};