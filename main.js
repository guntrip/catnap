'use strict';

const electron = require('electron');
const ipc = require('ipc');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const Menu = electron.Menu;
const Tray = electron.Tray;

var electronScreen = null;
var appIcon = null;
var checkProcess = null, napProcess = null;

global.naptrack = {
  tracking: {
    mouse: true,
    windows: true
  },
  mouse: {
    current: {x:0, y:0},
    last: {x:0, y:0}
  },
  windows: {
    current: [],
    last: []
  },
  settings: {
    interval: 1, // 60 seconds, change for debug only
    nap: 60, // minutes
    duration: 5 // minutes
  },
  clock: 0, // minutes
  intervalIncrease: 1, // clock increases
  napClock: 0, // tracks time spend in nap
  enabled:true,
  napping: false, // presently napping?
  catInUse:'1',
  a:false
};


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let napWindow;

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 460,
                                  height: 240,
                                  maximizable:false,
                                  minimizable: true,
                                  closable: true,
                                  resizable: true,
                                  icon: 'icons/1-32.png'});

  mainWindow.setMenuBarVisibility(false);

  // and load the index.html of the app.
  mainWindow.loadURL('file://' + __dirname + '/index.html');

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();

  // Register electron.screen
  electronScreen = electron.screen;
  //desktopCapturer = electron.desktopCapturer;

  //checkMouse();
  //checkWindows();

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  // Minimise to Tray
  mainWindow.on('minimize', function() {
    windowHide();
  });

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function () {
  createWindow();
  createTrayIcon();
  initCheck();
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC:
ipc.on('nap', function () {
  napTime();
})

// Window functions:
function windowHide() {
  if (mainWindow!==null) {
  mainWindow.hide();
  mainWindow.setSkipTaskbar(true);
  }
}

function windowShow() {
  if (mainWindow===null) {
  createWindow();
  } else {
  mainWindow.show();
  mainWindow.setSkipTaskbar(false);
  }
}

function createTrayIcon() {
  appIcon = new Tray('icons/1-16.png');
  var contextMenu = Menu.buildFromTemplate([
    { label: 'Item1', type: 'radio' },
    { label: 'Item2', type: 'radio' },
    { label: 'Item3', type: 'radio', checked: true },
    { label: 'Item4', type: 'radio' }
  ]);
  appIcon.setToolTip('This is my application.');
  appIcon.setContextMenu(contextMenu);

  appIcon.on('click', function () {
   windowShow();
  });
}

function changeIcon(iconref) {
  appIcon.setImage('icons/'+iconref+'-16.png');
}

function updateCatFaces() {

  // What image shall we use?
  if (global.naptrack.napping) {
    var image = '5';
  } else {

    var nap = global.naptrack.settings.nap, clock = global.naptrack.clock;
    var percent = Math.round(((nap-clock) / nap) * 100);

    var image = '1';
    if ( (percent<101) && (percent>60) ) { image = '1'; }
    if ( (percent<61) && (percent>40) ) { image = '2'; }
    if ( (percent<41) && (percent>20) ) { image = '3'; }
    if ( (percent<21) && (percent>-1) ) { image = '4'; }

  }

    // Update Tray
    changeIcon(image);

    // Update global for mainWindow
    global.naptrack.catInUse=image;

    mainWindow.webContents.executeJavaScript('updateClockText()');

}

// Loops and checks
function resetClock() { global.naptrack.clock = 0; }

function initCheck() {

  if (checkProcess) { clearInterval(checkProcess); }

  // set interval
  checkProcess = setInterval(check, (global.naptrack.settings.interval*1000));

}

function stopCheck() { if (checkProcess) { clearInterval(checkProcess); } }

// Run on a timer.
function check() {

  if (global.naptrack.enabled) {

  // We should only increment the counter if there have been recent
  // movement. If window tracking is enabled, only check if
  // mouse returns false.

  var movement = false;

  if (global.naptrack.tracking.mouse) {

    // Update and check mouse position
    checkMouse();
    movement = compareMouse();

  }

  if ((global.naptrack.tracking.windows)&&(mainWindow!==null)&&(!movement)) {

    // Update titles on mainWindow and check
    // async so we're really comparing /last/ time.
    mainWindow.webContents.executeJavaScript('gatherWindowTitles()');
    movement = compareWindows();

  }

  if (movement) {

    changeIcon('5');

    // Increment the counter!
    global.naptrack.clock = global.naptrack.clock + global.naptrack.intervalIncrease;

     if ( global.naptrack.clock > (global.naptrack.settings.nap-1) ) {
      napTime();
     }

  }

   updateCatFaces();

  }

}

function checkMouse() {

  global.naptrack.mouse.last = global.naptrack.mouse.current;
  global.naptrack.mouse.current = electronScreen.getCursorScreenPoint();

}

function compareMouse() {

  var a = global.naptrack.mouse.current, b = global.naptrack.mouse.last, changed = false;
  if ((a.x !== b.x)||(a.y !== b.y)) { changed=true; }
  return changed;

}

function compareWindows() {

  var a = global.naptrack.windows.current, b = global.naptrack.windows.last, changed = false;

  // different number of windows
  if (a.length!==b.length) {
    changed = true;
  } else {
    for (var i = 0; i < a.length; i++) {
      if (!changed) {
        if (b[i]) {
          if (a[i]!==b[i]) {
            changed = true;
          }
        } else {
          changed = true;
        }
      }
    }

  }

  return changed;

}

// Alerts
function napTime() {

  if (napWindow==null) {

    global.naptrack.napping=true;

    updateCatFaces();


    // reset clock to 0
    global.naptrack.clock = 0;

    // stop timer
    stopCheck();

    // create nap window
    napWindow = new BrowserWindow({width: 400,
                                   height: 200,
                                   center: true,
                                   maximizable:false,
                                   minimizable: false,
                                   closable: true,
                                   resizable: false,
                                   alwaysOnTop: true });

    napWindow.setMenuBarVisibility(false);

    // and load the index.html of the app.
    napWindow.loadURL('file://' + __dirname + '/nap.html');

    // Open the DevTools.
    //napWindow.webContents.openDevTools();

    // Emitted when the window is closed.
    napWindow.on('closed', function() {
      cancelNapInterval();
    });

    // Start the napInterval timer
    global.naptrack.napClock = 0;

    if (napProcess) { clearInterval(napProcess); }

    // set interval
    napProcess = setInterval(napInterval, 1000); // 1000. Shorten for debugging.

  }

}

function napInterval() {

  // Update progress
  if (dbl===0) {
  var dbl = 0;
  } else {
  var dbl = ( global.naptrack.napClock / (global.naptrack.settings.duration*60) );
  }

  napWindow.setProgressBar(dbl);

  // Increase
  global.naptrack.napClock = global.naptrack.napClock + 1;

  if (global.naptrack.napClock > ((global.naptrack.settings.duration*60)-1) ) {
    napWindow.close();
    cancelNapInterval();
  }

}

function cancelNapInterval() {

  if (napProcess) { clearInterval(napProcess); }

  if (napWindow!==null) {
    napWindow=null;
  }

  global.naptrack.napping=false;
  resetClock();
  initCheck();
  updateCatFaces();

}
