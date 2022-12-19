function isHotUpdateFile (path) {
  if (~path.indexOf('src/assets/css')) {
    return true
  }

  if (~path.indexOf('src/assets/js')) {
    return true
  }

  if (~path.indexOf('src/config/lib')) {
    return true
  }

  if (!~path.indexOf('src')) {
    return true
  }

  if (!~path.indexOf('src/assets') && /.([.](css|js(?!on)|vue)$)/.test(path)) {
    return true
  }
}

module.exports = {
  isHotUpdateFile
}
