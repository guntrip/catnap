$(function() {

  var napVal=60, durVal=5, skipVal=0, mouseTrack=true, windowTrack=true;

  // Load from settings?
  if (localStorage.getItem('catnap')) {

    settings = JSON.parse(localStorage.getItem('catnap'));

    if (settings.settingsVersion!==version) {

        alert('Catnap has been updated, you\'ll need to reconfigure your settings.');

    } else {

        nodeRequire('remote').getGlobal('naptrack').settings.nap=settings.nap;
        napVal=settings.nap;
        $('#nap-wait-val').html('<i class="fa fa-clock-o "></i> '+napVal+' minutes');

        nodeRequire('remote').getGlobal('naptrack').settings.duration=settings.duration;
        durVal=settings.duration;
        $('#nap-duration-val').html('<i class="fa fa-clock-o "></i> '+durVal+' minutes');

        nodeRequire('remote').getGlobal('naptrack').settings.skip=settings.skip;
        skipVal=settings.skip;
        $('#skip-val').html('<i class="fa fa-repeat"></i> '+readableNumbers[skipVal]);

        // Check the checkboxes!
        if (!settings.tracking.mouse) {
          $('#track-mouse').prop('checked', false);
          nodeRequire('remote').getGlobal('naptrack').tracking.mouse=false;
        }
        if (!settings.tracking.windows) {
          $('#track-windows').prop('checked', false);
          nodeRequire('remote').getGlobal('naptrack').tracking.windows=false;
        }

    }

  }

   $( "#nap-wait" ).slider({
     orientation: "horizontal",
     range: "min",
     min: 15,
     max: 180,
     value: napVal,
     slide: function( event, ui ) {
       // Update UI
       $('#nap-wait-val').html('<i class="fa fa-clock-o "></i> '+ui.value+' minutes');

       // Update global
       nodeRequire('remote').getGlobal('naptrack').settings.nap = ui.value;

       saveToLocalStorage();

       updateClockText();
     }
   });


   $( "#nap-length" ).slider({
     orientation: "horizontal",
     range: "min",
     min: 1,
     max: 30,
     value: durVal,
     slide: function( event, ui ) {
       // Update UI
       $('#nap-duration-val').html('<i class="fa fa-clock-o "></i> '+ui.value+' minutes');

       // Update global
       nodeRequire('remote').getGlobal('naptrack').settings.duration = ui.value;

       saveToLocalStorage();

       updateClockText();

     }
   });

   $( "#skip" ).slider({
     orientation: "horizontal",
     range: "min",
     min: 0,
     max: 3,
     value: skipVal,
     slide: function( event, ui ) {
       // Update UI
       $('#skip-val').html('<i class="fa fa-repeat "></i> '+readableNumbers[ui.value]);

       // Update global
       nodeRequire('remote').getGlobal('naptrack').settings.skip = ui.value;

       saveToLocalStorage();

       updateClockText();
     }
   });


  updateClockText();
  // $( "#amount" ).val( $( "#slider-vertical" ).slider( "value" ) );

 });

 function checkboxChanged() {

    if($('#track-mouse').is(":checked")){
      nodeRequire('remote').getGlobal('naptrack').tracking.mouse=true;
    } else {
      nodeRequire('remote').getGlobal('naptrack').tracking.mouse=false;
    }

    if($('#track-windows').is(":checked")){
      nodeRequire('remote').getGlobal('naptrack').tracking.windows=true;
    } else {
      nodeRequire('remote').getGlobal('naptrack').tracking.windows=false;
    }

    saveToLocalStorage();
    updateClockText();

 }

function saveToLocalStorage() {
  // Saves current settings to local storage.
  var settings = {
    nap: nodeRequire('remote').getGlobal('naptrack').settings.nap,
    duration: nodeRequire('remote').getGlobal('naptrack').settings.duration,
    skip: nodeRequire('remote').getGlobal('naptrack').settings.skip,
    tracking: {
      mouse: nodeRequire('remote').getGlobal('naptrack').tracking.mouse,
      windows: nodeRequire('remote').getGlobal('naptrack').tracking.windows
    },
    settingsVersion: version
  }
  localStorage.setItem('catnap', JSON.stringify(settings));
}
