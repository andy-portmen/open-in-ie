'use strict';

const app = {
  locale: {
    name: 'Internet Explorer',
    current: 'Open Link in Internet Explorer',
    all: 'Open all Tabs in Internet Explorer',
    call: 'Open all Tabs in Internet Explorer (Current window)',
    example: 'example D:\\Internet Explorer\\iexplore.exe'
  },
  id: 'com.add0n.node',
  tag: 'ie',
  multiple: false
};
app.runtime = {
  mac: {
    args: ['-a', 'explorer']
  },
  linux: {
    name: 'explorer'
  },
  windows: {
    name: 'cmd',
    args: ['/s/c', 'start', 'iexplore "%url;"'],
    prgfiles: '%ProgramFiles%\\Internet Explorer\\iexplore.exe'
  }
};
const $ = id => document.getElementById(id);

$('path').placeholder = app.locale.example;
$('l2').textContent = app.runtime.windows.prgfiles;
$('l3').textContent = app.runtime.linux.name;
$('l4').textContent = app.runtime.mac.args[1];

function restore() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.local.get({
    path: '',
    enabled: false,
    altKey: true,
    shiftKey: true,
    ctrlKey: false,
    metaKey: false,
    button: 0,
    faqs: true,
    closeme: false,
    multiple: app.multiple,
    hosts: [],
    urls: [],
    keywords: [],
    reverse: false,
    topRedict: false,
    duplicate: false
  }, prefs => {
    $('path').value = prefs.path;
    $('enabled').checked = prefs.enabled;
    $('altKey').checked = prefs.altKey;
    $('shiftKey').checked = prefs.shiftKey;
    $('ctrlKey').checked = prefs.ctrlKey;
    $('metaKey').checked = prefs.metaKey;
    $('button').selectedIndex = prefs.button;
    $('faqs').checked = prefs.faqs;
    $('closeme').checked = prefs.closeme;
    $('multiple').checked = prefs.multiple;
    $('hosts').value = prefs.hosts.join(', ');
    $('urls').value = prefs.urls.join(', ');
    $('keywords').value = prefs.keywords.join(', ');
    $('reverse').checked = prefs.reverse;
    $('topRedict').checked = prefs.topRedict;
    $('duplicate').checked = prefs.duplicate;
  });
}

function save() {
  const hosts = $('hosts').value.split(/\s*,\s*/).map(s => s.replace('http://', '')
    .replace('https://', '')
    .split('/')[0].trim())
    .filter((h, i, l) => h && l.indexOf(h) === i);
  const urls = $('urls').value.split(/\s*,\s*/).filter(s => {
    return s.startsWith('http') || s.startsWith('file');
  }).filter((h, i, l) => h && l.indexOf(h) === i);

  const keywords = $('keywords').value.split(/\s*,\s*/).filter(w => w);

  chrome.storage.local.set({
    path: $('path').value,
    enabled: $('enabled').checked,
    altKey: $('altKey').checked,
    shiftKey: $('shiftKey').checked,
    ctrlKey: $('ctrlKey').checked,
    metaKey: $('metaKey').checked,
    button: $('button').selectedIndex,
    faqs: $('faqs').checked,
    closeme: $('closeme').checked,
    multiple: $('multiple').checked,
    hosts,
    urls,
    keywords,
    reverse: $('reverse').checked,
    topRedict: $('topRedict').checked,
    duplicate: $('duplicate').checked
  }, () => {
    restore();
    const status = $('status');
    status.textContent = 'Options saved.';
    setTimeout(() => status.textContent = '', 750);
  });
}

document.addEventListener('DOMContentLoaded', restore);
$('save').addEventListener('click', save);
$('windows').onclick = () => chrome.tabs.create({
  url: 'https://www.youtube.com/watch?v=yZAoy8SOd7o'
});
$('linux').onclick = () => chrome.tabs.create({
  url: 'https://www.youtube.com/watch?v=2asPoW2gJ-c'
});
$('support').onclick = () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '&rd=donate'
});
$('preview').onclick = () => chrome.tabs.create({
  url: 'https://www.youtube.com/watch?v=W6hSo5Sx5tk'
});
$('reset').addEventListener('click', e => {
  if (e.detail === 1) {
    const status = $('status');
    window.setTimeout(() => status.textContent = '', 750);
    status.textContent = 'Double-click to reset!';
  }
  else {
    localStorage.clear();
    chrome.storage.local.clear(() => {
      chrome.runtime.reload();
      window.close();
    });
  }
});
