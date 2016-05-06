var webpack = require("webpack");
var path = require("path");

module.exports = {
    entry: {
        openlayers: './test/apps/OpenLayers/main.js',
        //cesium: './test/apps/Cesium/main.js',
    },
    resolve: {
        modulesDirectories: ["web_modules", "node_modules", "bower_components"],
        alias: {
            // necessary to avoid multiple packings of backbone due to marionette
            backbone: path.join(__dirname, 'node_modules', 'backbone', 'backbone')
        },
    },
    output: {
        path: "./dist",
        filename: "[name].bundle.js",
        library: 'eoxc',
        libraryTarget: 'umd'
    },
    module: {
        loaders: [
            {test: /\.js$/, exclude: /node_modules/, loader: "babel-loader"},
            {test: /\.json$/, exclude: /node_modules/, loader: 'json-loader'},
            //{test: /\.css$/, loaders: 'style-loader!css-loader'},
            {test: /\.css$/, loaders: ['style', 'css']},
        ]
    },
    plugins: [
        new webpack.ResolverPlugin(
            new webpack.ResolverPlugin.DirectoryDescriptionFilePlugin(".bower.json", ["main"])
        ),
        /*new webpack.ProvidePlugin({
            d3: "d3",
            "window.d3": "d3"
        })*/
    ]
};
