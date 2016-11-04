var gulp = require('gulp');

gulp.task('components', function() {
    console.log('copying components');
    gulp.src([
        'components/bootstrap/dist/css/bootstrap.min.css',
        'components/videogular-themes-default/videogular.min.css',
        'components/jquery/dist/jquery.min.js',
        'components/bootstrap/dist/js/bootstrap.min.js',
        'components/angular/angular.min.js',
        'components/angular-sanitize/angular-sanitize.min.js',
        'components/videogular/videogular.min.js',
        'components/videogular-controls/vg-controls.min.js',
        'components/ng-debounce/angular-debounce.js',
        'components/videogular-autohide-cursor/hide-cursor.js'
    ]).pipe(gulp.dest('app/www/components'));
    console.log('copying bootstrap fonts');
    gulp.src([
        'components/bootstrap/fonts/**'
    ]).pipe(gulp.dest('app/www/fonts'));
    console.log('copying videogular-themes-default fonts');
    gulp.src([
        'components/videogular-themes-default/fonts/**'
    ]).pipe(gulp.dest('app/www/components/fonts'));
});
gulp.task('default', ['components']);