const electron = nodeRequire('electron');
const ipc = nodeRequire('ipc');

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

  if ( (fullMinutes>0) && (extraSeconds==0) ) {
    message=fullMinutes+' minutes left.';
  }

  $('.countdown').html(message);

}

// skip?
$(function() {

   // Initial update countdown
   updateCountdown();

  if (nodeRequire('remote').getGlobal('naptrack').skipCount<(nodeRequire('remote').getGlobal('naptrack').settings.skip)) {

    $('.skiploader').html('<div class="skipButton" onclick="skip();"><i class="fa fa-repeat"></i> Skip</div>');

    $('.skipButton').click(function() {
      // use IPC to use skipButton function in main.js.
      ipc.send('skipButton');
    })

  }

})

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
