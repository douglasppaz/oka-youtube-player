angular
    .module('oka.factorys.ws', [])
    .factory('$ws', function ($rootScope, $timeout, $loading, $interval){
        var connection,
            loaded;

        $rootScope.ws = {
            on: false,
            open: false,
            opening: false
        };

        $rootScope.$watch('ws', function (val){
            if(val){
                if(val.open){
                    if(loaded){
                        loaded();
                        loaded = null;
                    }
                } else {
                    if(!loaded){
                        loaded = $loading.add('Conectando ao servidor...');
                    }
                }
            }
        }, true);

        function open(){
            $rootScope.ws.on = true;

            connection = new WebSocket(OKASERVER_WS_URL);
            $rootScope.ws.opening = true;

            connection.onopen = function (){
                $rootScope.ws.open = true;
                $rootScope.ws.opening = false;
                $rootScope.$apply('ws');
            };

            connection.onerror = function (error){
                $rootScope.ws.opening = false;
                $rootScope.$apply('ws');
                console.log(error);
            };

            connection.onclose = function (){
                $rootScope.ws.open = false;
                $rootScope.ws.opening = false;
                $rootScope.$apply('ws');
            };

            connection.onmessage = function (e){
                var data = e.data;
                try { data = JSON.parse(data); } catch (err) {}
                switch(data.act){
                    case 'updateVideoInstance':
                        for(var i = 0; i < $rootScope.videos.length; i++){
                            if($rootScope.videos[i].id == data.id){
                                $rootScope.videos[i][data.field] = data.value;
                                $rootScope.$apply('videos');
                                break;
                            }
                        }
                        break;
                    case 'updateVideos':
                        $rootScope.updateVideos();
                        break;
                    case 'reload':
                        location.reload();
                        break;
                    default:
                        console.log(data);
                }
            };
        }

        $interval(function (){
            if($rootScope.ws.on && !$rootScope.ws.open && !$rootScope.ws.opening){
                open();
            }
        }, 2000);

        return {
            open: open
        }
    });