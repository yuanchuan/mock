# mock

Serve JSON files from local data sets.

## Installation

```bash
git clone git@github.com:yuanchuan/mock
cd mock && npm link
```

Or from npm:

```bash
npm i @yuanchuan/mock -g
```

## Usage

```bash
# serve data.json
mock ./data.json

# multiple JSON files under a directory
mock path/to/dir

# custom port
mock ./ -p 3004
```

## Data format

**data.json**

```json
{
  "GET|/path/to/api": {
    "field1": 1,
    "field2": 2
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
Usage: mock [options] <data>

Options:
  -V, --version      output the version number
  -p, --port <port>  server port (default: 3456)
  -h, --help         display help for command

```
