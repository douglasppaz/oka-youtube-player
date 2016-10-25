const OKASERVER_URL = 'http://localhost:8080/';
const GOOGLE_CONSOLE_KEY = 'AIzaSyARJZO9ibD-I4k138tE5tiFy_JU59tZu8Y';

angular
    .module('oka', [
        'oka.NavBarCtrl'
    ])
    .run(function ($rootScope, $http, $timeout){
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

        $rootScope.ytsearch = [];
        $rootScope.ytsearch_url = null;
        $rootScope.doYtSearch = function (){
            $rootScope.ytsearch_url = 'https://www.googleapis.com/youtube/v3/search?key=' + GOOGLE_CONSOLE_KEY + '&part=snippet&q=' + $rootScope.getQuery()
            $http.get($rootScope.ytsearch_url)
                .success(function (data){
                    $rootScope.ytsearch = data.items;
                })
                .error(function (){
                    $rootScope.ytsearch = [];
                });
        };

        var tempSearchText = '',
            searchTextTimeout;

        function queryChange(val) {
            tempSearchText = $rootScope.getQuery();

            if(searchTextTimeout || tempSearchText.length == 0){
                $timeout.cancel(searchTextTimeout);
            }
            if(tempSearchText.length > 0) {
                searchTextTimeout = $timeout(function () {
                    $rootScope.doYtSearch(tempSearchText);
                }, 500);
            } else {
                $rootScope.ytsearch = [];
            }
        }

        $rootScope.$watch('karaoke', queryChange);
        $rootScope.$watch('query', queryChange);
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