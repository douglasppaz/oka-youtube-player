const
    PORT = 8080,
    DOWNLOAD_DIR = __dirname + '/videos/';

var http = require('http'),
    dispatcher = require('httpdispatcher'),
    fs = require('fs'),
    youtubedl = require('youtube-dl'),
    flatfile = require('flat-file-db'),
    db = flatfile('./oka.db'),
    downloading = {};

db.on('open', function() {
    console.log('database ready!');
});

function handleRequest(request, response){
    try {
        console.log(request.url);
        dispatcher.dispatch(request, response);
    } catch (err){
        console.error(err);
    }
}

function downloadVideo(id){
    var video = youtubedl(
        'http://www.youtube.com/watch?v=' + id,
        ['--format=18'],
        {
            cwd: DOWNLOAD_DIR,
            maxBuffer: Infinity
        }
    ),
        filepath = DOWNLOAD_DIR + id + '.mp4';

    video.on('info', function(info) {
        console.log('Download started');
        console.log('filename: ' + info._filename);
        console.log('size: ' + info.size);
    });

    video.pipe(fs.createWriteStream(filepath));
    var instance = db.get(id);
    instance.file = filepath;
    db.put(id, instance);

    downloading[id] = true;

    video.on('end', function() {
        var instance = db.get(id);
        instance.status = 2;
        db.put(id, instance);
    });
}

function loadVideo(id){
    var instance = db.get(id);
    if(instance === undefined){
        db.put(id, {
            title: null,
            status: 0,
            file: null
        });
        instance = db.get(id);
    }

    if(instance.status == 0){
        downloadVideo(id);
        instance.status = 1;
        db.put(id, instance);
    }
    if(instance.status == 1){
        if(downloading[id] === undefined || !downloading){
            downloadVideo(id);
        }
    }

    return instance;
}

dispatcher
    .onGet('/', function(request, response) {
        response.writeHead(200, {'Content-Type': 'text/plain'});
        response.end('Index');
    });
dispatcher
    .onError(function(request, response) {
        var id = request.url.substring(1);
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify(loadVideo(id)));
    });

var server = http.createServer(handleRequest);
server.listen(PORT, function (){
    console.log("Server listening on: http://localhost:%s", PORT);
});