const glob = require('glob-all')
const config = require('./configure')
const Webpack = require('./webpack')
const FileMutator = require('./mutator')

class Builder {
  constructor () {
    this.compiler = Webpack(false).compiler
  }

  run (files = false) {
    return this.compile()
      .then(() => {
        return this.sendCompiledFiles()
      })
      .then(() => {
        if (config.get('shopify')) {
          return FileMutator(files)
        }
      })
  }

  compile () {
    return new Promise((resolve, reject) => {
      this.compiler.run((err, stats) => {
        if (err) throw err

        resolve(stats)
      })
    })
  }

  sendCompiledFiles () {
    return new Promise((resolve, reject) => {
      const matches = []

      glob(
        [
          `${config.get('cwd')}/dist/assets/**.{js,css,css.liquid}`,
          `${config.get('cwd')}/dist/snippets/*(script|style)-tags.liquid`
        ],
        e => {
          if (e) throw e
        }
      )
        .on('match', path => {
          matches.push(path)
        })
        .on('end', () => {
          resolve(matches)
        })
    }).then(matches => {
      if (!matches[0]) {
        return Promise.resolve()
      }

      matches = matches.map(p => {
        return p.replace(config.get('cwd'), '')
      })

      const first = new Promise((resolve, reject) => {
        resolve()
      })

      const chain = matches.reduce((prev, path) => {
        return prev.then(() => {
          return new Promise((resolve, reject) => {
            resolve()
          })
        })
      }, first)

      return chain
    })
  }
}

module.exports = (files = false) => {
  const builder = new Builder()
  return builder.run(files)
}
