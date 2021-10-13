microsoftTeams.initialize(() => {}, ["https://localhost:9000", "https://lubobill1990.github.io","https://videoappeffectornaments.z22.web.core.windows.net/"]);
// This is the effect for processing

let appliedEffect = {
  effect: null
};

// This is the effect linked with UI
let uiSelectedEffect = {};

let errorOccurs = false;

//Sample video effect
function videoFrameHandler(videoFrame, notifyVideoProcessed, notifyError) 
{ 

  console.log("height:", videoFrame.height, "width:", videoFrame.width, "numRes:", videoFrame.data.length)

  var rgbImage = nv12ToRgbTranform(videoFrame)

  notifyVideoProcessed();
  //send error to Teams
  if (errorOccurs) {
    notifyError("some error message");
  }

    
}

function preload(){
  microsoftTeams.appInitialization.notifySuccess();

  microsoftTeams.videoApp.registerForVideoFrame(videoFrameHandler, {
    format: "NV12",
  });
  
}

preload();

