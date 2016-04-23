var version = "0.01"; // alter with a format change to the settings stored in
                      // local storage, will ask the user to reconfigure.

var readableNumbers=["Never", "Once", "Twice", "Thrice"];

const ipc = nodeRequire('ipc');

function gatherWindowTitles() {

  var desktopCapturer = nodeRequire('electron').desktopCapturer;

  desktopCapturer.getSources({types: ['window']}, function(error, sources) {
    if (!error) {
      nodeRequire('remote').getGlobal('naptrack').windows.last = nodeRequire('remote').getGlobal('naptrack').windows.current;
      nodeRequire('remote').getGlobal('naptrack').windows.current = lastThreeTitles(sources);
    }
  });

}

function lastThreeTitles(array) {
  var l=3, result=[];
  if (array.length<3) { l=array.length; }
  for (var i = 0; i < l; i++) {
    result.push(array[i].name);
  }
  return result;
}

function napTest() {
  ipc.send('nap');
}

function updateClockText() {

  // status
  if (nodeRequire('remote').getGlobal('naptrack').enabled) {
    if (nodeRequire('remote').getGlobal('naptrack').napping) {
      $('#playpause').html('Break time');
    } else {
      if (nodeRequire('remote').getGlobal('naptrack').snoozing) {
        $('#playpause').html('Snoozing');
      } else {
        if ( (!nodeRequire('remote').getGlobal('naptrack').tracking.mouse) && (!nodeRequire('remote').getGlobal('naptrack').tracking.windows) ) {
          $('#playpause').html('Counting down');
        } else {
          $('#playpause').html('Tracking activity');
        }
      }
    }
  } else {
    $('#playpause').html('Disabled');
  }

  // WAit
  if (!nodeRequire('remote').getGlobal('naptrack').napping) {

    var breaklength = nodeRequire('remote').getGlobal('naptrack').settings.duration;
    var clock = nodeRequire('remote').getGlobal('naptrack').clock;
    var nap = nodeRequire('remote').getGlobal('naptrack').settings.nap;

    $('#clockinfo').html( (nap-clock) + ' minutes until your next '+breaklength+' minute break');

  } else {
    $('#clockinfo').html('Stretch your legs!');
  }

  // Update cat face
  $('.header .catface').removeClass('cat1 cat2 cat3 cat4 cat5');
  $('.header .catface').addClass('cat'+nodeRequire('remote').getGlobal('naptrack').catInUse);

}

function updateCat() {

}

function help() {
  const shell = nodeRequire('electron').shell;
  shell.openExternal('http://stevecat.net/catnap/');
}
