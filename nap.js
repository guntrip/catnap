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
