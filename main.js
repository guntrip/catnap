'use strict';

const electron = require('electron');
const ipc = require('ipc');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const Menu = electron.Menu;
const Tray = electron.Tray;

let mainWindow;
let brkWindow;

var electronScreen = null, appIcon = null;
var checkProcess = null, brkProcess = null;

var closedByskip=false;
var devTools=false;

// Settings + defaults
global.catnap = {
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
    interval: 60, // 60 seconds, change for debug only
    brk: 60, // minutes
    duration: 5, // minutes
    skip: 0 // how many skips
  },
  clock: 0, // minutes
  intervalIncrease: 1, // clock increases
  brkClock: 0, // tracks time spend in brk
  enabled:true,
  brkping: false, // presently brkping?
  catInUse:'1', // current icon (1-5)
  skipCount: 0, // how many times have we skipd?
  snoozing: false
};

app.on('ready', function () {
  createWindow();
  createTrayIcon();
  initCheck();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

function createWindow () {

  var windowSize={x:450, y:285};

  // Fiddle the window size if we're on OSX.
  if (process.platform === 'darwin') {
  windowSize={x:435, y:270};
  }

  if (devTools) {
    windowSize={x:800,y:500};
  }

  mainWindow = new BrowserWindow({width: windowSize.x,
                                  height: windowSize.y,
                                  maximizable:false,
                                  minimizable: true,
                                  closable: true,
                                  resizable: false,
                                  icon: 'icons/1-32.png'});

  mainWindow.setMenuBarVisibility(false);
  if (devTools) { mainWindow.webContents.openDevTools(); }

  mainWindow.loadURL('file://' + __dirname + '/settings.html');

  electronScreen = electron.screen;

  mainWindow.on('closed', function() { mainWindow = null; });
  mainWindow.on('minimize', function() { windowHide(); });

}

ipc.on('brk', function () {
  // allows browsers to initiate a brk.
  brkTime();
})

ipc.on('skipButton', function () {
  // allows browsers to initiate a brk.
  skipButton();
})

// Hide window and taskbar
function windowHide() {
  if (mainWindow!==null) {
  mainWindow.hide();
  mainWindow.setSkipTaskbar(true);
  }
}

// Show window and taskbar
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
    { label: 'Open window', click:windowShow },
    { label: 'Break now', click:brkTime },
    { type: 'separator' },
    { label: 'Exit', click:function() { app.quit();  } }
  ]);

  appIcon.setContextMenu(contextMenu);

  appIcon.on('click', function () {
   windowShow();
  });

}

function changeIcon(iconref) {
  appIcon.setImage('icons/'+iconref+'-16.png');
  updateTooltip();
}

function updateTooltip() {
  if (global.catnap.settings.brkping) {
  appIcon.setToolTip('Time for a brk');
  } else {
  var minutesLeft = global.catnap.settings.brk -  global.catnap.clock;
  appIcon.setToolTip(minutesLeft+' minutes until your next brk.');
  }
}

function updateCatFaces() {

  // What image shall we use?
  if (global.catnap.brkping) {
    var image = '5';
  } else {

    var brk = global.catnap.settings.brk, clock = global.catnap.clock;
    var percent = Math.round(((brk-clock) / brk) * 100);

    var image = '1';
    if ( (percent<101) && (percent>60) ) { image = '1'; }
    if ( (percent<61) && (percent>40) ) { image = '2'; }
    if ( (percent<41) && (percent>20) ) { image = '3'; }
    if ( (percent<21) && (percent>-1) ) { image = '4'; }

  }

    // Update Tray
    changeIcon(image);

    // Update global for mainWindow
    global.catnap.catInUse=image;

    if (mainWindow!==null) {
    mainWindow.webContents.executeJavaScript('updateClockText()');
    }

}

// Loops and checks

function resetClock() { global.catnap.clock = 0; }

function initCheck() {

  if (checkProcess) { clearInterval(checkProcess); }

  // set interval
  checkProcess = setInterval(check, (global.catnap.settings.interval*1000));

}

function stopCheck() { if (checkProcess) { clearInterval(checkProcess); } }

// Run on a timer.
function check() {

  if (global.catnap.enabled) {

  // If there's been recent activity, increment the clock.
  // This is all async, we're really checking the last one.

  var movement = false;

  if (global.catnap.tracking.mouse) {

    // Update and check mouse position
    checkMouse();
    movement = compareMouse();

  }

  if ((global.catnap.tracking.windows)&&(mainWindow!==null)&&(!movement)) {

    // Update titles on mainWindow and check
    mainWindow.webContents.executeJavaScript('gatherWindowTitles()');
    movement = compareWindows();

  }

  if ( (!global.catnap.tracking.mouse) && (!global.catnap.tracking.windows) ) {
    // with both tracking disabled, we should act like a simple counter.
    movement=true;
  }

  if (movement) {

    // Increment the clock
    global.catnap.clock = global.catnap.clock + global.catnap.intervalIncrease;

    // Time for a brk?
    if ( global.catnap.clock > (global.catnap.settings.brk-1) ) {
      brkTime();
    }

  }

   updateCatFaces();
   updateTooltip();

  }

}

function checkMouse() {

  global.catnap.mouse.last = global.catnap.mouse.current;
  global.catnap.mouse.current = electronScreen.getCursorScreenPoint();

}

function compareMouse() {

  var a = global.catnap.mouse.current, b = global.catnap.mouse.last, changed = false;
  if ((a.x !== b.x)||(a.y !== b.y)) { changed=true; }
  return changed;

}

function compareWindows() {

  var a = global.catnap.windows.current, b = global.catnap.windows.last, changed = false;

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

// brk time!

function brkTime() {

  if (brkWindow==null) {

    global.catnap.brkping=true;
    global.catnap.snoozing=false;
    closedByskip=false;

    updateCatFaces();

    // Stop the clock!
    global.catnap.clock = 0;
    stopCheck();

    // Are there skips left?
    var skipHeight=0;
    if (global.catnap.skipCount<(global.catnap.settings.skip)) {
      skipHeight=40; // Increase window height for skip button
    }


    var windowSize={x:400, y:250};

    // Fiddle the window size if we're on OSX.
    if (process.platform === 'darwin') {
    windowSize={x:400, y:230};
    }

    if (devTools) {
      windowSize={x:800,y:500};
    }

    // create brk window
    brkWindow = new BrowserWindow({width: windowSize.x,
                                   height: windowSize.y+skipHeight,
                                   icon: 'icons/5-32.png',
                                   center: true,
                                   maximizable:false,
                                   minimizable: false,
                                   closable: true,
                                   resizable: false,
                                   alwaysOnTop: true });

    brkWindow.setMenuBarVisibility(false);

    // and load the index.html of the app.
    brkWindow.loadURL('file://' + __dirname + '/brk.html');
    if (devTools) { brkWindow.webContents.openDevTools(); }

    brkWindow.on('closed', function() {
      cancelbrkInterval();
    });

    // Start the brkInterval timer
    global.catnap.brkClock = 0;
    if (brkProcess) { clearInterval(brkProcess); }
    brkProcess = setInterval(brkInterval, 1000); // 1000. Shorten for debugging.

    mainWindow.webContents.executeJavaScript('updateClockText()');
    updateTooltip();

  }

}

function brkInterval() {

  // Update progress (Windows)
  if (dbl===0) {
  var dbl = 0;
  } else {
  var dbl = ( global.catnap.brkClock / (global.catnap.settings.duration*60) );
  }
  brkWindow.setProgressBar(dbl);

  // Increase brk clock
  global.catnap.brkClock = global.catnap.brkClock + 1;

  // Update brk.html
  brkWindow.webContents.executeJavaScript('updateCountdown()');

  // brk over?
  if (global.catnap.brkClock > ((global.catnap.settings.duration*60)-1) ) {
    global.catnap.brkping=false;
    brkWindow.close();
    cancelbrkInterval();
  }

}

function cancelbrkInterval() {

  if (brkProcess) { clearInterval(brkProcess); }

  if (brkWindow!==null) {
    brkWindow=null;
  }

  // If the timer finishes, brkping is set to false.
  if (global.catnap.brkping) {

    // they manually shut the window,
    // treat as a skip

    if ((global.catnap.skipCount===global.catnap.settings.skip) ||
        (global.catnap.settings.skip===0)) {

      // they are max-skip, or have no skips set, so give up, reset.
      global.catnap.skipCount=0;
      resetClock();

    } else {

      // Set the skip! Similar to skipButton().
      global.catnap.skipCount=global.catnap.skipCount+1;
      global.catnap.clock=(global.catnap.settings.brk - global.catnap.settings.duration);
      global.catnap.snoozing=true;

    }

  } else {

    if (!closedByskip) {
      // They were good and waited for the timer.
      global.catnap.skipCount=0;
      resetClock();
    }

  }

  global.catnap.brkping=false;

  initCheck();
  updateCatFaces();

}

function skipButton() {

  // Increase skip count
  global.catnap.skipCount=global.catnap.skipCount+1;

  // Set clock to brk length.
  global.catnap.clock=(global.catnap.settings.brk - global.catnap.settings.duration);

  // Set by skip so the window close doesn't cause choas
  closedByskip=true;

  global.catnap.snoozing=true;

  // Close the window
  global.catnap.brkping=false;
  brkWindow.close(); // triggers cancelbrkInterval

}
