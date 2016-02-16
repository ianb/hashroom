const self = require("sdk/self");
const {Cu, Cc, Ci} = require("chrome");
const tabs = require("sdk/tabs");
const { setTimeout } = require("sdk/timers");
const { ActionButton } = require("sdk/ui/button/action");
const { callScript } = require("./framescripter");
const { prefs } = require('sdk/simple-prefs');
Cu.import("resource://gre/modules/RemotePageManager.jsm");

var ROOM_URL = prefs.server;
if (! ROOM_URL.endsWith("/")) {
  ROOM_URL += "/";
}

let listener = new RemotePages(ROOM_URL);

var data = {pages: {}};

function addPage(tab, attrs) {
  attrs = attrs || {};
  return callScript(
    tab, self.data.url("pin-page.js"), "hashroom@get-data", {}
  ).then(function (result) {
    for (let key in attrs) {
      result[key] = attrs[key];
    }
    if (data.pages[result.pageId]) {
      for (let key in result) {
        data.pages[result.pageId][key] = result[key];
      }
      result = data.pages[result.pageId];
    } else {
      data.pages[result.pageId] = result;
    }
    resync(result.pageId, result);
    return result;
  });
}

function clipPage(tab) {
  var pageId;
  return addPage(tab, {pinned: true}).then(function (result) {
    pageId = result.pageId;
    callScript(
      tab, self.data.url("clip-page.js"), "hashroom@clip-page", {}, 0
    ).then(function (result) {
      var clip = result.clip;
      if (clip) {
        if (! data.pages[pageId].clips) {
          data.pages[pageId].clips = [];
        }
        data.pages[pageId].clips.push(clip);
      }
      resync(pageId, {clips: data.pages[pageId].clips});
      return clip;
    });
  });
}

listener.addMessageListener("RemotePage:Load", function ({target}) {
  console.log("New remote page loaded");
  target.sendAsyncMessage("UpdateAllPages", data);
});

function resync(pageId, attrs) {
  console.log("Updating page", attrs.url || pageId);
  listener.sendAsyncMessage("UpdatePage", {id: pageId, attrs: attrs});
}

function ensureRoomOpen(activate) {
  function matchUrl(url1, url2) {
    url1 = url1.replace(/\/*$/, "");
    url2 = url2.replace(/\/*$/, "");
    return url1 == url2;
  }
  for (let tab of tabs) {
    if (matchUrl(tab.url, ROOM_URL)) {
      if (activate) {
        tab.activate();
      }
      return;
    }
  }
  tabs.open({
    url: ROOM_URL,
    inBackground: ! activate,
    isPinned: true
  });
}

tabs.on("ready", function (tab) {
  if (tab.showHashroom && tabs.activeTab == tab) {
    showNotificationBar();
  }
});

const button = ActionButton({
  id: "hashroom-button",
  label: "Start Hashroom",
  icon: self.data.url("heart.svg"),
  onClick: function(state) {
    showNotificationBar();
  }
});

function getNotificationBox(browser) {
  let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
  let win = wm.getMostRecentWindow("navigator:browser");
  let gBrowser = win.gBrowser;

  browser = browser || gBrowser.selectedBrowser;
  return gBrowser.getNotificationBox(browser);
}

var initialized = false;

function showNotificationBar(shotcontext) {
  ensureRoomOpen();
  var nb = require("./notificationbox");
  if (nb.notificationbox().getNotificationWithValue("hashroom-notification-bar") !== null) {
    return;
  }
  let thebox = nb.notificationbox();
  let fragment = thebox.ownerDocument.createDocumentFragment();
  let node = thebox.ownerDocument.createElement("button");
  node.textContent = "My room";
  node.onclick = function () {
    console.log("VIEW ALL MY ROOM");
    ensureRoomOpen(true);
  };
  node.style.textAlign = "center";
  node.style.fontWeight = "normal";
  node.style.borderRadius = "4px";
  node.style.background = "#fbfbfb";
  node.style.color = "black";
  let node2 = thebox.ownerDocument.createElement("span");
  node2.style.border = "none";
  node2.style.marginLeft = "10px";
  node2.appendChild(thebox.ownerDocument.createTextNode("Everything you browse is saved to your hashroom."));
  fragment.appendChild(node);
  fragment.appendChild(node2);
  let banner = nb.banner({
    id: "hashroom-notification-bar",
    msg: fragment,
    buttons: [
      nb.buttonMaker.yes({
        label: "Clip",
        callback: function(notebox, button) {
          setTimeout(function () {
            console.log("clip this", tabs.activeTab.url);
            clipPage(tabs.activeTab);
            showNotificationBar();
          }, 0);
        }
      }),
      nb.buttonMaker.yes({
        label: "Pin",
        callback: function(notebox, button) {
          setTimeout(function () {
            console.log("pin this", tabs.activeTab.url);
            addPage(tabs.activeTab, {pinned: true});
            showNotificationBar();
          }, 0);
        }
      }),
      nb.buttonMaker.no({
        label: "Close",
        callback: function(notebox, button) {
          setTimeout(function () {
            hideNotificationBar();
          }, 0);
        }
      })
    ]
  });

  let notice = banner.notice;
  let asdf = "";
  for (var i in notice) {
    asdf += i + " ";
  }
  //console.log("NOTICE", asdf);
  //console.log("imAGE", typeof notice.shadowRoot);
  /*let button = notice.ownerDocument.createElement("button");
  let checkbox = notice.ownerDocument.createElement("checkbox");
  checkbox.label = "Save full page";
  let checkboxLabel = notice.ownerDocument.createTextNode("Save full page");
  button.appendChild(checkbox);
  button.appendChild(checkboxLabel);
  button.onclick = function () {
    checkbox.checked = !checkbox.checked;
    console.log("SAVE FULL PAGE", checkbox.checked);
  }
  notice.insertBefore(button, notice.firstChild);*/

  if (!initialized) {
    Cu.import("resource://gre/modules/Services.jsm");

    initialized = true;
    // Load our stylesheets.
    let styleSheetService = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);

    let cssurl = self.data.url("hashroom-notification-bar.css");

    let styleSheetURI = Services.io.newURI(cssurl, null, null);
    styleSheetService.loadAndRegisterSheet(styleSheetURI,
                                           styleSheetService.AUTHOR_SHEET);
  }
/*  let box = getNotificationBox();
  let notification = box.getNotificationWithValue("hashroom-notification-banner");
  console.log("NOTIFICATION", notification);
*/
  tabs.activeTab.showHashroom = true;
  addPage(tabs.activeTab);
}

function hideNotificationBar(browser) {
  tabs.activeTab.showHashroom = false;
  let box = getNotificationBox(browser);
  let notification = box.getNotificationWithValue("hashroom-notification-banner");
  let removed = false;
  if (notification) {
    box.removeNotification(notification);
    removed = true;
  }
  return removed;
}

exports.onUnload = function (reason) {
  hideNotificationBar();
  require("./framescripter").unload();
  listener.destroy();
};
