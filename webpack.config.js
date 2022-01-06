const path = require('path');

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
            'vue-style-loader',
            'css-loader',
            'sass-loader',
          ]
        },
        {
          test: /\.ts$/,
          loader: 'ts-loader',
          options: { appendTsSuffixTo: [ /\.vue$/ ] }
        }
      ]
    },
    plugins: [
      new VueLoaderPlugin(),
      new CopyWebpackPlugin({
        patterns: [
          { from: '_locales', to: '_locales' },
          { from: '../public', to: '.' }, // `../` because `context` is `src`
          {
            from: 'manifest.json',
            to: 'manifest.json',
            transform: str => {
              const manifest = JSON.parse(str);
              manifest.version = require('./package.json').version;
              return JSON.stringify(manifest, null, 2);
            }
          },
        ],
      }),
    ],
  };

  /**
   * @note
   *
   * This is *essential* because Webpack's production mode makes heavy use of
   * `eval`, which is disallowed in Chrome Extensions. It's not very efficient
   * to use `cheap-module-source-map`, but it's the only way to make it work in
   * development.
   */
  if (mode == 'development')
    config.devtool = 'cheap-module-source-map';

  return config;
}