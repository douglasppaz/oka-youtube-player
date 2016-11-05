const
    VERSION = '0.3.1',
    PORT = 8080,
    SOURCE_PORT = 8081;

var http = require('http'),
    dispatcher = require('httpdispatcher'),
    fs = require('fs'),
    youtubedl = require('youtube-dl'),
    flatfile = require('flat-file-db'),
    request = require('request'),
    connect = require('connect'),
    serveStatic = require('serve-static'),
    config = flatfile(__dirname + '/oka.config.db'),
    db,
    sourcePath,
    downloading = [];


// utils
function deleteFile(file){
    if(fs.existsSync(file)) fs.unlink(file);
}


// main

function updateVideoIntance(id, field, value){
    var instance = db.get(id);
    instance[field] = value;
    db.put(id, instance);
}

function downloadThumbnailById(id){
    downloadThumbnail(db.get(id));
}

function downloadThumbnail(instance){
    if(instance.thumbnail_file == null && instance.thumbnail != null){
        var thumbnail_filename = instance.id + '.jpg',
            thumbnail_filepath = sourcePath + thumbnail_filename;
        request(instance.thumbnail)
            .pipe(fs.createWriteStream(thumbnail_filepath))
            .on('close', function (){
                updateVideoIntance(instance.id, 'thumbnail_file', thumbnail_filepath);
                updateVideoIntance(instance.id, 'thumbnail_filename', thumbnail_filename);
            });
    }
}

function downloadVideo(id){
    var video = youtubedl(
            'http://www.youtube.com/watch?v=' + id,
            ['--format=18'],
            {
                cwd: sourcePath,
                maxBuffer: Infinity
            }
        ),
        filename = id + '.mp4',
        filepath = sourcePath + filename,
        pos = 0;

    video.on('info', function (info){
        updateVideoIntance(id, 'title', info.title);
        updateVideoIntance(id, 'size', info.size);
        updateVideoIntance(id, 'thumbnail', info.thumbnail);
        downloadThumbnailById(id);
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
            if(percent - instance.percent > 2 || percent == 100) {
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
    updateVideoIntance(id, 'filename', filename);

    downloading.push(id);
}

function loadVideo(id){
    var instance = db.get(id);
    if(instance === undefined){
        db.put(id, {
            id: id,
            title: null,
            status: 0,
            file: null,
            filename: null,
            size: 0,
            percent: 0,
            thumbnail: null,
            thumbnail_file: null,
            thumbnail_filename: null
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
    downloadThumbnail(instance);

    return instance;
}


// http server

function r404(request, response) {
    response.writeHead(404);
    response.end('404');
}

dispatcher
    .onGet('/', function(request, response) {
        response.writeHead(200, {'Content-Type': 'application/json'});
        var videos = [];
        db.keys().forEach(function (key){
            videos.push(db.get(key));
        });
        response.end(JSON.stringify(videos));
    });
dispatcher
    .onGet('/clear', function(request, response) {
        db.keys().forEach(function (key){
            deleteFile(db.get(key).file);
            deleteFile(db.get(key).thumbnail_file);
        });
        db.clear();
        response.end(JSON.stringify(true));
    });
dispatcher.onGet('/favicon.ico', r404);
dispatcher
    .onError(function(request, response) {
        var id = request.url.substring(1);
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify(loadVideo(id)));
    });

function handleRequest(request, response){
    try {
        console.log(request.url);
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', '*');
        response.setHeader('Access-Control-Allow-Headers', '*');
        dispatcher.dispatch(request, response);
    } catch (err){
        console.error(err);
    }
}


// config

function defaultConfig(index, val){
    if(config.get(index) === undefined) { config.put(index, val); }
    return config.get(index);
}

function loadConfigs(){
    defaultConfig('dbVersion', VERSION);
    console.log('db version: ' + config.get('dbVersion'));

    if(config.get('dbVersion') != VERSION){
        console.log('db migrate...');
    }

    sourcePath = defaultConfig('sourcePath', process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'] + '/oka/');
    console.log('source path: ' + sourcePath);

    db = flatfile(sourcePath + 'oka.db');
    db.on('open', function() { console.log('database ready!'); });

    connect().use(serveStatic(sourcePath)).listen(SOURCE_PORT);
}

config.on('open', function() {
    console.log('config loaded!');
    loadConfigs();
});


// start http server

var server = http.createServer(handleRequest);
server.listen(PORT, function (){
    console.log('Server listening on: http://localhost:%s', PORT);
});