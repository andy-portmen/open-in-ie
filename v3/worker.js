'use strict';

const app = {
  id: 'com.add0n.node',
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

function notify(title) {
  chrome.tabs.query({
    currentWindow: true,
    active: true
  }, tbs => {
    chrome.action.setBadgeText({
      tabId: tbs[0].id,
      text: 'E'
    });
    chrome.action.setBadgeBackgroundColor({
      tabId: tbs[0].id,
      color: 'red'
    });
    chrome.action.setTitle({
      tabId: tbs[0].id,
      title
    });
  });
}

function error(response) {
  const title = `Sending link to IE failed due to an error!
Please make sure you have the native client and IE browser is accessible.

Details:
  Error (stderr): ${response.stderr || '-'}

  Output (stdout): ${response.stdout || '-'}

  IE Exit Code: ${response.code}`;

  notify(title);
}

function response(res, success = () => {}) {
  // windows batch file returns 1
  if (res && (res.code !== 0 && (res.code !== 1 || res.stderr !== ''))) {
    error(res);
  }
  else if (res) {
    success();
  }
  else {
    const url = chrome.runtime.getURL('/data/ie-helper/index.html');
    chrome.tabs.query({
      url
    }, tabs => {
      if (tabs && tabs.length) {
        const [{id, windowId}] = tabs;
        chrome.tabs.update(id, {
          active: true
        }, () => {
          chrome.windows.update(windowId, {
            focused: true
          });
        });
      }
      else {
        chrome.tabs.create({
          url: 'data/ie-helper/index.html'
        });
      }
    });
  }
}

function exec(command, args, callback, properties = {}) {
  if (command) {
    const options = {
      cmd: 'exec',
      command,
      arguments: args,
      properties
    };
    chrome.runtime.sendNativeMessage(app.id, options, res => (callback || response)(res));
  }
  else {
    notify(`Please set the Internet Explorer's path on the options page`);
    chrome.runtime.openOptionsPage();
  }
}

const find = callback => chrome.runtime.sendNativeMessage(app.id, {
  cmd: 'env'
}, res => {
  if (res && res.env && res.env.ProgramFiles) {
    const {LOCALAPPDATA, ProgramFiles} = res.env;
    chrome.storage.local.set({
      path: app.runtime.windows.prgfiles
        .replace('%LOCALAPPDATA%', LOCALAPPDATA)
        .replace('%ProgramFiles(x86)%', res.env['ProgramFiles(x86)'])
        .replace('%ProgramFiles%', ProgramFiles)
    }, callback);
  }
  else {
    response(res);
  }
});

const open = (urls, closeIDs = []) => (new Promise(resolve => chrome.storage.local.get({
  path: null,
  closeme: false
}, resolve)).then(({path, closeme}) => {
  const close = () => {
    if (closeme && closeIDs.length) {
      chrome.tabs.remove(closeIDs);
    }
  };

  if (/Mac/.test(navigator.userAgent)) {
    if (path) {
      const length = app.runtime.mac.args.length;
      app.runtime.mac.args[length - 1] = path;
    }
    exec('open', [...app.runtime.mac.args, ...urls], r => response(r, close));
  }
  else if (/Linux/.test(navigator.userAgent)) {
    exec(path || app.runtime.linux.name, urls, r => response(r, close));
  }
  else {
    if (path) {
      exec(path, [...(app.runtime.windows.args2 || []), ...urls], r => response(r, close));
    }
    else {
      const args = [...app.runtime.windows.args];
      args[1] = args[1].replace('start', navigator.userAgent.indexOf('Firefox') !== -1 ? 'start /WAIT' : 'start');
      args[2] = args[2].replace('%url;', urls.join(' '));

      exec(app.runtime.windows.name, args, res => {
        if (res && res.code !== 0) { // use old method
          find(() => open(urls, closeIDs));
        }
        else {
          response(res, close);
        }
      }, {windowsVerbatimArguments: true});
    }
  }
}));

function postpone(tabs) {
  chrome.storage.local.get({
    multiple: app.multiple
  }, ({multiple}) => {
    if (multiple) {
      return open(tabs.map(t => t.url), tabs.map(t => t.id));
    }
    const tab = tabs.shift();
    if (tab) {
      open([tab.url], [tab.id]);
      setTimeout(postpone, 1000, tabs);
    }
  });
}

chrome.action.onClicked.addListener(() => {
  const options = {
    active: true,
    currentWindow: true
  };
  chrome.tabs.query(options, tabs => open(tabs.map(({url}) => url), tabs.map(({id}) => id)));
});
// context menu
{
  const run = () => {
    const menu = chrome.contextMenus;
    menu.create({
      title: 'Open all Tabs in Internet Explorer',
      id: 'open-all',
      contexts: ['action']
    });
    menu.create({
      title: 'Open all Tabs in Internet Explorer (Current window)',
      id: 'open-call',
      contexts: ['action']
    });
    menu.create({
      title: 'Open Link in Internet Explorer',
      id: 'open-current',
      contexts: ['link'],
      documentUrlPatterns: ['*://*/*']
    });
  };
  chrome.runtime.onInstalled.addListener(run);
  chrome.runtime.onStartup.addListener(run);
}

chrome.contextMenus.onClicked.addListener(info => {
  const {menuItemId, linkUrl, pageUrl} = info;
  if (menuItemId === 'open-current') {
    open([linkUrl || pageUrl], []);
  }
  else if (menuItemId === 'open-all') {
    chrome.tabs.query({
      url: ['*://*/*']
    }, postpone);
  }
  else if (menuItemId === 'open-call') {
    chrome.tabs.query({
      url: ['*://*/*'],
      currentWindow: true
    }, postpone);
  }
});
chrome.runtime.onMessage.addListener(({cmd, url}, {tab}) => {
  if (cmd === 'open-in') {
    open([url], [tab.id]);
  }
});

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const page = getManifest().homepage_url;
    const {name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, currentWindow: true}, tbs => tabs.create({
              url: page + '&version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '&rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
