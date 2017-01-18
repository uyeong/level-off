const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const autoprefixer = require('autoprefixer');
const {name, version} = require('./package.json');
const isProduction = process.env.NODE_ENV === 'production';
const filename = `${name}-${version}${isProduction ? '.min' : ''}`;
const plugins = [];

if (isProduction) {
    plugins.push([
        new webpack.optimize.UglifyJsPlugin({
            sourceMap: false,
            mangle: false,
            output: {
                comments: false
            }
        })
    ]);
}

module.exports = {
    devtool: isProduction ? '' : 'source-map',
    entry: './src/app.js',
    output: {
        path: path.resolve(__filename, '../dist'),
        filename: `/assets/js/${filename}.js`
    },
    plugins: plugins.concat([
        new HtmlWebpackPlugin({
            template: 'html/index.hbs'
        }),
        new ExtractTextPlugin(`/assets/css/${filename}.css`),
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: `"${process.env.NODE_ENV}"`
            }
        })
    ]),
    module: {
        loaders: [{
            test: /.js?$/,
            loader: 'babel-loader',
            exclude: /node_modules/,
            query: {
                presets: ['es2015'],
                plugins: ['transform-class-properties'],
                cacheDirectory: true
            }
        }, {
            test: /\.(scss|css)/,
            loader: ExtractTextPlugin.extract('style', 'css!postcss!sass')
        }, {
            test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
            loader: "url?limit=10000&name=/assets/fonts/[name].[ext]&mimetype=application/font-woff"
        }, {
            test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
            loader: "url?limit=10000&name=/assets/fonts/[name].[ext]&mimetype=application/font-woff"
        }, {
            test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
            loader: "url?limit=10000&name=/assets/fonts/[name].[ext]&mimetype=application/octet-stream"
        }, {
            test: /\.otf(\?v=\d+\.\d+\.\d+)?$/,
            loader: "file?name=/assets/fonts/[name].[ext]"
        }, {
            test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
            loader: "file?name=/assets/fonts/[name].[ext]"
        }, {
            test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
            loader: "url?limit=10000&name=/assets/fonts/[name].[ext]&mimetype=image/svg+xml"
        }, {
            test: /\.hbs/,
            loader: "handlebars-loader"
        }]
    },
    postcss: [
        autoprefixer
    ],
    devServer: {
        port: 8090,
        colors: true
    }
};
