angular
    .module('oka.directives.VideoCard', [])
    .directive('videoCard', function (){
        return {
            templateUrl: 'oka/directives/templates/video-card.html',
            scope: {
                video: '=videoCard'
            }
        }
    });