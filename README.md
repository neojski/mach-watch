Mach watch
==========

Small utlility library helping you automatically build your Firefox front-end code.

You have to have nodejs.

Install
-------

1. Install npm dependencies `npm install`.
2. Install [fswatch](https://github.com/emcrisostomo/fswatch).

Run
---

1. Set `MACH_COMMAND` environment variable to the path to your mach command.
2. Run: `./mach-watch /mozilla/directory/to/watch`.

You may also want to magically compile individual files with no watch:

```
  ./mach-autobuild /mozilla/directory/some/file.js
```

How does it compile
-------------------

Basically it just finds the closes parent directory in the obj directory that has a Makefile and compiles it.
