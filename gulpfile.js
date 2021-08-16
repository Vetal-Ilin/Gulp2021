'use strict'

/* встроенные модули */
const fs = require('fs'); // может понадобиться удалить
const path = require('path');

/* подключаемые модули Gulp */
const gulp = require('gulp');
const gulplog = require('gulplog'); 
const concat = require('gulp-concat');
const less = require('gulp-less');
const debug = require('gulp-debug');
const cleanCSS = require('gulp-clean-css');
const gulpif = require('gulp-if');
const autoprefixer = require('gulp-autoprefixer');
const sourcemaps = require('gulp-sourcemaps');
const notify  = require('gulp-notify');
const combiner = require('stream-combiner2').obj;
const plumber = require('gulp-plumber'); 
const rev = require('gulp-rev');
const revReplace = require('gulp-rev-replace');
const del = require('del');
const browserSync = require('browser-sync').create();
const fileinclude = require('gulp-file-include');
const imagemin = require('gulp-imagemin');
const webp = require('gulp-webp');
const webphtml = require('gulp-webp-html');
const webpcss = require('gulp-webpcss');
const newer = require('gulp-newer');
const svgSprite = require('gulp-svg-sprite');
const ttf2woff = require('gulp-ttf2woff');
const ttf2woff2 = require('gulp-ttf2woff2');

/* плагины для webpak */
const webpack= require('webpack-stream');
const webpackConfig = require('./webpack.config.js');



/* переменные для разных режимов сборки проекта */
const isDev = !process.env.NODE_ENV || process.env.NODE_ENV == 'development';
const isProd = !isDev; 

/* переменные к которым присвоены названия основных каталогов проекта */
const dirDist = 'dist';
const dirSrc = 'src';
const dirStyles = 'styles';
const dirScripts = 'scripts';
const dirTmp = 'tmp';
const dirTmpStyles = 'styles';
const dirAssets = 'assets';
const dirImg = 'img';
const dirSvg = 'svg';
const dirManifest = './manifest';
const dirFonts = 'fonts';

/* порядок подключения файлов стилей */ 
const stylesFiles = [
    path.join(__dirname, dirSrc, dirStyles, 'index.less')
];

/* выходной файл для стилей */
const distCss = 'style.css';
const manifestFileStyles = 'css.json';
const manifestScripts = 'webpack.json';

/* пути файлов */
const paths = {
    clean: {
        clDist: dirDist,
        clManifest: dirManifest,
    },
    src: {
        styles: stylesFiles,
        scripts: path.join(__dirname, dirSrc, dirScripts + '*/js'),
        html: [path.join(__dirname, dirSrc, '*.html'), path.join("!" + __dirname, dirSrc, '_*.html')],
        img: path.join(__dirname, dirSrc, dirAssets, dirImg, '**/*.*'),
        icon: path.join(__dirname, dirSrc, dirStyles, dirSvg, '**/*.svg'),
        fonts: path.join(__dirname, dirSrc, dirAssets, dirFonts, '*.ttf')
    },
    dist: {
        styles: path.join(__dirname, dirDist, dirStyles),
        scripts: path.join(__dirname, dirDist, 'scripts'),
        html: path.join(__dirname, dirDist),
        img: path.join(__dirname, dirDist, dirAssets, dirImg),
        fonts: path.join(__dirname, dirDist, dirAssets, dirFonts)
    },
    watch: {
        styles: './src/styles/**/*.less',
        scripts: './src/scripts/**/*.js',
        html: './src/*.html',
        img: './src/assets/img/**/*.*', 
        svgSprite: './src/styles/svg/**/*.svg',
        fonts: './src/assets/fonts/**/*.ttf'
    },
    manifest: {
       styles: path.join(__dirname, dirManifest, manifestFileStyles),
       scripts: path.join(__dirname, dirManifest, manifestScripts),
    },
    tmp: path.join(__dirname, dirTmp, dirTmpStyles),
};



/* очистка выходной директории */
const clean = () => {
    return del([paths.clean.clDist, paths.clean.clManifest])
};


/* Задачи для стилей */
const styles = () => {
    return combiner(
        gulp.src(paths.src.styles, {since: gulp.lastRun('styles')}),
        debug({title: 'styles src'}),
        gulpif(isDev, sourcemaps.init()),
        less(),
        debug({title: 'styles less'}),
        concat(distCss),
        debug({title: 'styles concat'}),
        autoprefixer(),
        gulpif(isProd, cleanCSS({ level: { 1: { specialComments: 0 } }})),
        gulpif(isDev, sourcemaps.write()),
        gulpif(isProd, rev()),
        webpcss(),
        gulp.dest(paths.dist.styles),
        gulpif(isProd, rev.manifest(manifestFileStyles)),
        gulpif(isProd, gulp.dest(dirManifest))
    ).on('error', notify.onError(function(error) {
        return 'Внимание ошибка в styles: ' + error.message;
    }));
};


/* Задачи для скриптов */
const scripts = () => {
    let firstBuildReady = false;

    /* обработка ошибок */
    function done(err, stats) {
      firstBuildReady = true;
  
      if (err) {return}
  
      gulplog[stats.hasErrors() ? 'error' : 'info'](stats.toString({
        colors: true
      }))
    };

    /* задачи gulp для scripts  */
    return gulp.src(paths.src.scripts) 
    .pipe(plumber({
        errorHandler: notify.onError(err => ({
        title:   'Webpack',
        message: err.message
  }))}))
    .pipe(webpack(webpackConfig, null, done))
    .pipe(gulp.dest(paths.dist.scripts))
};

                     
/* задачи для html */
const html = () => {
    return combiner(
        gulp.src(paths.src.html),
        debug({title: 'html src'}),
        gulpif(isProd,  revReplace({
            manifest: gulp.src(paths.manifest.styles, {allowEmpty: true})
        })),
        gulpif(isProd,  revReplace({
            manifest: gulp.src(paths.manifest.scripts, {allowEmpty: true})
        })),
        fileinclude(),
        webphtml(),
        gulp.dest(paths.dist.html),
        browserSync.stream()
    );
};


/* задачи для сжатия изображений */
const images = () => {
    return combiner(
        gulp.src(paths.src.img),
        newer(paths.dist.img),
        debug({title: 'image webp src'}),
        webp({
            quality: 70
        }),
        debug({title: 'image webp dest'}),
        gulp.dest(paths.dist.img),
        gulp.src(paths.src.img),
        newer(paths.dist.img),
        debug({title: 'image minify src'}),
        imagemin({
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            interlaced: true,
            optimizationLevel: 3
        }),
        debug({title: 'image minify dest'}),
        gulp.dest(paths.dist.img),
        browserSync.stream()
    );
};


/* Задачи для svg спрайтов */
const iconsvg = () => {
    return combiner(
        gulp.src(paths.src.icon),
        svgSprite({
            mode: {
                css: {
                    dest: '.',
                    bust: isProd,
                    sprite: 'iconSprite.svg',
                    layout: 'vertical',
                    dimensions: true,
                    example: false,
                    render: {
                        css: {
                            dest: 'spriteSvg'
                        }
                    }
                }
            }
        }),
        gulpif('*.css', gulp.dest(paths.tmp), gulp.dest(paths.dist.styles)),
        browserSync.stream()
    );
};


/* задачи для конвертации шрифтов */ 
const fonts = () => {
    gulp.src(paths.src.fonts)
    .pipe(ttf2woff())
    .pipe(debug({title: 'fonts woff'}))
    .pipe(gulp.dest(paths.dist.fonts));
    return gulp.src(paths.src.fonts)
    .pipe(ttf2woff2())
    .pipe(debug({title: 'fonts woff2'}))
    .pipe(gulp.dest(paths.dist.fonts));
}

/* Обновление браузера при внесении изменений */
const server = () => {
    browserSync.init({
        server: 'dist' 
    });
    browserSync.watch(path.join(dirDist, '**/*.*'), browserSync.reload)
};

/* Обновление без пересборки проекта при изменениях */
const watch = () => {
    gulp.watch(paths.watch.styles, gulp.series(styles));
    gulp.watch(paths.watch.scripts, isProd ? gulp.series(scripts, html): scripts);
    gulp.watch(paths.watch.html, html);
    gulp.watch(paths.watch.img, images);
    gulp.watch(paths.watch.svgSprite, iconsvg);
    gulp.watch(paths.watch.fonts, fonts);
};


/* инициализирование задач */
exports.clean = clean;
exports.styles = styles;
exports.scripts = scripts;
exports.server = server;
exports.watch = watch;
exports.html = html;
exports.images = images;
exports.iconsvg = iconsvg; 
exports.fonts = fonts; // запускается в ручную
exports.default = gulp.series(clean, iconsvg, gulp.parallel(styles, scripts, images), html, gulp.parallel(watch));


