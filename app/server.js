const
    VERSION = '0.3.2',
    PORT = 8080,
    WS_PORT = 8081,
    FORMAT_LIST = {
        best: 'best[vcodec=avc1.64001F]/best',
        worst: 'worst[vcodec=avc1.64001F]/worst'
    };

var fs = require('fs'),
    youtubedl = require('youtube-dl'),
    flatfile = require('flat-file-db'),
    request = require('request'),
    connect = require('connect'),
    dispatch = require('dispatch'),
    serveStatic = require('serve-static'),
    bodyParser = require('body-parser'),
    ws = require('nodejs-websocket'),
    config,
    db,
    downloading = [],
    s,
    serving,
    ws_server;


// utils

function deleteFile(file){
    if(fs.existsSync(file)) fs.unlink(file);
}

function jsonResponse(res, obj){
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(obj));
}

function intVersion(version) {
    var version_split = version.split('.'),
        f = 0,
        base = 1;
    for(var i = version_split.length - 1; i >= 0; i--){
        var ii = version_split[i];
        base = base * 1000;
        f += parseInt(ii) * (base / Math.pow(10, ii.length));
    }
    return f;
}

function wsBroadcast(obj) {
    if(ws_server) {
        ws_server.connections.forEach(function (conn) {
            conn.sendText(JSON.stringify(obj));
        });
    }
}


// main

function updateVideoInstance(id, field, value){
    var instance = db.get(id);
    instance[field] = value;
    db.put(id, instance);
    wsBroadcast({
        act: 'updateVideoInstance',
        id: id,
        field: field,
        value: value
    })
}

function downloadThumbnailById(id){
    downloadThumbnail(db.get(id));
}

function downloadThumbnail(instance){
    if(instance.thumbnail_file == null && instance.thumbnail != null){
        var thumbnail_filename = instance.id + '.jpg',
            thumbnail_filepath = config.get('sourcePath') + thumbnail_filename;
        request(instance.thumbnail)
            .pipe(fs.createWriteStream(thumbnail_filepath))
            .on('close', function (){
                updateVideoInstance(instance.id, 'thumbnail_file', thumbnail_filepath);
                updateVideoInstance(instance.id, 'thumbnail_filename', thumbnail_filename);
            });
    }
}

function downloadVideo(id){
    console.log('start download ' + id);
    downloading.push(id);

    updateVideoInstance(id, 'status', 1);
    updateVideoInstance(id, 'percent', 0);

    var video = youtubedl(
            'http://www.youtube.com/watch?v=' + id,
            ['--format='+FORMAT_LIST[config.get('format')]],
            {
                cwd: config.get('sourcePath'),
                maxBuffer: Infinity
            }
        ),
        filename = id + '.mp4',
        filepath = config.get('sourcePath') + filename,
        pos = 0;

    video.on('info', function (info){
        updateVideoInstance(id, 'title', info.title);
        updateVideoInstance(id, 'size', info.size);
        updateVideoInstance(id, 'thumbnail', info.thumbnail);
        downloadThumbnailById(id);
    });
    video.on('error', function (err){
        updateVideoInstance(id, 'status', -err.code)
    });
    video.on('data', function data(chunk) {
        pos += chunk.length;
        var instance = db.get(id),
            size = instance.size;
        if(size){
            var percent = (pos / size * 100).toFixed(2);
            if(percent - instance.percent > 2 || percent == 100) {
                updateVideoInstance(id, 'percent', parseInt(percent));
                console.log(id + ': ' + percent + '%');
            }
        }
    });
    video.on('end', function () {
        updateVideoInstance(id, 'status', 2);
    });

    video.pipe(fs.createWriteStream(filepath));

    updateVideoInstance(id, 'file', filepath);
    updateVideoInstance(id, 'filename', filename);
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
        wsBroadcast({
            act: 'updateVideos'
        });
    }

    if(instance.status == 0){
        downloadVideo(id);
    }
    if(instance.status == 1 && downloading.indexOf(id) == -1){
        downloadVideo(id);
    }
    downloadThumbnail(instance);

    return instance;
}


// start or update http server

function updateOrStartServer(){
    if(serving){ serving.close(); }

    s = connect();

    // API middleware
    s.use('/api', function (req, res, next){
        console.log('API', req.method, req.url);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET');
        res.setHeader('Access-Control-Allow-Headers', '*');
        next();
    });

    s.use('/api', bodyParser.urlencoded({
        extended: true
    }));

    s.use('/api', bodyParser.json());

    s.use('/api', dispatch({
        '/': function (req, res, next){
            var videos = [];
            db.keys().forEach(function (key){
                if(key != 'dbVersion') videos.push(db.get(key));
            });
            jsonResponse(res, videos);
        },
        '/config/': {
            GET: function (req, res, next){
                jsonResponse(res, {
                    format: config.get('format'),
                    sourcePath: config.get('sourcePath')
                })
            },
            POST: function (req, res, next){
                var format = req.body.format,
                    sourcePath = req.body.sourcePath;
                config.put('format', format);
                if(config.get('sourcePath') != sourcePath) {
                    config.put('sourcePath', sourcePath);
                    wsBroadcast({
                        act: 'reload'
                    });
                    reloadConfig();
                }
                jsonResponse(res, true);
            }
        },
        '/clear/': function (req, res, next){
            db.keys().forEach(function (key){
                deleteFile(db.get(key).file);
                deleteFile(db.get(key).thumbnail_file);
            });
            db.clear();
            config.clear();
            loadConfigs();
            jsonResponse(res, true);
        },
        '/video/:id': {
            '/': function (req, res, next, id){
                jsonResponse(res, loadVideo(id));
            },
            '/update/': function (req, res, next, id){
                updateVideoInstance(id, 'status', 3);
                downloadVideo(id);
                jsonResponse(res, true);
            },
            '/delete/': function (req, res, next, id){
                deleteFile(db.get(id).file);
                deleteFile(db.get(id).thumbnail_file);
                db.del(id);
                jsonResponse(res, true);
            }
        }
    }));

    // SOURCE MIDDLEWARE
    s.use('/source', function (req, res, next){
        res.setHeader('Content-Disposition', 'attachment; filename=' + req.url.substr(1));
        res.setHeader('Cache-Control', 'public');
        next();
    });

    // SOURCE
    s.use('/source', serveStatic(config.get('sourcePath')));

    // WWW
    s.use(serveStatic(__dirname + '/www/'));

    serving = s.listen(PORT);

    serving.on('error', function (e) {
        switch(e.code){
            case 'EADDRINUSE':
                console.log('port ' + PORT + ' busy, trying start server again in 2 seconds');
                setTimeout(updateOrStartServer, 2000);
                break;
            default:
                console.log(e);
        }
    });
}

// start or update ws

function updateOrStartWs() {
    if(ws_server){ ws_server.close(); }

    ws_server = ws.createServer(function (conn){
        conn.on('text', function (str) {});
    });

    ws_server.listen(WS_PORT);

    ws_server.on('error', function (e) {
        switch(e.code){
            case 'EADDRINUSE':
                console.log('port ' + WS_PORT + ' busy, trying start server again in 2 seconds');
                setTimeout(updateOrStartWs, 2000);
                break;
            default:
                console.log(e);
        }
    });
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
        console.log('config db migrate...');
    }

    defaultConfig('sourcePath', process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'] + '/oka/');
    console.log('source path: ' + config.get('sourcePath'));

    db = flatfile(config.get('sourcePath') + 'oka.db');
    db.on('open', function() {
        console.log('database ready!');
        if(db.get('dbVersion') === undefined) { db.put('dbVersion', VERSION); }

        if(db.get('dbVersion') !== VERSION){
            console.log('db migrate...');
        }

        db.keys().forEach(function (id){
            if(db.get(id).status == 1){
                downloadVideo(id);
            }
        });
    });

    defaultConfig('format', 'best');

    updateOrStartServer();
}

function reloadConfig(){
    config = flatfile(__dirname + '/oka.config.db');

    config.on('open', function() {
        console.log('config loaded!');

        loadConfigs();

        updateOrStartWs();
    });
}

reloadConfig();