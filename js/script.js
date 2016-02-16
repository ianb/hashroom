/* jshint browser:true */
/* globals React, ReactDOM, Firebase, addMessageListener, sendAsyncMessage */
"use strict";var _extends = Object.assign || function (target) {for (var i = 1; i < arguments.length; i++) {var source = arguments[i];for (var key in source) {if (Object.prototype.hasOwnProperty.call(source, key)) {target[key] = source[key];}}}return target;};
var firebase = new Firebase('https://blistering-inferno-6839.firebaseio.com/room/test');
var displayName;
var zoomClip;
var data = { pages: {} };

class PageList extends React.Component {

  render() {
    let pages = Object.keys(this.props.pages).map(id => {
      return this.props.pages[id];});

    pages.sort(function (a, b) {
      if (b.time < a.time) {
        return -1;}

      return 1;});

    console.log("rendering with pages", pages);
    let pageEls = pages.map(page => {
      return React.createElement(Page, _extends({}, page, { key: page.pageId }));});

    return React.createElement("div", null, 
    React.createElement("h1", null, "Pages:"), 
    React.createElement("div", { className: "page-list" }, 
    pageEls, 
    pageEls.length ? null : React.createElement("div", null, "This room is empty")));}}






class Page extends React.Component {

  render() {
    let clips = [];
    for (let clip of this.props.clips || []) {
      clips.push(React.createElement(ClipThumb, { clip: clip, pageId: this.props.pageId, key: clip.src }));}

    let className = "page " + (this.props.pinned ? "pinned" : "unpinned");
    return React.createElement("div", { className: className, key: this.props.pageId }, 
    React.createElement("div", { className: "header" }, 
    React.createElement("div", { className: "link" }, React.createElement("a", { href: this.props.url }, this.getDomain())), 
    React.createElement("div", { className: "favorite", onClick: this.onClickFavorite.bind(this) })), 

    React.createElement("h3", null, React.createElement("a", { href: this.props.url }, this.getTitle())), 
    this.props.image ? React.createElement("img", { src: this.props.image.src, title: this.props.image.title, className: "main-image" }) : null, 
    clips, 
    React.createElement(PageJson, { id: this.props.pageId }), 
    React.createElement("button", { onClick: this.onClickDelete.bind(this) }, React.createElement("img", { src: "./trash.svg", style: { height: "1em", width: "1em" } })));}



  onClickFavorite(event) {
    updatePage(this.props.pageId, { pinned: !data.pages[this.props.pageId].pinned });}


  onClickDelete(event) {
    updatePage(this.props.pageId, null);}


  getTitle() {
    return this.props.openGraph && this.props.openGraph.title || this.props.title;}


  getDomain() {
    let domain = this.props.url.replace(/^https?:\/\//i, "");
    domain = domain.split("/")[0];
    domain = domain.replace(/^www\./i, "");
    return domain;}}




class ClipThumb extends React.Component {

  render() {
    return React.createElement("img", { src: this.props.clip.src, title: this.props.clip.text, key: this.props.clip.src, className: "main-image", onClick: this.onExpand.bind(this) });}


  onExpand() {
    zoomClip = { clip: this.props.clip, pageId: this.props.pageId };
    renderSoon();}}




class ZoomClip extends React.Component {

  render() {
    let width = Math.min(window.innerWidth - 200, 800);
    let height = window.innerHeight - 200;
    if (this.props.clip.height) {
      height = Math.min(height, this.props.clip.height + 100);}

    return React.createElement(Lightbox, { width: width, height: height, onBackgroundClick: this.onClose.bind(this) }, 
    React.createElement("div", { style: { backgroundColor: "#fff", minHeight: height } }, 
    React.createElement("img", { src: this.props.clip.src, onClick: this.onClose.bind(this), style: { cursor: "zoom-out", width: "100%", height: "auto", maxHeight: height - 50 + "px" } }), 
    React.createElement("button", { onClick: this.onClose.bind(this) }, "close"), 
    React.createElement("button", { onClick: this.onDelete.bind(this) }, React.createElement("img", { src: "./trash.svg", style: { width: "1em", height: "1em" } }))));}




  onClose() {
    zoomClip = null;
    renderSoon();}


  onDelete() {
    let clips = data.pages[this.props.pageId].clips;
    clips = clips.filter(clip => {
      console.log("checking clip", clip.src == this.props.clip.src, clip.src.length, this.props.clip.src.length);
      if (clip.src == this.props.clip.src) {
        return false;}

      return true;});

    zoomClip = null;
    updatePage(this.props.pageId, { clips: clips });}}




class PageJson extends React.Component {

  render() {
    let page = data.pages[this.props.id];
    if (page.expanded) {
      return React.createElement("div", null, 
      React.createElement("button", { onClick: this.onClickExpand.bind(this) }, "hide JSON"), 
      React.createElement("pre", { style: { backgroundColor: "#fff", fontSize: "90%" } }, JSON.stringify(this.truncatedCopy(page), null, "  ")));} else 

    {
      return React.createElement("button", { onClick: this.onClickExpand.bind(this) }, "JSON");}}



  truncatedCopy(obj) {
    if (typeof obj == "string") {
      if (obj.length > 70) {
        return obj.substr(0, 30) + "..." + obj.substr(obj.length - 30);}

      return obj;}

    if (obj === null || typeof obj != "object") {
      return obj;}

    if (Array.isArray(obj)) {
      return obj.map(item => this.truncatedCopy(item));}

    let result = {};
    for (let attr in obj) {
      result[attr] = this.truncatedCopy(obj[attr]);}

    return result;}


  onClickExpand() {
    updatePage(this.props.id, { expanded: !data.pages[this.props.id].expanded });}}




class Lightbox extends React.Component {

  render() {
    let width = parseInt(this.props.width, 10);
    let height = parseInt(this.props.height, 10);
    let opacity = this.props.opacity || "0.5";
    let shade = this.props.shade || "#000";
    function makeStyle(input) {
      let props = { 
        position: "fixed", 
        backgroundColor: shade, 
        opacity: opacity };

      for (let key in input) {
        props[key] = input[key];}

      return props;}

    let barHeight = (window.innerHeight - height) / 2;
    let barWidth = (window.innerWidth - width) / 2;
    let onClick = this.props.onBackgroundClick || function () {};
    return React.createElement("div", null, 
    React.createElement("div", { style: makeStyle({ top: 0, left: 0, width: "100%", height: barHeight }), onClick: onClick }), 
    React.createElement("div", { style: makeStyle({ top: barHeight, left: 0, width: barWidth, height: height }), onClick: onClick }), 
    React.createElement("div", { style: makeStyle({ top: barHeight, left: barWidth + width, width: barWidth, height: height }), onClick: onClick }), 
    React.createElement("div", { style: makeStyle({ top: barHeight + height, left: 0, width: "100%", height: barHeight }), onClick: onClick }), 
    React.createElement("div", { style: { position: "fixed", top: barHeight, left: barWidth, height: height, width: width } }, 
    this.props.children));}}






class DisplayNameQuery extends React.Component {

  render() {
    return React.createElement(Lightbox, { height: "100", width: "400" }, 
    React.createElement("div", { style: { padding: "5px" } }, 
    React.createElement("label", { style: { fontWeight: "bold" }, htmlFor: "textbox" }, "Please enter a name:"), 
    React.createElement("div", null, 
    React.createElement("input", { type: "text", id: "textbox", ref: "textbox", style: { width: "380px" }, onKeyUp: this.onKeyUp.bind(this) })), 

    React.createElement("div", null, 
    React.createElement("button", { style: { width: "388px", marginTop: "5px" }, onClick: this.onSave.bind(this) }, "Save"))));}





  componentDidMount() {
    this.refs.textbox.focus();}


  onKeyUp(event) {
    if (event.keyCode == 13) {
      this.onSave();
      return false;}

    return undefined;}


  onSave() {
    let val = this.refs.textbox.value;
    if (!val) {
      return;}

    localStorage.setItem("displayName", val);
    displayName = val;
    renderSoon();}}




function render() {
  let list = React.createElement(PageList, data);
  let page = React.createElement("div", null, 
  list, 
  displayName ? null : React.createElement(DisplayNameQuery, null), 
  zoomClip ? React.createElement(ZoomClip, { clip: zoomClip.clip, pageId: zoomClip.pageId }) : null);

  ReactDOM.render(
  page, 
  document.getElementById("container"));}



displayName = localStorage.getItem("displayName");


function renderSoon() {
  setTimeout(render);}


function updatePage(id, attrs, source) {
  if (!attrs) {
    delete data.pages[id];} else 
  if (!data.pages[id]) {
    if (!attrs.pageId) {
      attrs.pageId = id;}

    data.pages[id] = attrs;} else 
  {
    for (let attr in attrs) {
      data.pages[id][attr] = attrs[attr];}}


  if (source != "firebase") {
    console.log("sending data to Firebase:", id, attrs);
    let childPage = firebase.child(id);
    if (!attrs) {
      childPage.set(null);} else 
    {
      childPage.update(attrs);}}


  if (source != "addon") {
    sendAsyncMessage("UpdatePage", { id: id, attrs: attrs });}

  renderSoon();}


firebase.on("child_added", function (snapshot) {
  let page = snapshot.val();
  updatePage(page.pageId, page, "firebase");});


firebase.on("child_changed", function (snapshot) {
  let page = snapshot.val();
  let id = snapshot.key();
  updatePage(id, page, "firebase");});


firebase.on("child_removed", function (snapshot) {
  updatePage(snapshot.key(), null, "firebase");});


if (typeof addMessageListener !== "undefined") {
  addMessageListener("UpdatePage", function (event) {
    try {
      updatePage(event.data.id, event.data.attrs, "addon");} 
    catch (e) {
      console.error(e, e.stack);
      throw e;}});


  addMessageListener("UpdateAllPages", function (event) {
    try {
      for (let pageId in event.data.pages) {
        let page = event.data.pages[pageId];
        updatePage(pageId, page, "addon");}} 

    catch (e) {
      console.error(e, e.stack);
      throw e;}});}

