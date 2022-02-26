'use strict';

const post = chrome.runtime.sendMessage;

const config = {
  button: 0,
  metaKey: false,
  altKey: true,
  ctrlKey: false,
  shiftKey: true,
  enabled: false,
  urls: [],
  hosts: [],
  keywords: [],
  topRedict: false,
  reverse: false,
  duplicate: false
};

const isValid = (a, callback, isTop = false) => {
  if (config.hosts.length) {
    const host = a.hostname;
    if (host) {
      if (config.hosts.some(h => h.endsWith(host) || host.endsWith(h))) {
        return config.reverse ? '' : callback(a.href);
      }
    }
  }
  // URL matching
  if (config.urls.length) {
    const href = a.href;
    try {
      for (const h of config.urls) {
        const m = new window.URLPattern(h);
        if (m.test(href)) {
          return config.reverse ? '' : callback(a.href);
        }
      }
    }
    catch (e) {
      if (href && config.urls.some(h => href.startsWith(h))) {
        return config.reverse ? '' : callback(a.href);
      }
    }
  }
  // keyword matching
  if (config.keywords.length) {
    const href = a.href;
    if (href && config.keywords.some(w => href.indexOf(w) !== -1)) {
      return config.reverse ? '' : callback(a.href);
    }
  }
  // reverse mode
  if (config.reverse) {
    if (a.href && (a.href.startsWith('http') || a.href.startsWith('file'))) {
      if ((a.getAttribute('href') || '').startsWith('#') === false || isTop) {
        return callback(a.href);
      }
    }
  }
};
chrome.storage.local.get(config, prefs => {
  Object.assign(config, prefs);
  // managed
  chrome.storage.managed.get({
    hosts: [],
    urls: [],
    reverse: false
  }, prefs => {
    if (!chrome.runtime.lastError) {
      config.reverse = config.reverse || prefs.reverse;
      config.urls.push(...prefs.urls);
      config.hosts.push(...prefs.hosts);
    }
    // top level redirect
    if (config.topRedict && window.top === window) {
      isValid(location, url => {
        if (history.length) {
          history.back();
        }
        else {
          window.stop();
        }
        post({
          cmd: 'open-in',
          url
        });
      }, true);
    }
  });
});

chrome.storage.onChanged.addListener(e => {
  Object.keys(e).forEach(n => config[n] = e[n].newValue);
});

document.addEventListener('click', e => {
  const redirect = url => {
    if (config.duplicate !== true) {
      e.stopImmediatePropagation();
      e.stopPropagation();
      e.preventDefault();
    }
    post({
      url,
      cmd: 'open-in'
    });
    return false;
  };
  // hostname on left-click
  if (e.button === 0 && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
    const bol = config.hosts.length || config.urls.length || config.keywords.length || config.reverse;
    if (bol) {
      let a = e.target.closest('a');
      if (a) {
        if (a.href.startsWith('https://www.google') && a.href.indexOf('&url=') !== -1) {
          const link = decodeURIComponent(a.href.split('&url=')[1].split('&')[0]);
          a = new URL(link);
        }
        isValid(a, redirect);
      }
    }
  }
  // click + modifier
  if (
    config.enabled &&
    e.button === config.button &&
    e.altKey === config.altKey &&
    e.ctrlKey === config.ctrlKey &&
    e.metaKey === config.metaKey &&
    e.shiftKey === config.shiftKey
  ) {
    const a = e.target.closest('a');
    if (a && a.href) {
      return redirect(a.href);
    }
  }
}, true);
