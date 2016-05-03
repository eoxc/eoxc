var glob = require("glob");
var webpack = require("webpack");

const testFiles = glob.sync('./test/unit/**/*.js');
const allFiles = ['./test/setup/browser.js'].concat(testFiles);

module.exports = {
    entry: allFiles,
    output: {
        path: "./test/tmp",
        filename: '__spec-build.js'
    },
    module: {
        loaders: [
            // This is what allows us to author in future JavaScript
            {test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader'},
            // This allows the test setup scripts to load `package.json`
            {test: /\.json$/, exclude: /node_modules/, loader: 'json-loader'}
        ]
    },
    plugins: [
        // By default, webpack does `n=>n` compilation with entry files. This concatenates
        // them into a single chunk.
        new webpack.optimize.LimitChunkCountPlugin({maxChunks: 1})
    ],
    devtool: 'inline-source-map'
};
