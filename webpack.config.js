const path = require('path');

const { version } = require('./package.json');

const MiniCSSExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const sveltePreprocess = require('svelte-preprocess');

module.exports = (_, { mode }) => {
  const config = {
    context: path.resolve(__dirname, 'src'),
    entry: {
      popup: './popup/index.ts',
      content: './content/index.ts',
      background: './background/index.ts',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js'
    },
    resolve: {
      alias: {
        svelte: path.resolve('node_modules', 'svelte'),
        shared: path.resolve('src', 'shared')
      },
      extensions: [ '.ts', '.mjs', '.js', '.svelte' ],
      mainFields: [ 'svelte', 'browser', 'module', 'main' ]
    },
    module: {
      rules: [{
        test: /\.svelte$/,
        use: {
          loader: 'svelte-loader',
          options: {
            emitCss: true,
            preprocess: sveltePreprocess({
              scss: { renderSync: true }
            })
          }
        }
      }, {
        test: /\.ts$/,
        use: { loader: 'ts-loader' }
      }, {
        test: /\.(sa|sc|c)ss$/,
        use: [
          'style-loader',
          {
            loader: MiniCSSExtractPlugin.loader,
            options: { esModule: false }
          },
          'css-loader',
          'sass-loader',
        ]
      }]
    },
    plugins: [
      new MiniCSSExtractPlugin({
        filename: '[name].css'
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: '_locales', to: '_locales' },
          // { from: 'assets', to: 'assets', },
          { from: 'popup/popup.html', to: 'popup.html' },
          {
            from: 'manifest.json', to: 'manifest.json',
            transform: string => {
              const content = JSON.parse(string);
              content.version = version;
              return JSON.stringify(content, null, 2);
            }
          }
        ]
      })
    ]
  }

  if (mode == 'development') config.devtool = 'cheap-module-source-map';

  return config;
};