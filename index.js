#! /usr/bin/env node
'use strict'

const program = require('commander')

const pkg = require('./package.json')

program
  .version(pkg.version)
  .option('-w --watch', 'recursively watch src directory')
  .option('-e --env [env]', 'specify an environment')
  .option('-b, --build [env]', 'build a theme')
  .option('--debug', 'enable available debugging')
  .parse(process.argv)

process.env.ENV = program.env || 'development'

if (process.env.ENV === 'development') {
  process.env.NODE_ENV = 'development'
} else {
  process.env.NODE_ENV = 'production'
}

const configure = require('./lib/configure')
const watcher = require('./lib/watcher')
const builder = require('./lib/builder')

configure.setup({
  watching: !!program.watch
})

switch (true) {
  case program.watch:
    watcher()
    break
  case program.build:
    builder()
    break
}
