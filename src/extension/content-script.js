const port = chrome.runtime.connect({name: 'contentScript'});

port.onMessage.addListener(message => {
  switch (message.action) {
    case 'moverio-pose':
      // console.log('port.onMessage: Received message from backgroung.js: ', message.quaternion);
      window.postMessage({ type: 'UPDATE_ORIENTATION', quaternion: message.quaternion }, '*');
      break;
  }
});