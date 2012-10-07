var events = require('events');

exports.require = function() {
    var emitter = new events.EventEmitter(),
        args = Array.prototype.slice.call(arguments),
        modules;
      
    process.nextTick(function() {
        try {
            emitter.emit.apply(emitter, ['ok'].concat(args.map(require)));
        }
        catch (e) {
            emitter.emit('error', e);
        }
    });
    
    return emitter;
};