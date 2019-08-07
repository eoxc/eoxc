const webpack = require('webpack');
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const packageJson = require('./package.json');

const babelConfigLoader = {
  loader: 'babel-loader',
  options: {
    presets: ['@babel/preset-env'],
    plugins: ['@babel/plugin-proposal-object-rest-spread'],
    cacheDirectory: true
  }
};

module.exports = {
  entry: {
    eoxc: [path.join(__dirname, 'test', 'apps', 'OpenLayers', 'preload.js'), path.join(__dirname, 'test', 'apps', 'OpenLayers', 'main.js')]
  },
  resolve: {
    alias: {
      // necessary to avoid multiple packings of backbone due to marionette
      backbone: path.join(__dirname, 'node_modules', 'backbone', 'backbone'),
    },
  },
  output: {
    path: path.join(__dirname, 'test', 'apps', 'dist'),
    filename: `[name].bundle.${packageJson.version}.js`,
    library: 'eoxc',
    libraryTarget: 'umd',
  },
  module: {
    rules: [
      {
        test: /\.json$/,
        use: { loader: 'json-loader' },
        type: 'javascript/auto'
      },
      {
        test: require.resolve('jquery'),
        use: [{
          loader: 'expose-loader',
          options: '$'
        }, {
          loader: 'expose-loader',
          options: 'jQuery'
        }]
      },
      { test: /\.js$/, exclude: /node_modules/, use: babelConfigLoader },
      { test: /\.coffee$/, loader: 'coffee-loader' },
      { test: /\.less$/,
        use: [MiniCssExtractPlugin.loader,
          { loader: 'css-loader' },
          { loader: 'postcss-loader',
            options: {
              ident: 'postcss',
              plugins: [
                require('autoprefixer')(),
              ]
            }
          },
        { loader: 'less-loader' }] },
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          MiniCssExtractPlugin.loader,
          { loader: 'css-loader', options: {} },
          {
            loader: 'postcss-loader',
            options: {
              ident: 'postcss',
              plugins: [
                require('autoprefixer')(),
              ]
            }
          },
          { loader: 'sass-loader', options: {} },
        ]
      },
      { test: /\.hbs$/, loader: 'handlebars-loader', options: { helperDirs: path.join(__dirname, 'src', 'helpers') } },
      {
        test: /\.woff2?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        use: 'url-loader?limit=10000',
      },
      {
        test: /\.(png|woff2|woff|ttf|eot|svg)($|\?)/, use: 'file-loader',
      },
      { test: /font-awesome\.config\.js/,
        use: [
          {
            loader: 'postcss-loader',
            options: {
              ident: 'postcss',
              plugins: [
                require('autoprefixer')(),
              ]
            }
          },
          { loader: 'font-awesome-loader' },
        ],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: `[name].bundle.${packageJson.version}.css`
    }),
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      'window.jQuery': 'jquery',
      _: 'underscore',
    }),
  ],
};
