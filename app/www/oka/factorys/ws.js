angular
    .module('oka.factorys.ws', [])
    .factory('$ws', function ($rootScope, $timeout){
        var connection,
            $ws;

        $rootScope.ws = {
            open: false
        };

        return {
            open: function (){
                function tryConnect(){
                    console.log('try open in 2 seconds');
                    $rootScope.ws.open = false;
                    $timeout($ws.open, 2000);
                }
                $ws = this;

                console.log('open');

                connection = new WebSocket(OKASERVER_WS_URL);

                connection.onopen = function () {
                    $rootScope.ws.open = true;
                };

                connection.onerror = function (error) {
                    console.log(error);
                    tryConnect();
                };

                connection.onclose = tryConnect;

                connection.onmessage = function (e) {
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
        }
    });