angular
    .module('oka.ConfigCtrl', [])
    .controller('ConfigCtrl', function ($scope, $http){
        $scope.config = {};
        $scope.sourcePath = '';

        $http.get(OKASERVER_URL_API + 'config/')
            .success(function (data){
                $scope.config = data;
                $scope.sourcePath = data.sourcePath;
            });

        $scope.clear = function (){
            if(confirm('Você tem certeza que deseja apagar todas as informações?')){
                $http.get(OKASERVER_URL_API + 'clear/')
                    .success(function (){
                        location.reload();
                    })
                    .error(function (){
                        alert('Algo não esperado aconteceu :(');
                    });
            }
        };

        $scope.updateConfig = function (){
            $scope.config.sourcePath = $scope.sourcePath;
            $http({
                url: OKASERVER_URL_API + 'config/',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                method: 'post',
                data: $.param($scope.config)
            });
        };

        $scope.$watch('config', function (val, oldVal){
            if(Object.keys(oldVal).length > 0){
                $scope.updateConfig();
            }
        }, true);
    });