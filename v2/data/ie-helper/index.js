'use strict';

const args = new URLSearchParams(location.search);
const id = args.get('id') || 'com.add0n.node';
const repo = {
  api: 'https://api.github.com/repos/andy-portmen/native-client/releases/latest',
  manual: 'https://github.com/andy-portmen/native-client/releases'
};
document.title = 'One Extra Step :: Open in IE';


const os = navigator.userAgent.indexOf('Mac') !== -1 ? 'mac' : (
  navigator.userAgent.indexOf('Linux') !== -1 ? 'linux' : 'windows'
);

document.body.dataset.os = os === 'windows' ? os : 'linux';

if (['Lin', 'Win', 'Mac'].indexOf(navigator.platform.substr(0, 3)) === -1) {
  window.alert(`Unsupported OS

This "native client" only supports the following operating systems at the moment:
Windows, Mac, and Linux`);
}

const notify = (() => {
  const parent = document.getElementById('notify');
  const elems = new Set();
  return {
    show(type, textContent, delay = 3000) {
      const elem = Object.assign(document.createElement('div'), {
        textContent
      });
      elem.dataset.type = type;
      parent.appendChild(elem);
      window.setTimeout(() => {
        elems.delete(elem);
        elem.remove();
      }, delay);
      elems.add(elem);
    },
    destroy() {
      for (const e of elems) {
        try {
          e.remove();
        }
        catch (e) {}
        elems.delete(e);
      }
    }
  };
})();

const validate = () => chrome.runtime.sendNativeMessage(id, {
  cmd: 'version'
}, response => {
  if (response) {
    notify.show('success', 'Client version is ' + response.version);
  }
  else {
    notify.show('error', 'Cannot find the native client. Follow the 3 steps to install the native client');
  }
});

document.addEventListener('click', ({target: {
  dataset: {
    cmd
  }
}}) => {
  if (cmd === 'download') {
    const perform = () => {
      notify.show('info', 'Looking for the latest version of the native-client', 60000);
      fetch(repo.api).then(r => r.json()).then(r => {
        chrome.downloads.download({
          filename: os + '.zip',
          url: r.assets.filter(a => a.name === os + '.zip')[0].browser_download_url
        }, () => {
          notify.show('success', 'Download is started. Extract and install when it is done');
          window.setTimeout(() => {
            notify.destroy();
            document.body.dataset.step = 1;
          }, 3000);
        });
      }).catch(e => {
        notify('error', 'Something went wrong! ' + e.message);
        setTimeout(() => window.open(repo.manual), 5000);
      });
    };
    if (chrome.downloads) {
      perform();
    }
    else {
      chrome.permissions.request({
        permissions: ['downloads']
      }, granted => {
        if (granted) {
          perform();
        }
        else {
          notify.show('error', 'Cannot initiate file downloading. Please download the file manually', 60000);
        }
      });
    }
  }
  else if (cmd === 'check') {
    validate();
  }
  else if (cmd === 'options') {
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.sendNativeMessage(id, {
  cmd: 'version'
}, response => {
  chrome.runtime.lastError;
  if (response) {
    document.title = 'Native Client is already installed! :: Open in IE';
    document.body.dataset.installed = true;
  }
});
