$(function() {

  var brkVal=60, durVal=5, skipVal=0, mouseTrack=true, windowTrack=true;

  // Load from settings?
  if (localStorage.getItem('catnap')) {

    settings = JSON.parse(localStorage.getItem('catnap'));

    if (settings.settingsVersion!==version) {

        alert('catnap has been updated, you\'ll need to reconfigure your settings.');

    } else {

        nodeRequire('remote').getGlobal('catnap').settings.brk=settings.brk;
        brkVal=settings.brk;
        $('#brk-wait-val').html('<i class="fa fa-clock-o "></i> '+brkVal+' minutes');

        nodeRequire('remote').getGlobal('catnap').settings.duration=settings.duration;
        durVal=settings.duration;
        $('#brk-duration-val').html('<i class="fa fa-clock-o "></i> '+durVal+' minutes');

        nodeRequire('remote').getGlobal('catnap').settings.skip=settings.skip;
        skipVal=settings.skip;
        $('#skip-val').html('<i class="fa fa-repeat"></i> '+readableNumbers[skipVal]);

        // Check the checkboxes!
        if (!settings.tracking.mouse) {
          $('#track-mouse').prop('checked', false);
          nodeRequire('remote').getGlobal('catnap').tracking.mouse=false;
        }
        if (!settings.tracking.windows) {
          $('#track-windows').prop('checked', false);
          nodeRequire('remote').getGlobal('catnap').tracking.windows=false;
        }

    }

  }

   $( "#brk-wait" ).slider({
     orientation: "horizontal",
     range: "min",
     min: 15,
     max: 180,
     value: brkVal,
     slide: function( event, ui ) {
       // Update UI
       $('#brk-wait-val').html('<i class="fa fa-clock-o "></i> '+ui.value+' minutes');

       // Update global
       nodeRequire('remote').getGlobal('catnap').settings.brk = ui.value;

       saveToLocalStorage();

       updateClockText();
     }
   });


   $( "#brk-length" ).slider({
     orientation: "horizontal",
     range: "min",
     min: 1,
     max: 30,
     value: durVal,
     slide: function( event, ui ) {
       // Update UI
       $('#brk-duration-val').html('<i class="fa fa-clock-o "></i> '+ui.value+' minutes');

       // Update global
       nodeRequire('remote').getGlobal('catnap').settings.duration = ui.value;

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
       nodeRequire('remote').getGlobal('catnap').settings.skip = ui.value;

       saveToLocalStorage();

       updateClockText();
     }
   });


  updateClockText();
  // $( "#amount" ).val( $( "#slider-vertical" ).slider( "value" ) );

 });

 function checkboxChanged() {

    if($('#track-mouse').is(":checked")){
      nodeRequire('remote').getGlobal('catnap').tracking.mouse=true;
    } else {
      nodeRequire('remote').getGlobal('catnap').tracking.mouse=false;
    }

    if($('#track-windows').is(":checked")){
      nodeRequire('remote').getGlobal('catnap').tracking.windows=true;
    } else {
      nodeRequire('remote').getGlobal('catnap').tracking.windows=false;
    }

    saveToLocalStorage();
    updateClockText();

 }

function saveToLocalStorage() {
  // Saves current settings to local storage.
  var settings = {
    brk: nodeRequire('remote').getGlobal('catnap').settings.brk,
    duration: nodeRequire('remote').getGlobal('catnap').settings.duration,
    skip: nodeRequire('remote').getGlobal('catnap').settings.skip,
    tracking: {
      mouse: nodeRequire('remote').getGlobal('catnap').tracking.mouse,
      windows: nodeRequire('remote').getGlobal('catnap').tracking.windows
    },
    settingsVersion: version
  }
  localStorage.setItem('catnap', JSON.stringify(settings));
}
