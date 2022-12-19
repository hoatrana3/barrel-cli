const path = require('path')
const webpack = require('webpack')
const config = require('./configure')
const { entrypointFiles, templateFiles, layoutFiles } = require('./entrypoints')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const getChunkName = require('./get-chunk-name')

class Webpacker {
  constructor (watching = false) {
    this.watching = watching
    this.hmr = path.resolve(__dirname, 'hot-client.js')

    this.getConfig()
    this.prepareDevtool()
    this.prepareEntry()
    this.prepareOutput()
    this.prepareResolve()
    this.prepareResolveLoader()
    this.preparePlugins()
    this.prepareModule()
    this.prepareExternals()
    this.prepareOptimization()

    this.initCompiler()
  }

  getConfig () {
    this.config = config.get('webpack')
  }

  prepareDevtool () {
    const { devtool = '' } = this.config
    if (!this.watching) {
      this.devtool = ''
      return
    }
    this.devtool = devtool
  }

  prepareEntry () {
    const entry = Object.assign(
      this.config.entry,
      config.get('shopify') && entrypointFiles()
    )
    if (!this.watching) {
      this.entry = entry
      return
    }
    if (!config.get('hmr')) {
      this.entry = entry
      return
    }
    if (typeof entry === 'string') {
      this.entry = [entry].push(this.hmr)
      return
    }
    if (typeof entry === 'object') {
      this.entry = {}
      Object.keys(entry).forEach(k => {
        if (typeof entry[k] === 'string') {
          this.entry[k] = [entry[k]]
        } else {
          this.entry[k] = entry[k]
        }
        this.entry[k].push(this.hmr)
      })
    }
  }

  prepareOutput () {
    this.output = Object.assign({}, this.config.output)
    this.output.publicPath = config.get('publicPath')
  }

  prepareResolve () {
    this.resolve = Object.assign(
      {
        modules: [path.resolve(__dirname, '../node_modules'), 'node_modules']
      },
      this.config.resolve || {}
    )
  }

  prepareResolveLoader () {
    this.resolveLoader = {
      modules: [path.resolve(__dirname, '../node_modules'), 'node_modules']
    }
  }

  preparePlugins () {
    this.plugins = [
      ...(this.config.plugins || []),
      ...(this.watching && config.get('hmr')
        ? [new webpack.HotModuleReplacementPlugin()]
        : []),
      ...(config.get('shopify')
        ? [
            new webpack.DefinePlugin({}),
            new HtmlWebpackPlugin({
              filename: '../snippets/script-tags.liquid',
              template: path.resolve(__dirname, 'script-tags.html'),
              inject: false,
              minify: {
                removeComments: true,
                collapseWhitespace: process.env.NODE_ENV === 'production',
                removeAttributeQuotes: false,
                preserveLineBreaks: process.env.NODE_ENV === 'production'
              },
              chunksSortMode:
                process.env.NODE_ENV === 'production' ? 'dependency' : 'auto',
              isDevServer: !(process.env.NODE_ENV === 'production'),
              liquidTemplates: templateFiles(),
              liquidLayouts: layoutFiles()
            }),
            new HtmlWebpackPlugin({
              filename: '../snippets/style-tags.liquid',
              template: path.resolve(__dirname, 'style-tags.html'),
              inject: false,
              minify: {
                removeComments: true,
                collapseWhitespace: process.env.NODE_ENV === 'production',
                removeAttributeQuotes: false,
                preserveLineBreaks: process.env.NODE_ENV === 'production'
              },
              chunksSortMode: 'dependency',
              isDevServer: !(process.env.NODE_ENV === 'production'),
              liquidTemplates: templateFiles(),
              liquidLayouts: layoutFiles()
            }),
            new HtmlWebpackPlugin({
              filename: '../snippets/link-preload-tags.liquid',
              template: path.resolve(__dirname, 'link-preload-tags.html'),
              inject: false,
              minify: {
                removeComments: true,
                collapseWhitespace: process.env.NODE_ENV === 'production',
                removeAttributeQuotes: false,
                preserveLineBreaks: process.env.NODE_ENV === 'production'
              },
              chunksSortMode: 'dependency',
              isDevServer: !(process.env.NODE_ENV === 'production'),
              liquidTemplates: templateFiles(),
              liquidLayouts: layoutFiles()
            })
          ]
        : [])
    ]
  }

  prepareModule () {
    this.module = Object.assign({}, this.config.module)

    if (!this.module.rules) {
      throw new Error('webpack.module must have "rules" property')
    }

    const rules = this.module.rules

    rules.forEach(r => {
      const { extract, use } = r
      if (!extract) return
      delete r.extract
      if (this.watching) return
      if (!Array.isArray(use)) {
        throw new Error('webpack.module.rules.use must be array')
      }
      if (use.length < 2) {
        throw new Error('webpack.module.rules.use must have a min length of 2')
      }
    })
  }

  prepareExternals () {
    this.externals = Object.assign({}, this.config.externals)
  }

  prepareOptimization () {
    if (!(process.env.NODE_ENV === 'production')) {
      return
    }

    this.optimization = Object.assign(
      {
        splitChunks: {
          chunks: 'initial',
          name: getChunkName
        }
      },
      this.config.optimization
    )
  }

  initCompiler () {
    const {
      devtool,
      entry,
      output,
      resolve,
      resolveLoader,
      plugins,
      externals,
      optimization,
      module: _module
    } = this

    const obj = {
      mode: process.env.NODE_ENV,
      devtool,
      entry,
      output,
      resolve,
      resolveLoader,
      plugins,
      externals,
      optimization,
      module: _module
    }

    this.compiler = webpack(obj)
  }
}

module.exports = watching => {
  return new Webpacker(watching)
}
