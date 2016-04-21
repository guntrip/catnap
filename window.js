const ipc = require('ipc');

var twat = require('remote').getGlobal('naptrack');
//alert(twat.test);

function gatherWindowTitles() {

  var desktopCapturer = require('electron').desktopCapturer;

  desktopCapturer.getSources({types: ['window']}, function(error, sources) {
    if (!error) {
      require('remote').getGlobal('naptrack').windows.last = require('remote').getGlobal('naptrack').windows.current;
      require('remote').getGlobal('naptrack').windows.current = lastThreeTitles(sources);
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
