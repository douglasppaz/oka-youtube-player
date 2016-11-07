const OKASERVER_URL = 'http://localhost:8080/';
const OKASERVER_URL_API = OKASERVER_URL + 'api/';
const OKASERVER_URL_SOURCE = OKASERVER_URL + 'source/';
const GOOGLE_CONSOLE_KEY = 'AIzaSyARJZO9ibD-I4k138tE5tiFy_JU59tZu8Y';

angular
    .module('oka', [
        'ngSanitize',
        'com.2fdevs.videogular',
        'com.2fdevs.videogular.plugins.controls',
        'com.javiercejudo.videogular.plugins.autohide-cursor',
        'oka.NavBarCtrl',
        'oka.ConfigCtrl',
        'oka.directives.VideoCard'
    ])
    .run(function ($rootScope, $http, $timeout, $interval, $sce){
        $rootScope.karaoke = false;
        $rootScope.query = '';
        $rootScope.getQuery = function (){
            return $rootScope.karaoke ? 'karoke ' + $rootScope.query : $rootScope.query;
        };
        $rootScope.videos = [];
        $rootScope.updateVideos = function () {
            $http.get(OKASERVER_URL_API)
                .success(function (data) {
                    $rootScope.videos = data;
                })
                .error(function () {
                    $rootScope.videos = [];
                });
        };
        $rootScope.updateVideos();
        $interval($rootScope.updateVideos, 30 * 1000);

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
        $rootScope.playing = null;
        $rootScope.updatePlaying = function (callback){
            if($rootScope.playing_id) {
                $http.get(OKASERVER_URL_API + 'video/' + $rootScope.playing_id)
                    .success(function (data) {
                        $rootScope.playing = data;
                        if(callback !== undefined){
                            callback();
                        }
                    });
            }
        };
        $rootScope.$watch('playing_id', function (playing_id){
            $rootScope.playing = null;
            $rootScope.videos.forEach(function (video){
                if(video.id == playing_id){
                    $rootScope.playing = video;
                    return true;
                }
            });
            if(!$rootScope.playing && $rootScope.playing_id){
                $rootScope.updatePlaying($rootScope.updateVideos);
            }
        });
        $interval(function () {
            $rootScope.updatePlaying();
        }, 1000);

        $(window).keyup(function (e){
            if(e.keyCode == 27){
                $rootScope.playing_id = null;
                return false;
            }
        });

        $rootScope.sourceUrl = function (input){
            return $sce.trustAsResourceUrl(OKASERVER_URL_SOURCE + input);
        };
    })
    .filter('statusVerbose', function (){
        return function (input){
            switch (input){
                case 1:
                    return 'Baixando...';
                case 2:
                    return 'Disponível';
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