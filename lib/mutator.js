const glob = require('glob-all')
const fs = require('fs-extra')
const del = require('del')

const { isHotUpdateFile } = require('./util')
const config = require('./configure')
const chokidar = require('chokidar')

class Mutator {
  constructor () {
    if (config.get('watching')) {
      config.set('keepAlive', true)
    }
  }

  build (files = false) {
    return new Promise((resolve, reject) => {
      const matches = []

      if (files) {
        return resolve(files.slice(0))
      }

      glob([`${config.get('cwd')}/src/**/*.*`], e => {
        if (e) throw e
      })
        .on('match', path => {
          matches.push(path)
        })
        .on('end', () => {
          resolve(matches)
        })
    })
      .then(matches => {
        if (!matches[0]) {
          return Promise.resolve()
        }

        matches = matches.filter(path => !/[.]DS_Store/i.test(path))

        const first = this.copy({ type: 'changed', path: matches.shift() })
        const chain = matches.reduce((prev, path) => {
          return prev.then(
            this.copy.bind(this, {
              type: 'changed',
              path
            })
          )
        }, first)

        return chain
      })
      .then(() => {
        if (!files) {
          return this.concat()
        }

        if (
          files.some(path => {
            return ~path.indexOf('config/lib')
          })
        ) {
          return this.concat()
        }

        return Promise.resolve()
      })
      .catch(e => {
        throw e
      })
  }

  copy ({ type, path }) {
    return new Promise((resolve, reject) => {
      if (isHotUpdateFile(path)) {
        return resolve()
      }

      if (!path.match(/\.[0-9a-z]+$/i)) {
        throw new Error(`Error copying path ${path}`)
      }

      const fileName = path.split('/').pop()
      const src = this.getSrc(fileName)
      const base = this.getBase(path)

      const dest = this.getDest(path, src, base)

      if (type === 'changed' || type === 'added') {
        fs.copySync(path, `${dest.absolute}`)
        resolve()
      }
    })
  }

  getSrc (fileName) {
    return fileName.replace(/(.*)([.]section|[.]template)([.]liquid)/, '$1$3')
  }

  getDest (path, src, base) {
    return /.([.](css|js(?!on)|svg|jpe?g|gif|png|css\.liquid)$)/.test(path)
      ? {
          absolute: `${config.get('cwd')}/dist/assets/${src}`,
          relative: `/dist/assets/${src}`
        }
      : {
          absolute: `${config.get('cwd')}/dist/${base}/${src}`,
          relative: `/dist/${base}/${src}`
        }
  }

  getBase (path) {
    let base = ''

    if (/\/locales/.test(path)) {
      base = 'locales'
    } else if (/assets/.test(path)) {
      base = 'assets'
    } else if (/\/templates/.test(path) || /[.]template/.test(path)) {
      if (/\/templates\/customers/.test(path)) {
        base = 'templates/customers'
      } else {
        base = 'templates'
      }
    } else if (/\/sections/.test(path) || /[.]section/.test(path)) {
      base = 'sections'
    } else if (/\/layout/.test(path) || /[.]layout/.test(path)) {
      base = 'layout'
    } else if (/config/.test(path)) {
      base = 'config'
    } else {
      base = 'snippets'
    }

    return base
  }

  delete (path) {
    if (isHotUpdateFile(path)) {
      return
    }

    const fileName = path.split('/').pop()
    const src = this.getSrc(fileName)
    const base = this.getBase(path)
    const dest = this.getDest(path, src, base)

    del.sync(dest.absolute)
  }

  concat () {
    return new Promise((resolve, reject) => {
      const settingsSchema = glob
        .sync(`${config.get('cwd')}/src/config/lib/**`)
        .reduce((arr, path) => {
          if (!~path.indexOf('json')) {
            return arr
          }
          const partial = fs.readFileSync(path, 'utf8').trim()

          if (partial) {
            arr.push(partial)
          }
          return arr
        }, [])
        .join(',')

      if (!settingsSchema) {
        return resolve()
      }

      fs.outputFile(
        `${config.get('cwd')}/dist/config/settings_schema.json`,
        `[${settingsSchema}]`,
        err => {
          if (err) {
            throw err
          }

          resolve()
        }
      )
    })
  }

  watch () {
    chokidar
      .watch(`${config.get('cwd')}/src/**/*`, { ignoreInitial: true })
      .on('add', path => this.respondToFileChange(path))
      .on('change', path => this.respondToFileChange(path))
      .on('unlink', path => this.delete(path))
  }

  respondToFileChange (path) {
    if (~path.indexOf('config/lib')) {
      this.concat()
    } else {
      this.copy({ type: 'changed', path })
    }
  }
}

module.exports = (watch = false, files = false) => {
  return new Mutator()[watch ? 'watch' : 'build'](files)
}
