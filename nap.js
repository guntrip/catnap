const electron = nodeRequire('electron');

function updateCountdown() {

  var secondsLeft = ( nodeRequire('remote').getGlobal('naptrack').settings.duration *60 ) -  nodeRequire('remote').getGlobal('naptrack').napClock;
  var fullMinutes = Math.floor(secondsLeft / 60);
  var extraSeconds = secondsLeft - (fullMinutes * 60);

  var message = "";

  if (fullMinutes > 0) {
    message = fullMinutes+" minute";
    if (fullMinutes>1) { message += "s"; }
    message += " and ";
  }

  message += extraSeconds+" seconds left.";

  $('.countdown').html(message);

}

// Completely pointless peeking eye fun
$(function() {startPeek(); } );

var mpos = {x:0,y:0}, escreen = electron.screen, ploop=null;

function startPeek() {
  mpos = escreen.getCursorScreenPoint();
  ploop=setInterval(peek, 500);
}

function peek() {

  var newPos=escreen.getCursorScreenPoint();

  if ( (newPos.x !== mpos.x) || (newPos.y !== mpos.y) ) {
    $('.napcat').addClass('peek');
  } else {
    $('.napcat').removeClass('peek');
  }

  mpos=newPos;

}
