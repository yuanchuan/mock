const fs = require('fs-extra');

class Cache {
  constructor(dataFile) {
    this.timer = null;;
    this.dataFile = dataFile;
    this.data = {};
    this.oldData;

    process.on('SIGINT', () => {
      if (this.timer) {
        fs.writeJsonSync(this.dataFile, this.data);
        clearTimeout(this.timer);
      }
      process.exit();
    });
  }

  sync(req, res) {
    if (this.dataFile) {
      let content = res.text || res.body;
      let key = req.method.toUpperCase() + '|' + req.url;
      if (this.data[key]?.data === content) {
        return false;
      }
      this.data[key] = {
        data: content,
        headers: res.headers
      };
      clearTimeout(this.timer);
      this.timer = null;
      this.timer = setTimeout(() => {
        fs.writeJson(this.dataFile, this.data);
      }, 5000);
    }
  }
}

module.exports = Cache;
