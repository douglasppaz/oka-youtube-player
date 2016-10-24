const
    PORT = 8080,
    DOWNLOAD_DIR = __dirname + '/videos/';

var http = require('http'),
    dispatcher = require('httpdispatcher'),
    fs = require('fs'),
    youtubedl = require('youtube-dl');

function handleRequest(request, response){
    try {
        console.log(request.url);
        dispatcher.dispatch(request, response);
    } catch (err){
        console.error(err);
    }
}

function loadVideo(id){
    var video = youtubedl(
        'http://www.youtube.com/watch?v=' + id,
        ['--format=18'],
        {
            cwd: DOWNLOAD_DIR,
            maxBuffer: Infinity
        }
    );

    video.on('info', function(info) {
        console.log('Download started');
        console.log('filename: ' + info.filename);
        console.log('size: ' + info.size);
    });

    video.pipe(fs.createWriteStream(DOWNLOAD_DIR + id + '.mp4'));

    return {};
}

dispatcher
    .onGet('/', function(request, respose) {
        respose.writeHead(200, {'Content-Type': 'text/plain'});
        respose.end('Index');
    });
dispatcher
    .onError(function(request, respose) {
        var id = request.url.substring(1);
        loadVideo(id);
        respose.end(id);
    });

var server = http.createServer(handleRequest);
server.listen(PORT, function (){
    console.log("Server listening on: http://localhost:%s", PORT);
});