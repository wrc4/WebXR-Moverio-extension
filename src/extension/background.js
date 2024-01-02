const connections = {};

// The name of my native messaging host
const hostName = 'com.wrc4.moverio_host';

let nmh = chrome.runtime.connectNative(hostName);

nmh.onMessage.addListener(function(msg) {
  console.log('Received message from host: ', msg);
  // document.getElementById('response').innerText = JSON.stringify(msg);

  // Send the quaternion to other parts of the extension
  chrome.runtime.sendMessage({ type: 'UPDATE_ORIENTATION', quaternion: msg });
});

// Handle disconnection
nmh.onDisconnect.addListener(function() {
  console.log('Disconnected from the native host.');
  // document.getElementById('response').innerText = 'Disconnected.';
});

// chrome.runtime.onConnectNative.addListener(port => {
//   console.log('Connected to native messaging host.');

//   port.onMessage.addListener(msg => {
//     console.log('Received message from host:', msg);
//     // Handle the incoming message
//   });

//   port.onDisconnect.addListener(() => {
//     console.log('Disconnected from the native messaging host.');
//   });

//   // Send a message to the native host if needed
//   setTimeout(()=>{
//     port.postMessage({ text: 'Hello from extension' });
//   }, 5000);
// });

chrome.runtime.onConnect.addListener(port => {
  // @TODO: release connection when disconnected

  port.onMessage.addListener((message, sender, reply) => {
    const tabId = message.tabId !== undefined ? message.tabId : sender.sender.tab.id;

    if (connections[tabId] === undefined) {
      connections[tabId] = {};
    }

    const portMap = connections[tabId];

    // Can be multiple content scripts per tab
    // for example if a web page includes iframe.
    // So manage ports as an array.
    if (!portMap[port.name]) {
      portMap[port.name] = [];
    }

    if (!portMap[port.name].includes(port)) {
      portMap[port.name].push(port);
      port.onDisconnect.addListener(() => {
        if (portMap[port.name].includes(port)) {
          portMap[port.name].splice(portMap[port.name].indexOf(port), 1);
        }
        if (portMap[port.name].length === 0) {
          delete portMap[port.name]
        }
        if (Object.keys(portMap).length === 0) {
          delete connections[tabId];
        }
      });
    }

    // transfer message between panel and contentScripts of the same tab

    if (port.name === 'panel') {
      postMessageToPorts(portMap.contentScript, message);
    }
    if (port.name === 'contentScript') {
      postMessageToPorts(portMap.panel, message);
    }
  });
});

const postMessageToPorts = (ports, message) => {
  ports && ports.forEach(port => {
    port.postMessage(message);
  });
};
