const PORT = 8080;

var http = require('http'),
    dispatcher = require('httpdispatcher');

function handleRequest(request, response){
    try {
        console.log(request.url);
        dispatcher.dispatch(request, response);
    } catch (err){
        console.error(err);
    }
}

dispatcher
    .onGet("/", function(request, respose) {
        respose.writeHead(200, {'Content-Type': 'text/plain'});
        respose.end('Page One');
    });

var server = http.createServer(handleRequest);
server.listen(PORT, function (){
    console.log("Server listening on: http://localhost:%s", PORT);
});