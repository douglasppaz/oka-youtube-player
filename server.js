const
    PORT = 8080,
    DOWNLOAD_DIR = __dirname + '/videos/';

var http = require('http'),
    dispatcher = require('httpdispatcher'),
    fs = require('fs'),
    youtubedl = require('youtube-dl'),
    flatfile = require('flat-file-db'),
    request = require('request'),
    db = flatfile('./oka.db'),
    downloading = [];

db.on('open', function() {
    console.log('database ready!');
    db.keys().forEach(function (key){
        console.log(key);
    });
});

function updateVideoIntance(id, field, value){
    var instance = db.get(id);
    instance[field] = value;
    db.put(id, instance);
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
        filepath = DOWNLOAD_DIR + id + '.mp4',
        pos = 0;

    video.on('info', function (info){
        updateVideoIntance(id, 'title', info.title);
        updateVideoIntance(id, 'size', info.size);
        updateVideoIntance(id, 'thumbnail', info.thumbnail);
        console.log(info.thumbnail);
    });
    video.on('error', function (err){
        updateVideoIntance(id, 'status', -err.code)
    });
    video.on('data', function data(chunk) {
        pos += chunk.length;
        var instance = db.get(id),
            size = instance.size;
        if(size){
            var percent = (pos / size * 100).toFixed(2);
            if(percent - instance.percent > 10 || percent == 100) {
                updateVideoIntance(id, 'percent', parseInt(percent));
                console.log(id + ': ' + percent + '%');
            }
        }
    });
    video.on('end', function () {
        updateVideoIntance(id, 'status', 2);
    });

    video.pipe(fs.createWriteStream(filepath));

    updateVideoIntance(id, 'file', filepath);

    downloading.push(id);
}

function loadVideo(id){
    var instance = db.get(id);
    if(instance === undefined){
        db.put(id, {
            title: null,
            status: 0,
            file: null,
            size: 0,
            percent: 0,
            thumbnail: null,
            thumbnail_file: null
        });
        instance = db.get(id);
    }

    if(instance.status == 0){
        downloadVideo(id);
        updateVideoIntance(id, 'status', 1);
    }
    if(instance.status == 1 && downloading.indexOf(id) == -1){
        downloadVideo(id);
    }
    if(instance.thumbnail_file == null && instance.thumbnail != null){
        var thumbnail_filepath = DOWNLOAD_DIR + id + '.jpg';
        request(instance.thumbnail)
            .pipe(fs.createWriteStream(thumbnail_filepath))
            .on('close', function (){
                updateVideoIntance(id, 'thumbnail_file', thumbnail_filepath);
            });
    }

    return instance;
}

dispatcher
    .onGet('/', function(request, response) {
        response.writeHead(200, {'Content-Type': 'text/plain'});
        response.end('Index');
    });
// dispatcher
//     .onError(function(request, response) {
//         var id = request.url.substring(1);
//         response.writeHead(200, {'Content-Type': 'application/json'});
//         response.end(JSON.stringify(loadVideo(id)));
//     });

function handleRequest(request, response){
    try {
        console.log(request.url);
        dispatcher.dispatch(request, response);
    } catch (err){
        console.error(err);
    }
}

var server = http.createServer(handleRequest);
server.listen(PORT, function (){
    console.log("Server listening on: http://localhost:%s", PORT);
});