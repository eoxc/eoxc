
module.exports = {
    entry: {
        eoxc: './src/eoxc.js',
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
            {test: /\.json$/, exclude: /node_modules/, loader: 'json-loader'}
        ]
    },
};
