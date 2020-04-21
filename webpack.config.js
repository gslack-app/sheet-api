const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const GasPlugin = require('gas-webpack-plugin');
const src = path.resolve(__dirname);
const dest = path.resolve(__dirname, 'app');
const isProduction = process.env.NODE_ENV === 'production' || false;

module.exports = (env) => {
    return {
        target: 'web',
        mode: isProduction ? 'production' : 'development',
        context: __dirname,
        devtool: false,
        entry: {
            app: path.resolve(__dirname, 'www', 'app.ts')
        },
        output: {
            libraryTarget: 'var',
            library: 'app',
            path: dest,
            filename: `[name]-v${require("./package.json").version.toString()}.js`
        },
        optimization: {
            minimize: true,
            removeAvailableModules: true,
            minimizer: [
                new TerserPlugin({
                    parallel: true,
                    extractComments: false,
                    terserOptions: {
                        ecma: 2015,
                        max_line_len: true,
                        warnings: false,
                        mangle: {},
                        compress: {
                            drop_console: false,
                            drop_debugger: isProduction
                        },
                        output: {
                            beautify: true,
                            braces: true,
                            comments: false
                        },
                        keep_classnames: !isProduction,
                        keep_fnames: true,
                    }
                })
            ]
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
                    from: `${src}/*.gs`,
                    to: dest
                }
            ]),
            new GasPlugin({
                comments: false,
                source: 'gslack.app'
            })
        ]
    };
}