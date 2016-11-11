angular
    .module('oka.factorys.ws', [])
    .factory('$ws', function ($rootScope, $timeout){
        var connection;

        $rootScope.ws = {
            open: false
        };

        return {
            open: function (){
                console.log('open');

                connection = new WebSocket(OKASERVER_WS_URL);

                connection.onopen = function () {
                    $rootScope.ws.open = true;
                };

                connection.onerror = function (error) {
                    console.log(error);
                    $rootScope.ws.open = false;
                    $timeout(this.open, 2000);
                };

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
                        default:
                            console.log(data);
                    }
                };
            }
        }
    });