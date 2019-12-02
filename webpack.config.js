const webpack = require('webpack');
const path = require('path');

module.exports = {
  entry: {
    openlayers: './test/apps/OpenLayers/main.js',
    //cesium: './test/apps/Cesium/main.js',
  },
  resolve: {
    modulesDirectories: ['web_modules', 'node_modules', 'bower_components'],
    alias: {
      // necessary to avoid multiple packings of backbone due to marionette
      backbone: path.join(__dirname, 'node_modules', 'backbone', 'backbone'),
    },
  },
  resolveLoader: {
    root: path.join(__dirname, 'node_modules'),
  },
  output: {
    path: './test/apps/dist',
    filename: '[name].bundle.js',
    library: 'eoxc',
    libraryTarget: 'umd',
  },
  module: {
    loaders: [
      { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader' },
      { test: /\.json$/, exclude: /node_modules/, loader: 'json-loader' },
      { test: /\.coffee$/, exclude: /node_modules/, loader: 'coffee-loader' },
      // {test: /\.css$/, loaders: 'style-loader!css-loader'},
      { test: /\.css$/, loaders: ['style', 'css'] },
      { test: /\.less$/, loaders: ['style', 'css', 'less'] },
      { test: /\.hbs$/, loader: 'handlebars-loader' },

      // for anything that might be included in a css
      { test: /\.(png|woff|woff2|eot|ttf|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: 'url-loader?limit=100000' },
    ],
  },
  plugins: [
    new webpack.ResolverPlugin(
        new webpack.ResolverPlugin.DirectoryDescriptionFilePlugin('.bower.json', ['main'])
    ),
    new webpack.ProvidePlugin({
      Promise: 'bluebird'
    }),
  ],
};
