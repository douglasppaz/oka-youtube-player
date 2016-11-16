angular
    .module('oka.factorys.loading', [])
    .factory('$loading', function ($rootScope){
        var loading_count = -1;

        $rootScope.loading = {
            val: -1,
            order: [],
            msgs: {},
            msg: function (){
                if(this.val == -1) return null;
                return this.msgs[this.order[this.val]];
            }
        };

        return {
            add: function (msg){
                if(msg === undefined) msg = null;

                $rootScope.loading.val++;
                var msgs_index = loading_count++;

                $rootScope.loading.msgs[msgs_index] = msg;
                $rootScope.loading.order.push(msgs_index);

                return function (){
                    $rootScope.loading.val--;
                    delete $rootScope.loading.msgs[msgs_index];
                    $rootScope.loading.order.splice($rootScope.loading.order.indexOf(msgs_index), 1);
                };
            }
        }
    });