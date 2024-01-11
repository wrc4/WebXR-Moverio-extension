const connections = [];//{};
let contentScriptPort = undefined;

// The name of my native messaging host
const hostName = 'com.wrc4.moverio_host';

let nmh = chrome.runtime.connectNative(hostName);

nmh.onMessage.addListener(function(msg) {
  // console.log('Received message from host: ', msg);

  // postMessageToPorts(portMap.contentScript, {});
  //connections.forEach(connection => {
    // console.log('postMessage to ', connection.contentScript);
  //  postMessageToPorts(connection.contentScript, {action: 'moverio-pose', quaternion: msg });
  //});
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
  console.log('Adding port: ', port);

  port.onMessage.addListener((message, sender, reply) => {
    const tabId = message.tabId !== undefined ? message.tabId : sender.sender.tab.id;

    if (connections[tabId] === undefined) {
      connections[tabId] = {};
    }

    console.log('tabId: ', tabId);
    const portMap = connections[tabId];
    console.log('connections: ', connections);
    console.log('port.name: ', port.name);

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

    // console.log('transfer message via portMap: ', portMap)

    if (port.name === 'contentScript') {

      contentScriptPort = portMap.contentScript[0];
      console.log('portMap.contentScript: ', contentScriptPort)
    }
    // if (port.name === 'panel') {
    //   postMessageToPorts(portMap.contentScript, message);
    // }
    // if (port.name === 'contentScript') {
    //   postMessageToPorts(portMap.panel, message);
    // }
  });
});

const postMessageToPorts = (ports, message) => {
  ports && ports.forEach(port => {
    port.postMessage(message);
  });
};
