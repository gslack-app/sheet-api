const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const GasPlugin = require('gas-webpack-plugin');
const src = path.resolve(__dirname);
const dest = path.resolve(__dirname, 'app');

module.exports = (env) => {
    return {
        target: 'web',
        mode: 'development',
        context: __dirname,
        devtool: false,
        entry: {
            app: path.resolve(__dirname, 'www', 'app.ts')
        },
        output: {
            libraryTarget: 'this',
            path: dest,
            filename: `[name]-${require("./package.json").version.toString()}.js`
        },
        module: {
            rules: [
                {
                    test: /\.(ts|js)x?$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader'
                    }
                }
            ]
        },
        resolve: {
            extensions: ['.ts', '.js']
        },
        plugins: [
            new CleanWebpackPlugin(),
            new CopyWebpackPlugin([
                {
                    from: `${src}/views/**/**`,
                    to: dest
                },
                {
                    from: `${src}/appsscript.json`,
                    to: dest
                },
                {
                    from: `${src}/zero.gs`,
                    to: `${dest}/0.gs`
                }
            ]),
            new GasPlugin({
                comments: false,
                source: 'gslack.app'
            })
        ]
    };
}