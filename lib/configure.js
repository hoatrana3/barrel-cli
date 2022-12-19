const fs = require('fs')

class Configure {
  start ({ watching }) {
    this.watching = watching
    this.cwd = process.cwd()
    this.env = process.env.ENV
    this.barrelConfigPath = `${this.cwd}/barrel.config.js`
    this.packagePath = `${this.cwd}/package.json`
    this.layouts = `${this.cwd}/src/layout`
    this.templates = `${this.cwd}/src/templates`
    this.customerTemplates = `${this.cwd}/src/templates/customers`
    this.scripts = `${this.cwd}/src/assets/js`
    this.defaults = Object.assign(
      {},
      {
        publicPath: '/dev',
        port: 3000,
        local: 'localhost',
        dist: `${this.cwd}/dist`,
        hmr: true,
        domain: false
      }
    )

    this.checkShopify()
    this.mergeInDefaults()
    this.getWebpackConfig()
    this.getPackageJson()
    this.fillInBlanks()
  }

  mergeInDefaults (userConfig = {}) {
    Object.keys(this.defaults).forEach(k => {
      if (typeof userConfig[k] !== 'undefined') {
        this[k] = userConfig[k]
      } else {
        this[k] = this.defaults[k]
      }
    })
  }

  getWebpackConfig () {
    this.webpack = require(this.barrelConfigPath)['webpack.extend']
  }

  getPackageJson () {
    this.package = require(this.packagePath)
  }

  checkShopify () {
    if (!fs.existsSync('./src/config/settings_data.json')) {
      this.shopify = false
    } else {
      this.shopify = true
    }
  }

  fillInBlanks () {
    this.checkPort()
    this.checkLocal()
    this.checkPublicPath()
    this.checkDist()
  }

  checkPort () {
    this.port = 9393
  }

  checkLocal () {
    this.local = '127.0.0.1'
  }

  checkPublicPath () {
    this.publicPath = `https://${this.local}:${this.port}/`
  }

  checkDist () {
    if (this.shopify) {
      this.dist = this.defaults.dist
    } else {
      this.dist = false
    }
  }

  setup (props) {
    this.start(props)
  }

  get (prop) {
    return this[prop]
  }

  set (prop, val) {
    this[prop] = val
  }
}

module.exports = new Configure()
