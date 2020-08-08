
/* --- Configuration --- */

const bundles =
{
    css: [
        {// Basic
            src: [
                'css/**/*.less',
                'css/**/*.scss',
                "!build/**/*"
            ],
            dest: "./build/css",
            fileName: "site.css",
            order: [
                "**/common.less",
                "**/*.less"
            ]
        }
    ],
    js: [
        {// Basic
            src: [
                './js/**/*.js',
                "!build/**/*"
            ],
            dest: "./build/js",
            fileName: "site.js",
            order: [
                "**/common.js",
                "**/*.js"
            ]
        }
    ]
};

/* --- npm Packages --- */

const gulp = require('gulp'),
    less = require('gulp-less'),
    babel = require('gulp-babel'),
    concat = require('gulp-concat'),
    postcss = require("gulp-postcss"),
    cssnano = require("cssnano"),
    del = require('del'),
    debug = require('gulp-debug'),
    autoprefixer = require("autoprefixer"),
    gulpif = require('gulp-if'),
    order = require("gulp-order"),
    argv = require('yargs').argv,
    sourcemaps = require("gulp-sourcemaps"),
    browserSync = require("browser-sync").create(),
    sass = require('gulp-sass'),
    minify = require('gulp-minify'),
    fileinclude = require('gulp-file-include');
 
sass.compiler = require('node-sass');

/* --- Arguments --- */
/* You can pass in arguments in the terminal 
 * --prod //sets environment to run production code
 * --gb // makes the global bundle js/css builds to the build folder
 * --debug //emits more details in the terminal
 * --sm //enables source maps
 * */

const isProd = argv.prod || false;
const isDebug = argv.debug;
const enableSourceMaps = argv.sm;
const preprocessor = "less";
/* --- Tasks --- */

function clean() {

    return del([
        'build/css/*.css',
        'build/js/*.js',
        'build/*.html'
    ]);
}

function makeStyles(bundle) {
    return gulp.src(bundle.src)
        .pipe(order(bundle.order))
        .pipe(gulpif(isDebug, debug({ title: "Styles" })))
        .pipe(gulpif(enableSourceMaps, sourcemaps.init()))
        .pipe(gulpif(preprocessor === "less", less().on('error', function (err) {
            console.error(err.message);
            browserSync.notify(err.message, 3000); // Display error in the browser
            this.emit('end'); // Prevent gulp from catching the error and exiting the watch process
        })))
        .pipe(gulpif(enableSourceMaps === "scss", sass().on('error', function (err) {
            console.error(err.message);
            browserSync.notify(err.message, 3000); // Display error in the browser
            this.emit('end'); // Prevent gulp from catching the error and exiting the watch process
        })))
        .pipe(postcss([autoprefixer(), cssnano()]))
        .pipe(concat(bundle.fileName))
        .pipe(gulpif(enableSourceMaps, sourcemaps.write()))
        .pipe(gulp.dest(bundle.dest))
        .pipe(gulpif(!isProd, browserSync.stream()));
}

function makeScripts(bundle) {
    return gulp.src(bundle.src)
        .pipe(order(bundle.order))
        .pipe(gulpif(enableSourceMaps, sourcemaps.init()))
        .pipe(gulpif(isDebug, debug({ title: "Scripts" })))
        .pipe(babel({
            presets: [
              ['@babel/env', {
                modules: false
              }]
            ]
          } ))
        .pipe(gulpif(isProd, minify({noSource: true, mangle: {toplevel: true}})))
        .pipe(concat(bundle.fileName))
        .pipe(gulpif(enableSourceMaps, sourcemaps.write("../maps")))
        .pipe(gulp.dest(bundle.dest));
}

function makeCssBundles(done) {
   
    for (var i = 0; i < bundles.css.length; i++) {
        makeStyles(bundles.css[i]);
    }
    done();
}
function makeJsBundles(done) {
    for (var i = 0; i < bundles.js.length; i++) {
        makeScripts(bundles.js[i]);
    }
    done();
}

function makeHtml(){
    console.log("it do");
    return gulp.src([
        "*.html",
        "!includes/**/*.html"
    ])
    .pipe(fileinclude({
        prefix: '@@',
        basepath: '@file'
    }))
    .pipe(gulp.dest('build/'))
}

// Add browsersync initialization at the start of the watch task
function watch() {
    browserSync.init({
        server: {
            baseDir: "build",
            index: "index.html"
        }
    });
    gulp.watch('js/**/*.js', makeJsBundles).on('change', browserSync.reload);
    gulp.watch('css/**/*.less', makeCssBundles);
    gulp.watch("./*.html").on('change', gulp.series(makeHtml, browserSync.reload));
    gulp.watch("gulpfile.js").on("change", () => process.exit(0));
}

/* --- Call Tasks --- */

/*
 * Specify if tasks run in series or parallel using `gulp.series` and `gulp.parallel`
 */
const build = gulp.series(clean, gulp.parallel(makeCssBundles, makeJsBundles, makeHtml));
const dev = gulp.series(clean, gulp.parallel(makeCssBundles, makeJsBundles, makeHtml), watch);


/*
 * You can use CommonJS `exports` module notation to declare tasks
 */
exports.clean = clean;
exports.watch = watch;
exports.build = build;
exports.styles = makeCssBundles;
exports.scripts = makeJsBundles;
exports.dev = dev;

/*
 * Define default task that can be called by just running `gulp` from cli
 */
exports.default = build;