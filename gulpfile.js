
var gulp = require('gulp');
var ts = require('gulp-typescript');

/****** OLD ***** */
gulp.task('clean', function () {
    var del = require('del');
    del(['dist', 'build', 'test/**/*.js', 'test/**/*.map', 'src/**/*.js', 'src/**/*.map']);
});

gulp.task('compile', function () {
    var del = require('del');
    var tsProject = ts.createProject('./tsconfig.json');

    del('build/debug').then(() => {
        gulp.src(['src/**/*.ts', 'demo/**/*.ts', '!src/mock/**/*']).pipe(tsProject()).js.pipe(gulp.dest('build/debug'));
    });
});


gulp.task('prepare-debug', function () {
    var fs = require('fs');
    gulp.src('test/support/*').pipe(gulp.dest('build/debug/support'));
    gulp.src('test/templates/*').pipe(gulp.dest('build/debug/templates'));
 });
/****** OLD ***** */


const { src, dest, series } = require('gulp');

async function compile_dist() {
    var del = require('del');
    var tsProject = ts.createProject('./tsconfig.json');

    var pkg = require('./package');
    delete pkg.devDependencies;
    delete pkg.scripts;

    del('build/release').then(() => {
        src(['src/**/*.ts', '!src/mock/**/*']).pipe(tsProject()).js.pipe(dest('build/release'));
    });
};

async function dist() {
    var fs = require('fs');
    var pkg = require('./package');
    delete pkg.devDependencies;
    delete pkg.scripts;
    fs.writeFileSync('build/release/package.json', JSON.stringify(pkg, null, 2));
};

exports.compile_dist = compile_dist;
exports.dist = dist;

// async function clean() {
//   const del = require('del');
//   await del(['build/release']);
//   require('mkdirp')('build/release');
// }

// async function compile() {
//   const ts = require('gulp-typescript');
//   var tsProject = ts.createProject('./tsconfig.json');

//   await src(['src/**/*.ts']).pipe(tsProject()).js.pipe(dest('build/release'));
// }

// async function package() {
//   var fs = require('fs');
//   var pkg = require('./package');
//   delete pkg.devDependencies;
//   delete pkg.scripts;

//   fs.writeFileSync(
//     './build/release/package.json',
//     JSON.stringify(pkg, null, 2)
//   );
// }

// async function services() {
//   await src(['src/services/*']).pipe(dest('build/release'));
// }

// exports.clean = clean;
// exports.compile = compile;
// exports.build = series(compile, package, services);
