const connections = {};

// The name of my native messaging host
const hostName = 'com.wrc4.moverio_windows_app';

// Function to send a message to the host
function sendMessageToNativeHost(message) {
  chrome.runtime.sendNativeMessage(hostName, message, function (response) {
    if (chrome.runtime.lastError) {
      console.error('Error in sending message to host:', chrome.runtime.lastError);
      return;
    }
    console.log('Received response from host:', response);
  });
}

let port = chrome.runtime.connectNative(hostName);

port.onMessage.addListener(function(msg) {
  console.log("Received" + msg);
  // port.postMessage({ text: "Hello, my_application" });
});

port.onDisconnect.addListener(function() {
  console.log("Native Messaging Host Disconnected");
});

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
