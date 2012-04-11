# Rigger

Rigger is a build time include engine for Javascript, CSS, CoffeeScript and in general any type of text file that you wish to might want to "include" other files into.

<a href="http://travis-ci.org/#!/DamonOehlman/rigger"><img src="https://secure.travis-ci.org/DamonOehlman/rigger.png" alt="Build Status"></a>

It was created to make the process of creating Javascript libraries a more structured process, but can be used for other tasks also. 

As a developer you are encouraged to write modular, reusable code but when it comes to writing client-side applications your ability to do this effectively is generally hampered by what I call the _single-file principle_.  In most cases a good programmer rages against this and implements some kind of custom `Makefile`, [ant build](http://ant.apache.org/) or [Rakefile](http://rake.rubyforge.org/) to help with their build.

The "build" process, however, generally involves taking a number of files and concatenating them together in a sensible order.  I, however, wanted something more flexible.  To be precise, I wanted the following:

- The ability to inject a file into specific line in another file.
- The ability to reuse code from other libraries.
- The ability to do includes from the web (namely github repos)

This is the functionality that Rigger provides.  It was originally built 6 months ago as part of [Interleave](/DamonOehlman/interleave) but has it's own identity, tests and is generally better.

## Using Rigger

Unlike Interleave, Rigger is a not a command-line tool in it's own right, rather it is meant to be integrated into other JS build tools or perhaps just a simple [Jakefile](https://github.com/mde/jake).

--- 


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