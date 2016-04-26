var version = "0.1.0"; // change when the format of the stored settings changed.

var readableNumbers=["Never", "Once", "Twice", "Thrice"];

const ipc = nodeRequire('ipc');

function gatherWindowTitles() {

  var desktopCapturer = nodeRequire('electron').desktopCapturer;

  desktopCapturer.getSources({types: ['window']}, function(error, sources) {
    if (!error) {
      nodeRequire('remote').getGlobal('catnap').windows.last = nodeRequire('remote').getGlobal('catnap').windows.current;
      nodeRequire('remote').getGlobal('catnap').windows.current = lastThreeTitles(sources);
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

function updateClockText() {

  // status
  if (nodeRequire('remote').getGlobal('catnap').enabled) {

        if (nodeRequire('remote').getGlobal('catnap').breaktime) {
          $('#playpause').html('Break time');
        } else {
          if (nodeRequire('remote').getGlobal('catnap').snoozing) {
            $('#playpause').html('Break skipped.');
          } else {
            if ( (!nodeRequire('remote').getGlobal('catnap').tracking.mouse) && (!nodeRequire('remote').getGlobal('catnap').tracking.windows) ) {
              $('#playpause').html('Counting down');
            } else {
              $('#playpause').html('Tracking activity');
            }
          }
        }

      // WAit
      if (!nodeRequire('remote').getGlobal('catnap').breaktime) {

        var brklength = nodeRequire('remote').getGlobal('catnap').settings.duration;
        var clock = nodeRequire('remote').getGlobal('catnap').clock;
        var brk = nodeRequire('remote').getGlobal('catnap').settings.brk;

        $('#clockinfo').html( (brk-clock) + ' minutes until your next '+brklength+' minute break');

      } else {
        $('#clockinfo').html('Stretch your legs!');
      }

    } else {
      $('#playpause').html('Disabled');
      $('#clockinfo').html('You are now resting manually.');
    }

  // Update cat face
  $('.header .catface').removeClass('cat1 cat2 cat3 cat4 cat5');
  $('.header .catface').addClass('cat'+nodeRequire('remote').getGlobal('catnap').catInUse);

}

function help() {
  const shell = nodeRequire('electron').shell;
  shell.openExternal('http://stevecat.net/catnap/');
}
