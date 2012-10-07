var converters = require('./');

module.exports = function(input, opts, callback) {
    converters
        .require('coffee-script')
        .on('error', callback)
        .on('ok', function(coffee) {
            callback(null, coffee.compile(input, opts));
        });
};