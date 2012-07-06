var squirrel = require('squirrel');

module.exports = function(input, callback) {
    squirrel('coffee-script', function(err, coffee) {
        if (err) {
            callback(new Error('Coffeescript not available'));
        }
        else {
            callback(null, coffee.compile(input));
        }
    });
};