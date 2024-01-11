const headset = new THREE.Object3D();
headset.position.copy(new THREE.Vector3(0, 1.6, 0));
headset.rotation.copy(new THREE.Euler(0, 0, 0));

const port = chrome.runtime.connect({name: 'contentScript'});

// console.log('content-script.js: loaded!');

const dispatchCustomEvent = (type, detail) => {
  window.dispatchEvent(new CustomEvent(type, {
    detail: typeof cloneInto !== 'undefined' ? cloneInto(detail, window) : detail
  }));
};

// Add an event listener for the message from background.js
// chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
const moverioPose = (q) => {
  //console.log('chrome.runtime.onMessage: Received message from backgroung.js: ', message);
  const quaternion = new THREE.Quaternion(q.x, q.y, q.z, q.w);

  // Create a quaternion representing a 90-degree rotation around the Z-axis
  let correctionQuaternion = new THREE.Quaternion();
  correctionQuaternion.setFromEuler(new THREE.Euler(THREE.Math.degToRad(-90),0,THREE.Math.degToRad(-90)));

  // Apply the correction by multiplying the sensor's quaternion by the correction quaternion
  // The order of multiplication matters: the correction must be applied first
  quaternion.premultiply(correctionQuaternion);
  
  // Create a new Euler object
  const euler = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ');

  // Update the headset's rotation with the new Euler angles
  headset.rotation.copy(euler);

  // console.dir(headset.position.toArray([]));
  // console.dir(headset.quaternion.toArray([]));

  dispatchCustomEvent('webxr-pose', {
    position: headset.position.toArray([]),
    quaternion: headset.quaternion.toArray([])
  });
};

// receive message from panel via background
// and transfer to polyfill as event on window

port.onMessage.addListener(message => {
  switch (message.action) {
    case 'webxr-device':
      dispatchCustomEvent('webxr-device', {
        deviceDefinition: message.deviceDefinition
      });
      break;

    case 'webxr-pose':
      dispatchCustomEvent('webxr-pose', {
        position: message.position,
        quaternion: message.quaternion
      });
      break;

    case 'webxr-input-pose':
      dispatchCustomEvent('webxr-input-pose', {
        objectName: message.objectName,
        position: message.position,
        quaternion: message.quaternion
      });
      break;

    case 'webxr-input-button':
      dispatchCustomEvent('webxr-input-button', {
        objectName: message.objectName,
        pressed: message.pressed,
        buttonIndex: message.buttonIndex
      });
      break;

    case 'webxr-stereo-effect':
      dispatchCustomEvent('webxr-stereo-effect', {
        enabled: message.enabled
      });
      break;

    case 'webxr-exit-immersive':
      dispatchCustomEvent('webxr-exit-immersive', {});
      break;

    case 'moverio-pose':
      // console.log('port.onMessage: Received message from backgroung.js: ', message.quaternion);
      moverioPose(message.quaternion)
      break;
  }
});

// Set up listeners for events coming from EmulatedXRDevice.
// Transfer to panel via background.

window.addEventListener('device-pose', event => {
  port.postMessage({
    action: 'device-pose',
    position: event.detail.position,
    quaternion: event.detail.quaternion
  });
}, false);

window.addEventListener('device-input-pose', event => {
  port.postMessage({
    action: 'device-input-pose',
    objectName: event.detail.objectName,
    position: event.detail.position,
    quaternion: event.detail.quaternion
  });
}, false);

window.addEventListener('device-enter-immersive', event => {
  port.postMessage({
    action: 'device-enter-immersive'
  });
}, false);

window.addEventListener('device-leave-immersive', event => {
  port.postMessage({
    action: 'device-leave-immersive'
  });
}, false);

// Set up listeners for requests coming from EmulatedXRDevice.
// Send back the response with the result.

window.addEventListener('webxr-virtual-room-request', event => {
  fetch(chrome.runtime.getURL('assets/hall_empty.glb')).then(response => {
    return response.arrayBuffer();
  }).then(buffer => {
    dispatchCustomEvent('webxr-virtual-room-response', {
      buffer: buffer
    });
  });
}, false);


// function to load script in a web page

const loadScript = source => {
  const script = document.createElement('script');
  script.textContent = source;
  (document.head || document.documentElement).appendChild(script);
  script.parentNode.removeChild(script);
};

// Synchronously adding WebXR polyfill because
// some applications for example Three.js WebVR examples
// check if WebXR is available by synchronously checking
// navigator.xr , window.XR or whatever when the page is loaded.

loadScript(`
  (function() {
    (` + WebXRPolyfillInjection + `)();
    const polyfill = new CustomWebXRPolyfill();
    //console.log(this); // to check if loaded
  })();
`);

// No synchronous storage and fetch APIs so reluctantly
// reflecting configuration asynchronously

ConfigurationManager.createFromJsonFile('src/devices.json').then(manager => {
  manager.loadFromStorage().then(() => {
    // send the configuration parameters to the polyfill as an event
    dispatchCustomEvent('webxr-device-init', {
      deviceDefinition: manager.deviceDefinition,
      stereoEffect: manager.stereoEffect
    });
    port.postMessage({
      action: 'webxr-startup'
    });
  });
}).catch(error => {
  console.error(error);
});
