# Rigger

Rigger is the parser and include engine that is used in both [Interleave](https://github.com/DamonOehlman/interleave) and [bake-js](https://github.com/DamonOehlman/bake-js).

<a href="http://travis-ci.org/#!/DamonOehlman/rigger"><img src="https://secure.travis-ci.org/DamonOehlman/rigger.png" alt="Build Status"></a>

It has been extracted from Interleave and rewritten to improve module focus and test coverage.

## Example Usage

The simplest way to use Rigger is through the `readFile` call:

```js
var rigger = require('rigger');

rigger('src/input.js', function(err, output) {
    // if something goes wrong during the reading or rigging err will be non-null
    
    // otherwise, your rigged content will be available in the output string
});
```

As described below, Rigger supports node streams, so you can also omit the callback from the `readFile` call and pipe the output to a writable stream:

```js
var fs = require('fs'),
    rigger = require('rigger');

rigger('src/input.js').pipe(fs.createWriteStream('dist/output.js));
```

If you want to do something other than read a local file, then simply create a new `Rigger` instance and pipe input into it:

```js
var fs = require('fs'),
    Rigger = require('rigger').Rigger;

fs.createReadStream('src/input.js').pipe(new Rigger());
```

If you use the above approach though, be sure to have a bit of a look through the Rigger source and also take a look at [getit](https://github.com/DamonOehlman/getit) to see what options the `Rigger` constructor accepts to change it and getit's behaviour.


## Streams FTW!

One of the simplest ways of composing process flows in node is to use streams, and while Interleave does not support a streaming interface, Rigger inherits from the node [Stream](http://nodejs.org/docs/latest/api/stream.html).

This means that you can do all kinds of things prior to rigging in your inline dependencies and all kinds of things afterwards to.

## Extra Sourcey

With a solid test suite in place, it also made it possible to add some of the extra include types that were missing from interleave.

### Directory Includes

Simply specify a directory in the include string and all files of the same type as the currently parsed file will be included.  In the tests/input directory have a look for the `local-includedir.js` and `local-includedir.css` files.

```js
//= ../includes/testdir
```

### Cherrypick Include

In some instances you may want to cherrypick particular files from a directory / remote repository.  Rather than typing multiple include lines, you can simply type one statement and use square brackets to signal to Rigger that you want to include multiple files:

```js
// ../includes/testdir[a, b]
```