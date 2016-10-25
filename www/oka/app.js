const OKASERVER_URL = 'http://localhost:8080/';

angular
    .module('oka', [
        'oka.NavBarCtrl'
    ])
    .run(function ($rootScope, $http){
        $rootScope.close = function (){
            window.close();
        };

        $rootScope.karaoke = false;
        $rootScope.query = '';
        $rootScope.getQuery = function (){
            return $rootScope.karaoke ? 'karoke ' + $rootScope.query : $rootScope.query;
        };
        $rootScope.videos = [];
        $http.get(OKASERVER_URL)
            .success(function (data){
                $rootScope.videos = data;
            })
            .error(function (){
                $rootScope.videos = [];
            });
    })
    .filter('statusVerbose', function (){
        return function (input){
            switch (input){
                case 2:
                    return 'Disponível';
                default:
                    return 'Status #' + input;
            }
        }
    })
    .filter('staticUrl', function (){
        return function (input){
            return OKASERVER_URL + 'get/' + input;
        }
    });