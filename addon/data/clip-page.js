/* globals content */
var blockStyles = ["block", "table-cell"];

function startSelection() {
  return new Promise(function (resolve, reject) {
    function onkeyup(event) {
      if (event.keyCode == 27) {
        finish(null);
      }
    }
    var hoverEl;
    var hoverOverEl;
    function onmouseover(event) {
      var el = content.document.elementFromPoint(event.clientX, event.clientY);
      while (el) {
        if (el.nodeType == el.ELEMENT_NODE &&
            blockStyles.indexOf(content.getComputedStyle(el).display) != -1) {
          if (el === hoverOverEl) {
            return;
          }
          hoverOverEl = el;
          if (! hoverEl) {
            hoverEl = content.document.createElement("div");
            content.document.body.appendChild(hoverEl);
            hoverEl.style.pointerEvents = "none";
            hoverEl.style.position = "absolute";
            hoverEl.style.border = "2px solid rgba(100, 100, 255, 0.4)";
            hoverEl.style.zIndex = "90000";
          }
          var rect = absBoundingRect(hoverOverEl);
          hoverEl.style.top = rect.top + "px";
          hoverEl.style.left = rect.left + "px";
          hoverEl.style.width = rect.width + "px";
          hoverEl.style.height = rect.height + "px";
          break;
        }
        el = el.parentNode;
      }
    }
    function disabled(event) {
      event.stopPropagation();
      event.preventDefault();
      console.log("cancelled", event.type, event.target);
      return false;
    }
    function onmouseup(event) {
      event.preventDefault();
      event.stopPropagation();
      if (hoverEl) {
        hoverEl.parentNode.removeChild(hoverEl);
      }
      var rect = absBoundingRect(hoverOverEl);
      var canvas = content.document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
      canvas.width = rect.width;
      canvas.height = rect.height;
      let ctx = canvas.getContext('2d');
      ctx.drawWindow(content, rect.left, rect.top, rect.width, rect.height, "#000");
      finish({
        src: canvas.toDataURL(),
        text: hoverOverEl.innerText,
        width: rect.width,
        height: rect.height
      });
      return false;
    }
    content.document.addEventListener("keyup", onkeyup, false);
    content.document.addEventListener("mouseover", onmouseover, false);
    content.document.addEventListener("mouseup", onmouseup, true);
    content.document.addEventListener("mousedown", disabled, false);
    var clickDisabler = disableLinks();
    content.document.addEventListener("click", disabled, true);
    function finish(value) {
      content.document.removeEventListener("keyup", onkeyup, false);
      content.document.removeEventListener("mouseover", onmouseover, false);
      content.document.removeEventListener("mouseup", onmouseup, true);
      content.document.removeEventListener("mousedown", disabled, false);
      content.document.removeEventListener("click", disabled, true);
      clickDisabler();
      if (hoverEl && hoverEl.parentNode) {
        hoverEl.parentNode.removeChild(hoverEl);
        hoverEl = null;
      }
      resolve(value);
    }
  });
}

function disableLinks() {
  var links = Array.from(content.document.querySelectorAll("a"));
  function disabled(event) {
    console.log("force", event.type, event.target);
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
  for (var i=0; i<links.length; i++) {
    links[i].addEventListener("click", disabled, true);
  }
  return function () {
    for (var i=0; i<links.length; i++) {
      links[i].removeEventListener("click", disabled, true);
    }
  };
}

function absBoundingRect(el) {
  var rect = el.getBoundingClientRect();
  return {
    top: rect.top + content.scrollY,
    left: rect.left + content.scrollX,
    width: rect.width,
    height: rect.height
  };
}

// framescripter infrastructure:
let isDisabled = false;
addMessageListener("hashroom@clip-page:call", function handler(event) {
  if (isDisabled) {
    return;
  }
  return startSelection().then(function (result) {
    result = {
      clip: result,
      callId: event.data.callId
    };
    sendAsyncMessage("hashroom@get-data:return", result);
  }).catch(function (e) {
    console.error("Error getting data:", e);
    console.trace();
    result = {
      error: {
        name: e.name,
        description: e+""
      }
    };
    result.callId = event.data.callId;
    sendAsyncMessage("hashroom@get-data:return", result);
  });
});


addMessageListener("pageshot@disable", function (event) {
  isDisabled = true;
});
