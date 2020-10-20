C Program Build Server
======================
WebSocket server for scheduling automated C program builds.

Requirements
------------
 * [NodeJS](https://nodejs.org/) 12+

Installation
------------
`npm install --production`

Usage
-----
`npm run start`

```
usage: index.js [-h] [-v] [-a ARTIFACTS_PATH] [-b BUILD_INTERVAL] [-p PORT]

C program build server

optional arguments:
  -h, --help            show this help message and exit
  -v, --version         show program's version number and exit
  -a ARTIFACTS_PATH, --artifacts-path ARTIFACTS_PATH
                        Path to directory for storing program build artifacts (default: ./artifacts)
  -b BUILD_INTERVAL, --build-interval BUILD_INTERVAL
                        Seconds delay between automatic rebuild of registered programs (default: 10)
  -p PORT, --port PORT  Network port for the WebSocket server (default: 8090)
```

Permissions
-----------
The system user that runs the build server must have read and write permissions
in the following directories:
- `./`
- `ARTIFACTS_PATH/`
- `./tests` (if you run them)
- the location of any registered program

Storage
-------
The state of registered programs is stored in the file: `./registry.json`

Development & Tests
-------------------
1. Install development dependencies: `npm install`
2. Run tests: `npm test`
