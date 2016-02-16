"use strict";
var firebase = new Firebase('https://blistering-inferno-6839.firebaseio.com/room/test');

var data = {pages: {}};

class PageList extends React.Component {

  render() {
    let pages = Object.keys(this.props.pages).map((id) => {
      return this.props.pages[id];
    });
    pages.sort(function (a, b) {
      if (b.time < a.time) {
        return -1;
      }
      return 1;
    });
    console.log("rendering with pages", pages);
    let pageEls = pages.map((page) => {
      return <Page {...page} key={page.pageId} />;
    });
    return <div>
      <h1>Pages:</h1>
      <div className="page-list">
        {pageEls}
        <pre>{JSON.stringify(this.props.data, null, "  ")}</pre>
      </div>
    </div>;
  }

}

class Page extends React.Component {

  render() {
    let clips = [];
    for (let clip of this.props.clips || []) {
      clips.push(<img src={clip.src} title={clip.text} key={clip.src} className="main-image" />);
    }
    let className = "page " + (this.props.pinned ? "pinned" : "unpinned");
    return <div className={className} key={this.props.pageId}>
      <div className="header">
        <div className="link"><a href={this.props.url}>{this.getDomain()}</a></div>
        <div className="favorite" onClick={this.onClickFavorite.bind(this)}></div>
      </div>
      <h3><a href={this.props.url}>{this.getTitle()}</a></h3>
      {this.props.image ? <img src={this.props.image.src} title={this.props.image.title} className="main-image" /> : null}
      {clips}
      <PageJson id={this.props.pageId} />
    </div>;
  }

  onClickFavorite(event) {
    updatePage(this.props.pageId, {pinned: ! data.pages[this.props.pageId].pinned});
  }

  getTitle() {
    return (this.props.openGraph && this.props.openGraph.title) || this.props.title;
  }

  getDomain() {
    let domain = this.props.url.replace(/^https?:\/\//i, "");
    domain = domain.split("/")[0];
    domain = domain.replace(/^www\./i, "");
    return domain;
  }

}

class PageJson extends React.Component {

  render() {
    let page = data.pages[this.props.id];
    return <div className="page-json">
      <button onClick={this.onClickExpand.bind(this)}>{page.expanded ? "-" : "+"}</button>
      {page.expanded ? <pre style={{backgroundColor: "#fff"}}>{JSON.stringify(this.truncatedCopy(page), null, "  ")}</pre> : null}
    </div>;
  }

  truncatedCopy(obj) {
    if (typeof obj == "string") {
      if (obj.length > 70) {
        return obj.substr(0, 30) + "..." + obj.substr(obj.length-30);
      }
      return obj;
    }
    if (obj === null || typeof obj != "object") {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.truncatedCopy(item));
    }
    let result = {};
    for (let attr in obj) {
      result[attr] = this.truncatedCopy(obj[attr]);
    }
    return result;
  }

  onClickExpand() {
    updatePage(this.props.id, {expanded: ! data.pages[this.props.id].expanded});
  }

}

class Lightbox extends React.Component {

  render() {
    let width = parseInt(this.props.width, 10);
    let height = parseInt(this.props.height, 10);
    let opacity = this.props.opacity || "0.5";
    let shade = this.props.shade || "#000";
    function makeStyle(props) {
      props.position = "fixed";
      props.backgroundColor = shade;
      props.opacity = opacity;
      return props;
    }
    let barHeight = (window.innerHeight - height) / 2;
    let barWidth = (window.innerWidth - width) / 2;
    let onClick = this.props.onBackgroundClick || function () {};
    return <div>
      <div style={makeStyle({top: 0, left: 0, width: "100%", height: barHeight})} onClick={onClick}></div>
      <div style={makeStyle({top: barHeight, left: 0, width: barWidth, height: height})} onClick={onClick}></div>
      <div style={makeStyle({top: barHeight, left: barWidth + width, width: barWidth, height: height})} onClick={onClick}></div>
      <div style={makeStyle({top: barHeight + height, left: 0, width: "100%", height: barHeight})} onClick={onClick}></div>
      <div style={{position: "fixed", top: barHeight, left: barWidth, height: height, width: width}}>
        {this.props.children}
      </div>
    </div>;
  }

}

class DisplayNameQuery extends React.Component {

  render() {
    return <Lightbox height="100" width="400">
      <div style={{padding: "5px"}}>
        <label style={{fontWeight: "bold"}} htmlFor="textbox">Please enter a name:</label>
        <div>
          <input type="text" id="textbox" ref="textbox" style={{width: "380px"}} onKeyUp={this.onKeyUp.bind(this)} />
        </div>
        <div>
          <button style={{width: "388px", marginTop: "5px"}} onClick={this.onSave.bind(this)}>Save</button>
        </div>
      </div>
    </Lightbox>;
  }

  componentDidMount() {
    this.refs.textbox.focus();
  }

  onKeyUp(event) {
    if (event.keyCode == 13) {
      this.onSave();
      return false;
    }
    return undefined;
  }

  onSave() {
    let val = this.refs.textbox.value;
    if (! val) {
      return;
    }
    localStorage.setItem("displayName", val);
    displayName = val;
    renderSoon();
  }

}

function render() {
  let list = <PageList {...data} />;
  let page = <div>
    {list}
    {displayName ? null : <DisplayNameQuery />}
  </div>
  ReactDOM.render(
    page,
    document.getElementById("container")
  );
}

let displayName = localStorage.getItem("displayName");


function renderSoon() {
  setTimeout(render);
}

function updatePage(id, attrs, fromRemote) {
  if (! attrs) {
    delete data.pages[id];
  } else if (! data.pages[id]) {
    if (! attrs.pageId) {
      attrs.pageId = id;
    }
    data.pages[id] = attrs;
  } else {
    for (let attr in attrs) {
      data.pages[id][attr] = attrs[attr];
    }
  }
  if (! fromRemote) {
    console.log("sending data:", id, attrs);
    let childPage = firebase.child(id);
    if (! attrs) {
      childPage.set(null);
    } else {
      childPage.update(attrs);
    }
  } else {
    console.log("received data:", id, attrs);
  }
  renderSoon();
}

firebase.on("child_added", function (snapshot) {
  let page = snapshot.val();
  updatePage(page.pageId, page, true);
});

firebase.on("child_changed", function (snapshot) {
  let page = snapshot.val();
  let id = snapshot.key();
  updatePage(id, page, true);
});

firebase.on("child_removed", function (snapshot) {
  updatePage(snapshot.key(), null, true);
});

if (typeof addMessageListener !== "undefined") {
  addMessageListener("UpdatePage", function (event) {
    try {
      updatePage(event.data.id, event.data.attrs);
    } catch (e) {
      console.error(e, e.stack);
      throw e;
    }
  });
  addMessageListener("UpdateAllPages", function (event) {
    try {
      for (let pageId in event.data.pages) {
        let page = event.data.pages[pageId];
        updatePage(pageId, page);
      }
    } catch (e) {
      console.error(e, e.stack);
      throw e;
    }
  });
}
