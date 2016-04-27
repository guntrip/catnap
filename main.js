'use strict';

var app = require('app');
var path = require('path');
var cp = require('child_process');

var handleSquirrelEvent = function() {
   if (process.platform != 'win32') {
      return false;
   }

   function executeSquirrelCommand(args, done) {
      var updateDotExe = path.resolve(path.dirname(process.execPath),
         '..', 'update.exe');
      var child = cp.spawn(updateDotExe, args, { detached: true });
      child.on('close', function(code) {
         done();
      });
   };

   function install(done) {
      var target = path.basename(process.execPath);
      executeSquirrelCommand(["--createShortcut", target], done);
   };

   function uninstall(done) {
      var target = path.basename(process.execPath);
      executeSquirrelCommand(["--removeShortcut", target], done);
   };

   var squirrelEvent = process.argv[1];
   switch (squirrelEvent) {
      case '--squirrel-install':
         install(app.quit);
         return true;
      case '--squirrel-updated':
         install(app.quit);
         return true;
      case '--squirrel-obsolete':
         app.quit();
         return true;
      case '--squirrel-uninstall':
         uninstall(app.quit);
         return true;
   }

   return false;
};

if (handleSquirrelEvent()) {
   return;
}

const electron = require('electron');
const ipc = require('ipc');
//const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const Menu = electron.Menu;
const Tray = electron.Tray;
var AutoLaunch = require('auto-launch');
let mainWindow;
let brkWindow;

if (require('electron-squirrel-startup')) return;

var electronScreen = null, appIcon = null, checkProcess = null, brkProcess = null;

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


var devTools=false; // opens dev tools and expands window sizes.

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
  breaktime: false, // presently breaktime?
  catInUse:'1', // current icon (1-5)
  skipCount: 0, // how many times have we skipd?
  snoozing: false,
  startup: false
};

var catNapAutoLauncher = new AutoLaunch({
	name: 'catnap',
	isHidden: true // hidden on launch - only works on a mac atm.
});

var closedByskip=false;

function createWindow () {

  var windowSize={x:450, y:285};
  if (process.platform === 'darwin') windowSize={x:435, y:270};
  if (devTools) windowSize={x:800,y:500};

  mainWindow = new BrowserWindow({width: windowSize.x,
                                  height: windowSize.y,
                                  maximizable:false,
                                  minimizable: true,
                                  closable: true,
                                  resizable: false,
                                  icon: 'icons/1-32.png'});

  mainWindow.setMenuBarVisibility(false);

  if (devTools) mainWindow.webContents.openDevTools();

  mainWindow.loadURL('file://' + __dirname + '/settings.html');

  electronScreen = electron.screen;
  mainWindow.on('closed', function() { mainWindow = null; });
  mainWindow.on('minimize', windowHide);

}

ipc.on('brk', brkTime);
ipc.on('skipButton', skipButton);

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

  if (appIcon) { appIcon.destroy(); }

  catNapAutoLauncher.isEnabled().then(
    function success(isEnabled) {
      if (isEnabled) {
      global.catnap.startup=true;
      createTrayMenu(); // re..create.
      }
    });

  var iconSize='16';
  if (process.platform === 'darwin') iconSize='32@2x';

  appIcon = new Tray(__dirname + '/icons/1-'+iconSize+'.png');

  createTrayMenu();

  appIcon.on('click', windowShow);

}

function createTrayMenu() {

  if (appIcon) {

    var contextMenu = Menu.buildFromTemplate([
      { label: 'Open window', click:windowShow },
      { label: 'Enabled', type: 'checkbox', checked: true, click:function(item) {
        toggleEnabled(item.checked);
      } },
      { label: 'Launch on startup', type: 'checkbox', checked: global.catnap.startup, click:function(item) {
        toggleStartup(item.checked);
      } },
      { label: 'Break now', click:brkTime },
      { type: 'separator' },
      { label: 'Exit', click:function() { app.quit(); } },
    ]);

    appIcon.setContextMenu(contextMenu);

  }

}

function changeIcon(iconref) {

  var iconSize='16';
  if (process.platform === 'darwin') iconSize='32@2x';

  appIcon.setImage(__dirname + '/icons/'+iconref+'-'+iconSize+'.png');
  updateTooltip();

}

function updateTooltip() {
  if (global.catnap.enabled) {
    if (global.catnap.settings.breaktime) {
    appIcon.setToolTip('Time for a break.');
    } else {
    var minutesLeft = global.catnap.settings.brk -  global.catnap.clock;
    appIcon.setToolTip(minutesLeft+' minutes until your next break.');
    }
  } else {
    appIcon.setToolTip('Cat nap is disabled.');
  }
}

function toggleEnabled(enabled) {

  if (enabled) {
    global.catnap.enabled=true;
    initCheck();
  } else {
    global.catnap.enabled=false;
    stopCheck();
  }

  updateCatFaces();

}

function toggleStartup(enabled) {

  if (enabled) {
    catNapAutoLauncher.enable();
    global.catnap.startup=true;
  } else {
    catNapAutoLauncher.disable();
    global.catnap.startup=false;
  }

}

function updateCatFaces() {

  // What image shall we use?

  if (global.catnap.breaktime) {
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

function resetClock() { global.catnap.clock = 0; }

function initCheck() {
  // (re)start the activity check

  if (checkProcess) { clearInterval(checkProcess); }
  checkProcess = setInterval(check, (global.catnap.settings.interval*1000));

}

function stopCheck() { if (checkProcess) { clearInterval(checkProcess); } }

function check() {

  if (global.catnap.enabled) {

    // If there's been recent activity, increment the clock.
    // note: the checks are async, we're really checking the *last* value.

    var movement = false;

    if (global.catnap.tracking.mouse) {
      checkMouse();
      movement = compareMouse();
    }

    if ((global.catnap.tracking.windows)&&(mainWindow!==null)&&(!movement)) {
      // we can't access screen from here, mainWindow can.
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

function brkTime() {

  if (brkWindow==null) {

    global.catnap.breaktime=true;
    global.catnap.snoozing=false;
    closedByskip=false;

    updateCatFaces();

    // Stop the clock
    global.catnap.clock = 0;
    stopCheck();

    var skipHeight=0;
    if (global.catnap.skipCount<(global.catnap.settings.skip)) {
      skipHeight=40; // Increase window height for skip button
    }

    var windowSize={x:400, y:250};
    if (process.platform === 'darwin') windowSize={x:400, y:230};
    if (devTools) windowSize={x:800,y:500};

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

    brkWindow.loadURL('file://' + __dirname + '/brk.html');

    if (devTools) brkWindow.webContents.openDevTools();

    brkWindow.on('closed', cancelbrkInterval);

    // Start the break interval timer
    global.catnap.brkClock = 0;
    if (brkProcess) { clearInterval(brkProcess); }
    brkProcess = setInterval(brkInterval, 1000); // 1000. Shorten for debugging.

    mainWindow.webContents.executeJavaScript('updateClockText()');
    updateTooltip();

  }

}

function brkInterval() {

  // Update progress (Windows)
  brkWindow.setProgressBar(global.catnap.brkClock / (global.catnap.settings.duration*60));

  // Increase brk clock
  global.catnap.brkClock = global.catnap.brkClock + 1;

  // Update brk.html
  brkWindow.webContents.executeJavaScript('updateCountdown()');

  // break over?
  if (global.catnap.brkClock > ((global.catnap.settings.duration*60)-1) ) {
    global.catnap.breaktime=false; // < lets other functions know we closed the window
    brkWindow.close();
    cancelbrkInterval();
  }

}

function cancelbrkInterval() {

  if (brkProcess) { clearInterval(brkProcess); }

  if (brkWindow!==null)  brkWindow=null;

  // If the timer finishes, breaktime is set to false.
  if (global.catnap.breaktime) {

    // they manually shut the window,
    // treat as a skip

        if ((global.catnap.skipCount===global.catnap.settings.skip) ||
            (global.catnap.settings.skip===0)) {

          // they are at max-skip, or have no skips set, so give up, reset.
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

  global.catnap.breaktime=false;

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
  global.catnap.breaktime=false;
  brkWindow.close(); // triggers cancelbrkInterval

}
