const gulp = require('gulp');
const sass = require('gulp-sass');
const cleanCSS = require('gulp-clean-css');
const htmlmin = require('gulp-htmlmin');
const pump = require('pump');
const babel = require('gulp-babel');
const uglify = require('gulp-uglify');
const rename = require('gulp-rename');
const imagemin = require('gulp-imagemin');
const imageminJpegRecompress = require('imagemin-jpeg-recompress');
const imageminPngquant = require('imagemin-pngquant');
const wbBuild = require('workbox-build');
const zopfli = require("gulp-zopfli");
const replace = require('gulp-replace');
const fs = require('fs');
const runSequence = require('run-sequence');
const cssBase64 = require('gulp-css-base64');
const rev = require('gulp-rev');
const revReplace = require('gulp-rev-replace');

const uglifyCompressOptions = {
  properties: true,
  dead_code: true,
  drop_debugger: true,
  unsafe: true,
  conditionals: true,
  loops: true,
  unused: true,
  toplevel: true,
  inline: true,
  // drop_console: true,
  passes: 2
}

const uglifyMangleOptions = {
  toplevel: true
}

const uglifyOutputOptions = {
  beautify: false
}

const criticalCssPattern = /<link rel="stylesheet" href="(.*critical.*)">/g
const replaceCssFileWithStyleElement = (s, filename) => {
  const realFilename = 'app/' + filename
  const criticalStyles = fs.readFileSync(realFilename, 'utf8')
  const inlineStyles = '<style>' + criticalStyles + '</style>'

  return inlineStyles
}

const revManifest = gulp.src("rev-manifest.json");

gulp.task('html', () =>
  gulp.src('src/*.html')
    .pipe(replace(criticalCssPattern, replaceCssFileWithStyleElement))
    .pipe(htmlmin({
      collapseWhitespace: true,
      removeComments: true,
      minifyCSS: true
    }))
    .pipe(gulp.dest('app/')));

gulp.task('css', () =>
  gulp.src('src/css/*.scss')
    .pipe(sass())
    // .pipe(cssBase64({
    //   baseDir: "app"
    // }))
    .pipe(cleanCSS())
    .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest('app/build/'))
    .pipe(rev())
    .pipe(gulp.dest('app/build/'))
);

gulp.task('js', function(cb){
  pump([
    gulp.src('src/js/*.js'),
    babel({presets: 'es2015'}),
    uglify({
      compress: uglifyCompressOptions,
      mangle: uglifyMangleOptions,
      output: uglifyOutputOptions
    }),
    rename({suffix: '.min'}),
    gulp.dest('app/build/')
  ], cb)
});

gulp.task('images', () =>
	gulp.src('src/images/*')
		.pipe(imagemin([
      imagemin.svgo(),
      imageminJpegRecompress({
        method: 'smallfry'
      }),
      imageminPngquant()
    ]))
		.pipe(gulp.dest('app/images/'))
);

gulp.task('fonts', () =>
  gulp.src("src/fonts/*/*.*tf")
    .pipe(gulp.dest("app/fonts/"))
)

gulp.task('bundle-sw', () => 
  wbBuild.generateSW({
    globDirectory: './app/',
    swDest: './app/sw.js'
  })
  .then(() => console.log("Service Worker generated."))
  .catch(err => console.log("An error occured: ", err))
)

gulp.task('manifest', () => {
  gulp.src("src/manifest.json")
    .pipe(gulp.dest("app"))
})

gulp.task('default', cb => {
  runSequence('css', [ 'js', 'html', 'images', 'fonts' ], ['rev-replace', 'manifest'], 'bundle-sw', cb)
});

gulp.task("rev-replace", function(){
  return gulp.src("app/index.html")
    .pipe(revReplace({manifest: revManifest}))
    .pipe(gulp.dest("app/"));
});

gulp.task('watch', function() {
  gulp.watch('src/*.html', [ 'html' ]);
  gulp.watch('src/css/*.scss', [ 'css' ]);
  gulp.watch('src/js/*.js', [ 'js' ]);
  gulp.watch('src/images/*', [ 'images' ]);
  gulp.watch('src/fonts/*/*.*tf', [ 'fonts' ]);
  gulp.watch('src/*', [ 'rev-replace', 'bundle-sw' ])
})