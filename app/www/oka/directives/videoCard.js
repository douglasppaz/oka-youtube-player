angular
    .module('oka.directives.videoCard', [])
    .directive('videoCard', function (){
        return {
            templateUrl: 'oka/directives/templates/video-card.html',
            scope: {
                video: '=videoCard'
            }
        }
    });