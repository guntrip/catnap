const ipc = nodeRequire('ipc');

var twat = nodeRequire('remote').getGlobal('naptrack');
//alert(twat.test);

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
    $('#playpause').html('Active');
  } else {
    $('#playpause').html('Disabled');
  }

  // WAit
  var breaklength = nodeRequire('remote').getGlobal('naptrack').settings.duration;
  var clock = nodeRequire('remote').getGlobal('naptrack').clock;
  var nap = nodeRequire('remote').getGlobal('naptrack').settings.nap;

  $('#clockinfo').html( (nap-clock) + ' minutes until your next '+breaklength+' minute break');

  // Update cat face
  $('.header .catface').removeClass('cat1 cat2 cat3 cat4 cat5');
  $('.header .catface').addClass('cat'+nodeRequire('remote').getGlobal('naptrack').catInUse);

}

function updateCat() {

}
