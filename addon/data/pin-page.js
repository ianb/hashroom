const uuidGenerator = Components.classes["@mozilla.org/uuid-generator;1"]
                      .getService(Components.interfaces.nsIUUIDGenerator);

function makeUuid() {
  var uuid = uuidGenerator.generateUUID();
  uuid = uuid.toString();
  // Strips off {}:
  return uuid.substr(1, uuid.length-2);
}

function getDocument() {
  return content.document;
}

let tabUuid = makeUuid();

let MIN_IMAGE_WIDTH = 200;
let MIN_IMAGE_HEIGHT = 100;

function getData() {
  let pageId = content._hashroomId;
  if (! pageId) {
    pageId = content._hashroomId = makeUuid();
  }
  let props = {
    title: content.document.title,
    url: content.location.href,
    tabId: tabUuid,
    pageId: content._hashroomId,
    time: Date.now(),
    images: []
  };
  let els = content.document.getElementsByTagName("img");
  let bestWidth = 0;
  for (let i=0; i<els.length; i++) {
    let el = els[i];
    if (! isVisible(el)) {
      console.log("skipping image", el.src);
      continue;
    }
    if (el.width < MIN_IMAGE_WIDTH || el.height < MIN_IMAGE_HEIGHT) {
      continue;
    }
    props.images.push(packImage(el));
    if (el.width > bestWidth) {
      bestWidth = el.width;
      props.image = packImage(el);
    }
  }
  props.openGraph = getOpenGraph();
  props.twitterCard = getTwitterCard();
  return props;
}

function isVisible(element) {
  while (element && element.tagName != "BODY") {
    let style;
    try {
      style = content.getComputedStyle(element);
    } catch (e) {
      console.log("bad element:", element, e+"");
    }
    if (style && style.display == "none") {
      return false;
    }
    element = element.parentNode;
  }
  return true;
}

function packImage(element) {
  return {
    src: element.src,
    title: element.getAttribute("title"),
    alt: element.getAttribute("alt"),
    height: element.height,
    width: element.width
  };
}

function getOpenGraph() {
  let openGraph = {};
  // If you update this, also update _OPENGRAPH_PROPERTIES in shot.js:
  let openGraphProperties = "title type url image audio description determiner locale site_name video image:secure_url image:type image:width image:height video:secure_url video:type video:width image:height audio:secure_url audio:type article:published_time article:modified_tim article:expiration_time article:author article:section article:tag book:author book:isbn book:release_date book:tag profile:first_name profile:last_name profile:username profile:gender".split(/\s+/g);
  for (let i=0; i<openGraphProperties.length; i++) {
    let prop = openGraphProperties[i];
    let elems = getDocument().querySelectorAll("meta[property='og:" + prop + "']");
    let value;
    if (elems.length > 1) {
      value = [];
      for (let i=0; i<elems.length; i++) {
        let v = elems[i].getAttribute("content");
        if (v) {
          value.push(v);
        }
      }
      if (! value.length) {
        value = null;
      }
    } else if (elems.length === 1) {
      value = elems[0].getAttribute("content");
    }
    if (value) {
      openGraph[prop] = value;
    }
  }
  return openGraph;
}

function getTwitterCard() {
  let twitterCard = {};
  // If you update this, also update _TWITTERCARD_PROPERTIES in shot.js:
  let properties = "card site title description image player player:width player:height player:stream player:stream:content_type".split(/\s+/g);
  for (let i=0; i<properties.length; i++) {
    let prop = properties[i];
    let elem = getDocument().querySelector("meta[name='twitter:" + prop + "']");
    if (elem) {
      let value = elem.getAttribute("content");
      if (value) {
        twitterCard[prop] = value;
      }
    }
  }
  return twitterCard;
}

// framescripter infrastructure:
let isDisabled = false;
addMessageListener("hashroom@get-data:call", function handler(event) {
  if (isDisabled) {
    return;
  }
  var result;
  try {
    result = getData();
  } catch (e) {
    console.error("Error getting data:", e);
    console.trace();
    result = {
      error: {
        name: e.name,
        description: e+""
      }
    };
  }
  result.callId = event.data.callId;
  sendAsyncMessage("hashroom@get-data:return", result);
});


addMessageListener("pageshot@disable", function (event) {
  isDisabled = true;
});
