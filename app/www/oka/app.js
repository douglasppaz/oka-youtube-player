const OKASERVER_URL = '/';
const OKASERVER_URL_API = OKASERVER_URL + 'api/';
const OKASERVER_URL_SOURCE = OKASERVER_URL + 'source/';
const OKASERVER_WS_URL = 'ws://' + window.location.hostname + ':8081/';
const GOOGLE_CONSOLE_KEY = 'AIzaSyARJZO9ibD-I4k138tE5tiFy_JU59tZu8Y';

angular
    .module('oka', [
        'ngSanitize',
        'com.2fdevs.videogular',
        'com.2fdevs.videogular.plugins.controls',
        'com.javiercejudo.videogular.plugins.autohide-cursor',
        'oka.NavBarCtrl',
        'oka.ConfigCtrl',
        'oka.directives.videoCard',
        'oka.factorys.ws',
        'oka.factorys.loading'
    ])
    .run(function ($rootScope, $http, $timeout, $sce, $ws){
        $rootScope.karaoke = false;
        $rootScope.query = '';
        $rootScope.getQuery = function (){
            return $rootScope.karaoke ? 'karoke ' + $rootScope.query : $rootScope.query;
        };
        $rootScope.videos = [];
        $rootScope.updateVideos = function (callback) {
            $http.get(OKASERVER_URL_API)
                .success(function (data) {
                    $rootScope.videos = data;
                    if(typeof callback === 'function') callback();
                })
                .error(function () {
                    $rootScope.videos = [];
                });
        };
        $rootScope.updateVideos();

        $rootScope.ytsearch = [];
        $rootScope.ytsearch_url = null;
        $rootScope.ytsearch_nextPageToken = null;
        $rootScope.ytsearch_loadingnext = false;
        $rootScope.doYtSearch = function (){
            $rootScope.ytsearch_url = 'https://www.googleapis.com/youtube/v3/search?key=' + GOOGLE_CONSOLE_KEY + '&part=snippet&type=video&q=' + $rootScope.getQuery();
            $http.get($rootScope.ytsearch_url)
                .success(function (data){
                    $rootScope.ytsearch = data.items;
                    $rootScope.ytsearch_nextPageToken = data.nextPageToken;
                })
                .error(function (){
                    $rootScope.ytsearch = [];
                });
        };
        $rootScope.ytsearch_loadMore = function (){
            if($rootScope.ytsearch_nextPageToken && !$rootScope.ytsearch_loadingnext){
                $rootScope.ytsearch_loadingnext = true;
                $http.get($rootScope.ytsearch_url + '&pageToken=' + $rootScope.ytsearch_nextPageToken)
                    .success(function (data){
                        data.items.forEach(function (item){
                            $rootScope.ytsearch.push(item);
                        });
                        $rootScope.ytsearch_nextPageToken = data.nextPageToken;
                        $rootScope.ytsearch_loadingnext = false;
                    })
                    .error(function (){
                        $rootScope.ytsearch_loadingnext = false;
                    });
            }
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
                $rootScope.ytsearch_nextPageToken = null;
                $rootScope.ytsearch_loadingnext = false;
            }
        }

        $rootScope.$watch('karaoke', queryChange);
        $rootScope.$watch('query', queryChange);

        $rootScope.playing_id = null;
        $rootScope.playing = function (){
            for(var i = 0; i < $rootScope.videos.length; i++){
                if($rootScope.videos[i].id == $rootScope.playing_id){
                    return $rootScope.videos[i];
                }
            }
            return false;
        };
        $rootScope.$watch('playing_id', function (val){
            if(val){
                $http.get(OKASERVER_URL_API + 'video/' + val + '/');
            }
        });

        $(window).keyup(function (e){
            if(e.keyCode == 27){
                $rootScope.playing_id = null;
                $rootScope.$apply('playing_id');
                return false;
            }
        });

        $rootScope.sourceUrl = function (input){
            return $sce.trustAsResourceUrl(OKASERVER_URL_SOURCE + input);
        };

        $ws.open();
    })
    .filter('statusVerbose', function (){
        return function (input){
            switch (input){
                case 1:
                    return 'Baixando...';
                case 2:
                    return 'Disponível';
                case 3:
                    return 'Para atualizar...';
                default:
                    return 'Status #' + input;
            }
        }
    })
    .filter('sourceUrl', function ($rootScope){
        return function (input){
            return $rootScope.sourceUrl(input);
        }
    });