'use strict';

const electron = require('electron');
const ipc = require('ipc');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const Menu = electron.Menu;
const Tray = electron.Tray;

let mainWindow;
let napWindow;

var electronScreen = null, appIcon = null;
var checkProcess = null, napProcess = null;

var closedByskip=false;
var devTools=false;

// Settings + defaults
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
    interval: 60, // 60 seconds, change for debug only
    nap: 60, // minutes
    duration: 5, // minutes
    skip: 0 // how many skips
  },
  clock: 0, // minutes
  intervalIncrease: 1, // clock increases
  napClock: 0, // tracks time spend in nap
  enabled:true,
  napping: false, // presently napping?
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

  mainWindow = new BrowserWindow({width: windowSize.x,
                                  height: windowSize.y,
                                  maximizable:false,
                                  minimizable: true,
                                  closable: true,
                                  resizable: false,
                                  icon: 'icons/1-32.png'});

  mainWindow.setMenuBarVisibility(false);
  if (devTools) { mainWindow.webContents.openDevTools(); }

  mainWindow.loadURL('file://' + __dirname + '/index.html');

  electronScreen = electron.screen;

  mainWindow.on('closed', function() { mainWindow = null; });
  mainWindow.on('minimize', function() { windowHide(); });

}

ipc.on('nap', function () {
  // allows browsers to initiate a nap.
  napTime();
})

ipc.on('skipButton', function () {
  // allows browsers to initiate a nap.
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
    { label: 'Break now', click:napTime },
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
  if (global.naptrack.settings.napping) {
  appIcon.setToolTip('Time for a break');
  } else {
  var minutesLeft = global.naptrack.settings.nap -  global.naptrack.clock;
  appIcon.setToolTip(minutesLeft+' minutes until your next break.');
  }
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

    if (mainWindow!==null) {
    mainWindow.webContents.executeJavaScript('updateClockText()');
    }

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

  // If there's been recent activity, increment the clock.
  // This is all async, we're really checking the last one.

  var movement = false;

  if (global.naptrack.tracking.mouse) {

    // Update and check mouse position
    checkMouse();
    movement = compareMouse();

  }

  if ((global.naptrack.tracking.windows)&&(mainWindow!==null)&&(!movement)) {

    // Update titles on mainWindow and check
    mainWindow.webContents.executeJavaScript('gatherWindowTitles()');
    movement = compareWindows();

  }

  if ( (!global.naptrack.tracking.mouse) && (!global.naptrack.tracking.windows) ) {
    // with both tracking disabled, we should act like a simple counter.
    movement=true;
  }

  if (movement) {

    // Increment the clock
    global.naptrack.clock = global.naptrack.clock + global.naptrack.intervalIncrease;

    // Time for a break?
    if ( global.naptrack.clock > (global.naptrack.settings.nap-1) ) {
      napTime();
    }

  }

   updateCatFaces();
   updateTooltip();

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

// Break time!

function napTime() {

  if (napWindow==null) {

    global.naptrack.napping=true;
    global.naptrack.snoozing=false;
    closedByskip=false;

    updateCatFaces();

    // Stop the clock!
    global.naptrack.clock = 0;
    stopCheck();

    // Are there skips left?
    var skipHeight=0;
    if (global.naptrack.skipCount<(global.naptrack.settings.skip)) {
      skipHeight=40; // Increase window height for skip button
    }


    var windowSize={x:400, y:250};

    // Fiddle the window size if we're on OSX.
    if (process.platform === 'darwin') {
    windowSize={x:400, y:230};
    }

    // create nap window
    napWindow = new BrowserWindow({width: windowSize.x,
                                   height: windowSize.y+skipHeight,
                                   icon: 'icons/5-32.png',
                                   center: true,
                                   maximizable:false,
                                   minimizable: false,
                                   closable: true,
                                   resizable: false,
                                   alwaysOnTop: true });

    napWindow.setMenuBarVisibility(false);

    // and load the index.html of the app.
    napWindow.loadURL('file://' + __dirname + '/nap.html');
    if (devTools) { napWindow.webContents.openDevTools(); }

    napWindow.on('closed', function() {
      cancelNapInterval();
    });

    // Start the napInterval timer
    global.naptrack.napClock = 0;
    if (napProcess) { clearInterval(napProcess); }
    napProcess = setInterval(napInterval, 1000); // 1000. Shorten for debugging.

    mainWindow.webContents.executeJavaScript('updateClockText()');
    updateTooltip();

  }

}

function napInterval() {

  // Update progress (Windows)
  if (dbl===0) {
  var dbl = 0;
  } else {
  var dbl = ( global.naptrack.napClock / (global.naptrack.settings.duration*60) );
  }
  napWindow.setProgressBar(dbl);

  // Increase nap clock
  global.naptrack.napClock = global.naptrack.napClock + 1;

  // Update nap.html
  napWindow.webContents.executeJavaScript('updateCountdown()');

  // Break over?
  if (global.naptrack.napClock > ((global.naptrack.settings.duration*60)-1) ) {
    global.naptrack.napping=false;
    napWindow.close();
    cancelNapInterval();
  }

}

function cancelNapInterval() {

  if (napProcess) { clearInterval(napProcess); }

  if (napWindow!==null) {
    napWindow=null;
  }

  // If the timer finishes, napping is set to false.
  if (global.naptrack.napping) {

    // they manually shut the window,
    // treat as a skip

    if ((global.naptrack.skipCount===global.naptrack.settings.skip) ||
        (global.naptrack.settings.skip===0)) {

      // they are max-skip, or have no skips set, so give up, reset.
      global.naptrack.skipCount=0;
      resetClock();

    } else {

      // Set the skip! Similar to skipButton().
      global.naptrack.skipCount=global.naptrack.skipCount+1;
      global.naptrack.clock=(global.naptrack.settings.nap - global.naptrack.settings.duration);
      global.naptrack.snoozing=true;

    }

  } else {

    if (!closedByskip) {
      // They were good and waited for the timer.
      global.naptrack.skipCount=0;
      resetClock();
    }

  }

  global.naptrack.napping=false;

  initCheck();
  updateCatFaces();

}

function skipButton() {

  // Increase skip count
  global.naptrack.skipCount=global.naptrack.skipCount+1;

  // Set clock to nap length.
  global.naptrack.clock=(global.naptrack.settings.nap - global.naptrack.settings.duration);

  // Set by skip so the window close doesn't cause choas
  closedByskip=true;

  global.naptrack.snoozing=true;

  // Close the window
  global.naptrack.napping=false;
  napWindow.close(); // triggers cancelNapInterval

}
