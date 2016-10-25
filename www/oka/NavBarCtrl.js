angular
    .module('oka.NavBarCtrl', [])
    .controller('NavBarCtrl', function ($scope){
        $scope.forceSearch = function (){
            console.log($scope.query, $scope.karaoke);
        }
    });