module.exports = function(input, callback) {
    callback(null, require('coffee-script').compile(input));
};