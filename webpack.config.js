const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = (env, argv) => ({
  entry: path.resolve(__dirname, './main.js'),
  target: 'web',
  devtool: argv.mode === 'development' ? 'eval-cheap-module-source-map' : '',
  resolve: {
    extensions: ['.js']
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: path.resolve(__dirname, 'main.css'), to: path.resolve(__dirname, 'dist/main.css') },
      ],
    }),
  ],
  devServer: {
    hot: false,
    compress: true,
    open: false,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
    static: {
      directory: path.join(__dirname, './static')
    }
  },
});
