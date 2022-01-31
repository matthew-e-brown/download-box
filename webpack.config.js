const path = require('path');

const { DefinePlugin } = require('webpack');
const { VueLoaderPlugin } = require('vue-loader');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (_, { mode }) => {

  /**
  * @type {import('webpack').Configuration}
  */
  const config = {
    context: path.resolve(__dirname, 'src'),
    entry: {
      popup: './popup/main.ts',
      background: './background/main.ts',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
      extensions: [ '', '.ts', '.js' ]
    },
    module: {
      rules: [
        {
          test: /\.vue$/,
          loader: 'vue-loader',
        },
        {
          test: /\.(sa|sc|c)ss$/,
          use: [
            'style-loader',
            'css-loader',
            'sass-loader',
          ]
        },
        {
          test: /\.ts$/,
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            appendTsSuffixTo: [ /\.vue$/ ],
          }
        }
      ]
    },
    plugins: [
      new DefinePlugin({
        __VUE_OPTIONS_API__: false,
        __VUE_PROD_DEVTOOLS__: false,
      }),
      new VueLoaderPlugin(),
      new CopyWebpackPlugin({
        patterns: [
          // { from: '_locales', to: '_locales' },
          { from: 'static', to: '.' },
          {
            from: 'manifest.json',
            to: 'manifest.json',
            transform: str => {
              const manifest = JSON.parse(str);
              const package = require('./package.json');

              // Replace the `0.0.0` dummy version and description in
              // manifest.json with the ones from package.json
              manifest.version = package.version;
              manifest.description = package.description;
              delete manifest.$schema;  // causes an error if not removed

              return JSON.stringify(manifest, null, 2);
            }
          },
        ],
      }),
    ],
  };

  /**
   * @note This is *essential* because Webpack's production mode makes heavy use
   * of `eval`, which is disallowed in Chrome Extensions.
   */
  if (mode == 'development')
    config.devtool = 'inline-source-map';

  return config;
}