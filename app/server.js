const
    VERSION = '0.3.2',
    PORT = 8080,
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
    config = flatfile(__dirname + '/oka.config.db'),
    db,
    downloading = [],
    s,
    serving;


// utils

function deleteFile(file){
    if(fs.existsSync(file)) fs.unlink(file);
}

function jsonResponse(res, obj){
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(obj));
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
            thumbnail_filepath = config.get('sourcePath') + thumbnail_filename;
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
        updateVideoIntance(id, 'title', info.title);
        updateVideoIntance(id, 'size', info.size);
        updateVideoIntance(id, 'percent', 0);
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


// start or update http server

function updateServer(){
    if(serving){ serving.close(); }

    s = connect();

    // API middleware
    s.use('/api', function (req, res, next){
        console.log(req.method, req.url);
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
                videos.push(db.get(key));
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
                config.put('sourcePath', sourcePath);
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
        '/video/:id': function (req, res, next, id){
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(loadVideo(id)));
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

    serving = s.listen(PORT);
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

    defaultConfig('sourcePath', process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'] + '/oka/');
    console.log('source path: ' + config.get('sourcePath'));

    db = flatfile(config.get('sourcePath') + 'oka.db');
    db.on('open', function() { console.log('database ready!'); });

    defaultConfig('format', 'best');

    updateServer();
}

config.on('open', function() {
    console.log('config loaded!');
    loadConfigs();
});