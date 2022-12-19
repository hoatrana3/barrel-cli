const fs = require('fs')
const path = require('path')

const WDM = require('webpack-dev-middleware')
const WHM = require('webpack-hot-middleware')

const config = require('./configure')
const Webpack = require('./webpack')
const Mutator = require('./mutator')
const express = require('express')
const https = require('https')
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages')
const chalk = require('chalk')

const fakeCert = fs.readFileSync(path.join(__dirname, './ssl/server.pem'))
const sslOptions = {
  key: fakeCert,
  cert: fakeCert
}

class Watcher {
  constructor () {
    this.app = express()
    this.server = https.createServer(sslOptions, this.app)
    this.compiler = Webpack(true).compiler
    this.webpackHotMiddleware = WHM(this.compiler, {
      log: false
    })

    this.app.use(
      WDM(this.compiler, {
        logLevel: 'silent',
        reload: true,
        publicPath: config.get('publicPath'),
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      })
    )

    if (config.get('hmr')) {
      this.app.use(this.webpackHotMiddleware)
    }

    this.compiler.hooks.invalid.tap('invalid', () => {
      console.log('Compiling...')
    })

    this.compiler.hooks.done.tap('done', stats => {
      // webpack messages massaging and logging gracioulsy provided by create-react-app.
      const messages = formatWebpackMessages(stats.toJson({}, true))

      // If errors exist, only show errors.
      if (messages.errors.length) {
        console.log(chalk.red('Failed to compile.\n'))
        console.log(messages.errors.join('\n\n'))
        return
      }

      // Show warnings if no errors were found.
      if (messages.warnings.length) {
        console.log(chalk.yellow('Compiled with warnings.\n'))
        console.log(messages.warnings.join('\n\n'))

        // Teach some ESLint tricks.
        console.log(
          '\nSearch for the ' +
            chalk.underline(chalk.yellow('keywords')) +
            ' to learn more about each warning.'
        )
        console.log(
          'To ignore, add ' +
            chalk.cyan('// eslint-disable-next-line') +
            ' to the line before.\n'
        )
      }

      if (!messages.errors.length && !messages.warnings.length) {
        console.log(chalk.green('Compiled successfully!'))
      }
    })

    this.copy()
    this.serve()
  }

  printInstructions () {
    console.log()
    console.log('Assets are being served from:')
    console.log(
      `  ${chalk.bold('Local:')}            ${config.get('publicPath')}`
    )
    console.log()
  }

  serve () {
    this.server.listen(config.get('port'), config.get('local'), err => {
      if (err) {
        return console.log(err)
      }
      this.printInstructions()
    })
  }

  copy () {
    if (config.get('shopify')) {
      return Mutator(true)
    }

    return Promise.resolve()
  }
}

module.exports = () => {
  return new Watcher()
}
