const {app, BrowserWindow} = require('electron');

var server = require('./server');
let win;

function createWindow(){
    win = new BrowserWindow({
        title: 'OKa',
        width: 800,
        height: 600,
        minWidth: 300,
        minHeight: 300,
        icon: __dirname + '/icon.png'
    });
    win.setMenu(null);
    win.loadURL('file://' + __dirname + '/www/index.html');
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