const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const GasPlugin = require('gas-webpack-plugin');
const src = path.resolve(__dirname);
const destination = path.resolve(__dirname, 'app');

module.exports = (env) => {
    const isProd = env.NODE_ENV === 'prod';
    return [{
        target: 'web',
        mode: isProd ? 'production' : 'development',
        context: __dirname,
        devtool: false,
        entry: {
            app: path.resolve(__dirname, 'www', 'app.ts')
        },
        output: {
            libraryTarget: 'this',
            path: destination,
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
        optimization: {
            minimize: isProd,
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        ecma: 6,
                        warnings: false,
                        mangle: {},
                        compress: {
                            drop_console: false,
                            drop_debugger: isProd
                        },
                        output: {
                            beautify: !isProd
                        }
                    }
                })
            ]
        },
        plugins: [
            new CleanWebpackPlugin(),
            new CopyWebpackPlugin([
                {
                    from: `${src}/views/**/**`,
                    to: destination
                },
                {
                    from: `${src}/appsscript.json`,
                    to: destination
                },
                {
                    from: `${src}/zero.gs`,
                    to: `${destination}/0.gs`
                }
            ]),
            new GasPlugin({
                comments: false,
                source: 'gslack.app'
            })
        ]
    },
    {
        target: 'web',
        mode: isProd ? 'production' : 'development',
        context: __dirname,
        devtool: false,
        entry: {
            jsonQuery: path.resolve(__dirname, 'node_modules', 'json-query', 'index.js')
        },
        output: {
            libraryTarget: 'var',
            library: 'jsonQuery',
            globalObject: 'this',
            path: destination,
            filename: `json-query-${require("./node_modules/json-query/package.json").version.toString()}.js`
        },
        module: {
            rules: [
                {
                    test: /\.js$/,
                    use: {
                        loader: 'babel-loader'
                    }
                }
            ]
        },
        resolve: {
            extensions: ['.js']
        },
        optimization: {
            minimize: isProd,
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        ecma: 6,
                        warnings: false,
                        mangle: {},
                        compress: {
                            drop_console: false,
                            drop_debugger: isProd
                        },
                        output: {
                            beautify: !isProd
                        }
                    }
                })
            ]
        },
        plugins: [
            new CleanWebpackPlugin(),
            new GasPlugin({
                comments: false
            })
        ]
    }];
}