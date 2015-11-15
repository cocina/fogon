import assign from 'object-assign';
import bourbon from 'bourbon';
import fs from 'fs';
import minimist from 'minimist';
import { plugins } from './lib';

let knownOptions = {
  string: 'env',
  default: { env: process.env.NODE_ENV || 'production' } //eslint-disable-line no-undef
};
let options = minimist(process.argv.slice(2), knownOptions); //eslint-disable-line no-undef
if (process.argv.indexOf('dev') !== -1) options.env = 'development'; //eslint-disable-line no-undef

const DEST = './build';
const SRC = './src';

function loadJSON(filepath) {
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (err) {
    plugins.util.log(
      plugins.util.colors.yellow('WARNNING!! Unable to load JSON file: '),
      plugins.util.colors.red(err.message)
    );
    return {};
  }
}
// generate configs: combine base + environment configs
const pkg = loadJSON('./package.json');
const baseConfig = loadJSON('./src/config/config.json');
const envConfig = loadJSON('./src/config/' + options.env + '.json');
assign(
  baseConfig,
  {
    debug: (options.env === 'development'),
    env: options.env,
    version: pkg.version
  },
  envConfig
);

export default {
  assets: {
    images: {
      src: SRC + '/assets/images/*.{svg,png,jpg,gif}',
      dest: DEST + '/images'
    }
  },
  browserify: {
    dest: DEST + '/scripts',
    outputName: 'app.js',
    src: SRC + '/scripts/app.js',
    watch: (options.env === 'development')
  },
  config: {
    data: baseConfig,
    src: SRC +  '/config/config.tmpl',
    dest: SRC + '/scripts'
  },
  lint: {
    src: [ SRC + '/scripts/**/*', './gulp/**/*.js' ]
  },
  markup: {
    data: baseConfig,
    dest: DEST,
    src: SRC + '/*.html'
  },
  serve: {
    server: { baseDir: DEST },
    notify: false
  },
  styles: {
    src: SRC + '/styles/**/*.{sass,scss}',
    dest: DEST + '/styles',
    settings: {
      includePaths: [
        'node_modules/normalize.css/',
        bourbon.includePaths[0],
        'node_modules/font-awesome/scss/'
      ]
    }
  }
};
