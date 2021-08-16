'use strict'

/* встроенные модули */
const path = require('path');

/* подключаемые модули Wabpack */
const { WebpackManifestPlugin } = require('webpack-manifest-plugin'); // удалить
const AssetsPlugin = require('assets-webpack-plugin');
const {CleanWebpackPlugin} = require('clean-webpack-plugin'); // удалить


/* переменные для разных режимов сборки проекта */
const isDev = !process.env.NODE_ENV || process.env.NODE_ENV == 'development';
const isProd = !isDev; 

/* переменна в которую присвоено название выходного файла, зав. от режима сборки */
const filename = ext => isDev ? `[name].${ext}` : `[name].[hash].${ext}`;

const jsLoaders = () => {
    const loaders = [{
        loader: 'babel-loader', 
        options: {
            presets: [
                '@babel/preset-env'
            ],
            plugins: [
                '@babel/plugin-proposal-class-properties'
            ],  
        }
    }];

    if (isDev) {
        loaders.push('eslint-loader');
      }

    return loaders
}

/* подключаемые плагины */
const plugins = () => {
    const base = [

    ]
    if (isProd) {
        base.push(new AssetsPlugin({
            filename: 'webpack.json',
            path: __dirname + '/manifest',
            entrypoints: true,
            processOutput(assets) {
              for (let key in assets) {
                assets[key + '.js'] = assets[key].js.slice(module.exports.output.publicPath.length);
                delete assets[key];
              }
              return JSON.stringify(assets);
            }
        }),)
    }

    return base
}

module.exports = {
    context: path.resolve(__dirname, 'src'),
    mode: 'development',
    entry: ['@babel/polyfill','./scripts/page.js'],
    output: {
        filename: filename('js'),
        publicPath: './scripts/'
    },
    plugins: plugins(),
    module: {
        rules: [
            {
                test: /\.m?js$/,
                exclude: /(node_modules|bower_components)/,
                use: jsLoaders(), 
            }
        ]
    }
}