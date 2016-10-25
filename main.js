const {app, BrowserWindow} = require('electron');

var server = require('./server');
let win;

function createWindow(){
    win = new BrowserWindow({
        width: 720,
        height: 480,
        fullscreen: true
    });
    win.setMenu(null);
    win.loadURL('file://' + __dirname + '/www/index.html');
    // win.webContents.openDevTools();
    win.on('closed', function (){
        win = null;
    });
}

app.on('ready', createWindow);
app.on('window-all-closed', function (){
    if(process.platform !== 'darwin'){
        app.quit();
    }
});

app.on('activate', function (){
    if(win === null){
        createWindow();
    }
});