angular
    .module('oka.ConfigCtrl', [])
    .controller('ConfigCtrl', function ($scope, $http){
        $scope.config = {};

        $http.get(OKASERVER_URL + 'config')
            .success(function (data){
                $scope.config = data;
            });

        $scope.$watch('config', function (val, oldVal){
            if(Object.keys(oldVal).length > 0){
                $http.post(OKASERVER_URL + 'config', val)
                    .success(function (data){
                        console.log(data);
                    });
            }
        }, true);

        $scope.clear = function (){
            if(confirm('Você tem certeza que deseja apagar todas as informações?')){
                $http.get(OKASERVER_URL + 'clear')
                    .success(function (){
                        location.reload();
                    })
                    .error(function (){
                        alert('Algo não esperado aconteceu :(');
                    });
            }
        };
    });