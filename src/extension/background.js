let contentScriptPort = undefined;

// The name of my native messaging host
const hostName = 'com.wrc4.moverio_host';

let nmh = chrome.runtime.connectNative(hostName);

nmh.onMessage.addListener(function(msg) {
  // console.log('Received message from host: ', msg);

  if (contentScriptPort != undefined) {
    contentScriptPort.postMessage({action: 'moverio-pose', quaternion: msg });
    // console.log('Sent message to contentScript: ');
  }  
});

// Handle disconnection
nmh.onDisconnect.addListener(function() {
  console.log('Disconnected from the native host.');
});

chrome.runtime.onConnect.addListener(port => {
  // @TODO: release connection when disconnected
  // console.log('Connected to port: ', port.name);

  if (port.name === 'contentScript') {
    contentScriptPort = port;
    console.log('Connected to contentScript.')
  }
});
