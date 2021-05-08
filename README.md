# mock

Serve JSON files from local data sets or use as a proxy.

## Installation

```bash
npm link
```

## Usage

```bash
# serve data.json
mock ./data.json

# serve multiple JSON files under a directory
mock some-data-directory

# use custom port
mock ./data.json --port 3004

# proxy server
mock --proxy 11.22.33.44

# proxy server from url in .env file
# read field with *API*
mock --proxy .env.production

# save data from proxy server
mock --proxy 11.22.33.44 --save ./data.json
```

## Data structure

**data.json**

```json
{
  "GET|/path/to/api": {
    "data": {
      "field1": 1,
      "field2": 2
    },
    "headers: {
      "Content-Type": "application/json"
    }
  }
}
```

**mock url**

```bash
curl http://localhost:3456/path/to/api

{
  "field1": 1,
  "field2": 2
}
```

## Help info

```
Usage: mock [options] [data]

Options:
  -V, --version        output the version number
  -p, --port <port>    server port (default: 3456)
  -P, --proxy <proxy>  start proxy server from url or .env file
  -s, --save <data>    save requests to local data file
  -h, --help           display help for command
```
