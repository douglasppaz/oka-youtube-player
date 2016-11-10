angular
    .module('oka.directives.videoCard', [])
    .controller('videoCardCtrl', function ($scope, $http, $window){
        $scope.updateVideo = function (){
            if($window.confirm('Tem certeza que deseja baixar novamente esse vídeo?')){
                $http.get(OKASERVER_URL_API + 'video/' + $scope.video.id + '/update/');
            }
        };
        $scope.deleteVideo = function (){
            if($window.confirm('Tem certeza que deseja deletar esse vídeo?')){
                $http.get(OKASERVER_URL_API + 'video/' + $scope.video.id + '/delete/');
            }
        };
    })
    .directive('videoCard', function (){
        return {
            templateUrl: 'oka/directives/templates/video-card.html',
            scope: {
                video: '=videoCard'
            },
            controller: 'videoCardCtrl'
        }
    });