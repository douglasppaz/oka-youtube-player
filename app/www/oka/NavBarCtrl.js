angular
    .module('oka.NavBarCtrl', [])
    .controller('NavBarCtrl', function ($rootScope, $scope){
        $scope.forceSearch = function (){
            $rootScope.doYtSearch();
        }
    });