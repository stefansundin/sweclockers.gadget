
//Gadget prefs (specified in theme)
var prefs = new Object();
prefs.docked = new Object();
prefs.large = new Object();

//System.* stuff
System.Gadget.settingsUI = "settings.html";
System.Gadget.onSettingsClosed = settingsClosed;
System.Gadget.Flyout.onHide = flyoutHide;
System.Gadget.onDock = updatesize;
System.Gadget.onUndock = updatesize;

//Some global variables
var entries;
var lastview = "snippet";
var read = [];
var flyout = new Object();
flyout.entry = null;
flyout.index = null;
flyout.item = null;

//Timers
var scrolltimer;
var refreshtimer;

//Entry point
function init() {
	dbg("init");
	//First run?
	if (System.Gadget.Settings.readString("feed") == "") {
		System.Gadget.Settings.writeString("feed", "news");
		System.Gadget.Settings.writeString("feedurl", "http://");
		System.Gadget.Settings.writeString("theme", "recover");
		System.Gadget.Settings.write("showscrollbar", false);
		System.Gadget.Settings.write("updateinterval", 300);
		System.Gadget.Settings.writeString("view", "auto");
		System.Gadget.Settings.writeString("read", "");
	}
	//Get read
	var r = System.Gadget.Settings.readString("read");
	if (r != "") {
		read = r.split(",");
	}
	//Update
	//updatescroll();
	update();
	dbg("init done");
}

function update() {
	dbg("update");
	var contents = document.getElementById("contents");
	
	//Updating text
	var updating = document.getElementById("updating");
	updating.style.display = "block";
	
	//Remember scroll position
	var scrollpos = contents.scrollTop;
	
	//Get url
	var feed = System.Gadget.Settings.readString("feed");
	var url;
	if (feed == "news"
	 || feed == "articles"
	 || feed == "market"
	 || feed == "forum") {
		url = "http://www.sweclockers.com/feeds/"+feed+"."+(feed=="forum"?"php":"xml");
	}
	else {
		url = System.Gadget.Settings.readString("feedurl");
		if (url == "http://") {
			print();
			return;
		}
	}
	//Apply cachebuster
	url += ((url.indexOf("?")==-1)?"?":"&")+(new Date().getTime());
	
	//Get RSS
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
			if (xhr.status == 200) {
				dbg("xhr 1");
				var xml;
				if (xhr.getResponseHeader("Content-Type") == "application/xml") {
					xml = xhr.responseXML;
				}
				else {
					//Use XMLDOM to parse text to XML (this happens when the server replies with the wrong content-type)
					var xmldom = new ActiveXObject("Microsoft.XMLDOM");
					xmldom.loadXML(xhr.responseText);
					xml = xmldom;
				}
				//Parse XML
				parsefeed(xml);
				contents.scrollTop = scrollpos;
				if (!System.Gadget.Flyout.show) {
					contents.focus();
				}
				dbg("xhr done");
			}
			else {
				//Remove old items
				while (contents.hasChildNodes()) {
					contents.removeChild(contents.firstChild);
				}
				var updating = document.getElementById("updating");
				updating.style.display = "none";
				//Display error
				contents.appendChild(document.createTextNode("Error: "+xhr.status));
			}
			updatescroll();
		}
	};
	xhr.open("GET", url, true);
	xhr.send();
	
	//Refresh
	clearTimeout(refreshtimer);
	refreshtimer = setTimeout(update, System.Gadget.Settings.read("updateinterval")*1000);
	dbg("update done");
}

function parsefeed(xml) {
	dbg("parsefeed");
	//Variables
	entries = [];
	var markallread = (read.length == 0); //If no items have been read so far, mark all items received as read so they can be easily distinguised from new items arriving later
	var feed = System.Gadget.Settings.readString("feed");
	var forumfeed = (feed == "forum");
	//RSS or Atom?
	var type = (xml.getElementsByTagName("rss").length==1?"rss":"atom");
	var tags = new Object();
	tags.item = (type=="rss"? "item": "entry");
	tags.title = "title";
	tags.link = "link";
	tags.desc = (type=="rss"? "description": "summary");
	tags.category = "category";
	tags.date = (type=="rss"? "pubDate": "updated");
	tags.thread = "comments";
	tags.id = (type=="rss"? "guid": "id");
	//Loop all items
	var items = xml.getElementsByTagName(tags.item);
	for (var i=0; i < items.length; i++) {
		//Read the values into an entry
		var entry = new Object();
		entry.link = "";
		entry.desc = "";
		entry.category = "";
		entry.date = "";
		entry.thread = "";
		entry.id = "";
		//title
		entry.title = items[i].getElementsByTagName(tags.title)[0].childNodes[0].nodeValue;
		//link
		var links = items[i].getElementsByTagName(tags.link);
		if (links.length > 0) {
			entry.link = (type=="rss"? links[0].text: links[0].getAttribute("href"));
		}
		//desc
		if (items[i].getElementsByTagName(tags.desc).length > 0 && !forumfeed) {
			entry.desc = items[i].getElementsByTagName(tags.desc)[0].text;
		}
		//category
		if (items[i].getElementsByTagName(tags.category).length > 0) {
			entry.category = items[i].getElementsByTagName(tags.category)[0].text;
		}
		//date
		if (items[i].getElementsByTagName(tags.date).length > 0) {
			entry.date = items[i].getElementsByTagName(tags.date)[0].text;
		}
		//thread
		if (items[i].getElementsByTagName(tags.thread).length > 0) {
			entry.thread = items[i].getElementsByTagName(tags.thread)[0].text;
		}
		//Replace values
		//Must use regexp to replace all occurences
		//Tip: http://rishida.net/scripts/uniview/conversion.php
		//På något konstigt vis blir vissa tecken konstiga, jag har inte riktigt kommit på varför men här gör jag en temporär fix på tecken som jag har sett i SweClockers nyheter
		entry.title = entry.title.replace(/\u0096/g,"\u2013"); //ndash
		entry.desc = entry.desc.replace(/\u0096/g,"\u2013"); //ndash
		entry.desc = entry.desc.replace(/\u0094/g,"\u201D"); //”
		//Validate data (Never trust your input!)
		//This prevents execution of malicious javascript code
		if (entry.link.indexOf("http://") != 0 && entry.link.indexOf("https://") != 0) {
			entry.link = "";
		}
		if (entry.thread.indexOf("http://") != 0 && entry.thread.indexOf("https://") != 0) {
			entry.thread = "";
		}
		entry.desc = entry.desc.replace(/javascript:/gi,"javascript :");
		//Check if this entry has been read
		entry.read = false;
		if (items[i].getElementsByTagName(tags.id).length > 0) {
			entry.id = items[i].getElementsByTagName(tags.id)[0].childNodes[0].nodeValue;
			if (markallread || read.indexOf(entry.id) != -1) {
				entry.read = true;
			}
			//Put it in the read array if markallread
			if (markallread) {
				read.splice(0, 0, entry.id);
			}
		}
		//Push
		entries.push(entry);
	}
	//Store read array
	if (markallread) {
		store_read();
	}
	//Print entries
	print();
}

function print() {
	dbg("print");
	var contents = document.getElementById("contents");
	
	//Must use a closure like this so the parameter gets "fixed"
	var flyoutclosure = function(index) {
		return function() { openflyout(index); }
	};
	
	//Remove old items
	while (contents.hasChildNodes()) {
		contents.removeChild(contents.firstChild);
	}
	var updating = document.getElementById("updating");
	updating.style.display = "none";
	
	//Print entries
	var feed = System.Gadget.Settings.readString("feed");
	var feedurl = System.Gadget.Settings.readString("feedurl");
	if (feed == "url" && feedurl == "http://") {
		contents.appendChild(document.createTextNode("Här kan du läsa valfri RSS eller Atom feed, men du måste skriva in adressen i inställningarna först!"));
	}
	else if (entries.length == 0) {
		contents.appendChild(document.createTextNode("Ops... inga inlägg hittades."));
	}
	else {
		for (var i=0; i < entries.length; i++) {
			var entry = entries[i];
			
			//Put item in contents
			var item = document.createElement("span");
			item.className = "item"+(entry.read?" read":"");
			item.id = "item"+i;
			item.onclick = flyoutclosure(i);
			item.appendChild(document.createTextNode(entries[i].title));
			contents.appendChild(item);
			//hr
			if (i+1 < entries.length) {
				var hr = document.createElement("hr");
				contents.appendChild(hr);
			}
			
			//entry.item=item;
			
			//Mark this entry as selected if it's open
			if (flyout.entry != null &&
			    ((entry.id != "" && entry.id == flyout.entry.id)
			  || (entry.title == flyout.entry.title))) {
				item.className += " selected";
				flyout.item = item;
			}
		}
	}
	//updatescroll();
}

//Flyout
function openflyout(index, view_override) {
	//Unselect previous item
	var previtem = flyout.item;
	if (previtem) {
		previtem.className = "item read";
	}
	//entry
	var entry;
	if (index != undefined) {
		entry = entries[index];
		flyout.entry = entry;
		flyout.index = index;
		var item = document.getElementById("item"+index);
		flyout.item = item;
		//Mark this entry as read
		item.className = "item read selected";
		if (!entry.read && entry.id != "") {
			read.splice(0, 0, entry.id);
			store_read();
		}
		entry.read = true;
		//Scroll item into view
		var contents = document.getElementById("contents");
		var margin = 6;
		if (item.offsetTop+item.offsetHeight+margin > contents.scrollTop+contents.clientHeight) {
			//This item is further down
			contents.scrollTop = item.offsetTop+item.offsetHeight+margin-contents.clientHeight;
		}
		else if (item.offsetTop-margin < contents.scrollTop) {
			//This item is further up
			contents.scrollTop = item.offsetTop-margin;
		}
		//contents.scrollTop = (item.offsetTop+item.offsetHeight/2)-contents.clientHeight/2; //Use this to center item
	}
	//view
	var ctrl = (window.event?window.event.ctrlKey:false);
	var shift = (window.event?window.event.shiftKey:false);
	var view = System.Gadget.Settings.readString("view");
	var v = (view == "auto"?lastview:view);
	if (entry == undefined || (entry.desc == "" && view == "auto")) {
		v = "iframe";
	}
	if (ctrl) {
		v = "web";
	}
	else if (shift) {
		v = (view=="auto" || view=="snippet"?"iframe":"snippet");
	}
	v = (view_override?view_override:v);
	//Now open
	if (v == "web") {
		//web
		var url = "http://www.sweclockers.com/";
		if (index != undefined) {
			url = entry.link;
		}
		if (url != "") {
			System.Shell.execute(url);
		}
	}
	else if (v == "iframe") {
		//iframe
		System.Gadget.Flyout.file = "iframe.html";
		System.Gadget.Flyout.show = true;
	}
	else {
		//If nothing else, snippet
		System.Gadget.Flyout.file = "snippet.html";
		System.Gadget.Flyout.show = true;
	}
}

function flyoutHide() {
	var v = System.Gadget.Settings.readString("view");
	if (v == "auto") {
		lastview="snippet";
	}
	//Remove selected effect on the entry
	var entry = flyout.entry;
	var item = flyout.item;
	item.className = "item";
	if (entry.read) {
		item.className += " read";
	}
	else {
		//The entry has been marked as unread
		var readpos = read.indexOf(entry.id);
		if (readpos != -1) {
			read.splice(readpos,1);
		}
		store_read();
	}
	//Clear flyout variables
	flyout.entry = null;
	flyout.index = null;
	flyout.item = null;
}

//Settings
function settingsClosed(event) {
	if (event.closeAction == event.Action.commit) {
		//size
		updatesize();
		//lastview
		var v = System.Gadget.Settings.readString("view");
		if (v == "auto") {
			lastview="snippet";
		}
		//update
		update();
	}
}

function store_read() {
	//Trim read array so it doesn't exceed 100 items (removing items read long ago first)
	var maxnumitems = 100;
	if (read.length > maxnumitems) {
		read.splice(maxnumitems, read.length-maxnumitems);
	}
	//Write read to storage
	System.Gadget.Settings.writeString("read", read.join(","));
}

//Feeds
function changefeed(newfeed) {
	//Select new feed
	System.Gadget.Settings.writeString("feed", newfeed);
	//Update feedsel
	updatefeedsel();
	//Update
	goup();
	update();
}

function updatefeedsel() {
	var feed = System.Gadget.Settings.readString("feed");
	var feeds = ["news", "articles", "market", "forum", "url"];
	var docked = System.Gadget.docked;
	for (var i=0; i < feeds.length; i++) {
		var f = document.getElementById("feed_"+feeds[i]);
		f.className = "feed feed-"+(docked?"docked":"large");
		if (feeds[i] == feed) {
			f.className += " feedsel";
		}
	}
}

function updatesize() {
	var theme = System.Gadget.Settings.readString("theme");
	var docked = System.Gadget.docked;
	var size = (docked?prefs.docked:prefs.large);
	var s = (docked?"docked":"large");
	
	//Load themejs and themecss
	document.getElementById("themejs").src = "themes/"+theme+"/gadget.js";
	document.getElementById("themecss").href = "themes/"+theme+"/gadget.css";
	
	//Background and size
	System.Gadget.background = "themes/"+theme+"/bg-"+s+".png";
	var body = document.body;
	body.style.width = size.width;
	body.style.height = size.height;
	body.scrollTop = 0;
	body.scrollLeft = 0;
	
	//Update docked/large class for elements
	var updatelink = document.getElementById("updatelink");
	updatelink.className = "updatelink-"+s;
	var sclink = document.getElementById("sclink");
	sclink.className = "sclink-"+s;
	var updating = document.getElementById("updating");
	updating.className = "updating-"+s;
	var contents = document.getElementById("contents");
	contents.className = "contents-"+s;
	var scrollup = document.getElementById("scrollup");
	scrollup.className = "scrollup-"+s;
	var scrolldown = document.getElementById("scrolldown");
	scrolldown.className = "scrolldown-"+s;
	
	//Update feedsel
	updatefeedsel();
	
	//Scrollbar
	if (System.Gadget.Settings.read("showscrollbar")) {
		contents.style.overflow="auto";
		contents.onmousedown = null;
		contents.onmouseup = null;
		contents.onblur = null;
	}
	else {
		contents.style.overflow = "hidden";
		contents.onmousedown = mousedown;
		contents.onmouseup = mouseup;
		contents.onblur = hidescrollbar;
	}
}

//Middle-mouse button scrolling stuff (when scrollbar is disabled)
function mousedown() {
	var button = window.event.button;
	if (button == 4) {
		var contents = document.getElementById("contents");
		var docked = System.Gadget.docked;
		contents.style.overflow = "auto";
		contents.style.width = (docked?"136px":"160px");
		updatescroll();
	}
	else {
		hidescrollbar();
	}
}

function mouseup() {
	var button = window.event.button;
	if (button == 4) {
		hidescrollbar();
	}
}

function hidescrollbar() {
	var contents = document.getElementById("contents");
	contents.style.overflow = "hidden";
	contents.style.width = "";
	updatescroll();
}

//Keyboard
function key(c) {
	var c = (c?c:String.fromCharCode(window.event.keyCode).toLowerCase());
	if (c == "j") {
		down();
	}
	else if (c == "k") {
		up();
	}
	else if (c == "f" || c == "s" || c == "w") {
		var nextindex = flyout.index;
		if (c == "s" && nextindex == undefined) {
			nextindex=0;
		}
		openflyout(nextindex, (c=="f"?"iframe": c=="s"?"snippet": "web"));
	}
	else if (c == "c") {
		System.Gadget.Flyout.show = false;
	}
	else if (c == "n") {
		nextunread();
	}
	else if (c == "1" || c == "2" || c == "3" || c == "4" || c == "5") {
		var newfeed = (c=="1"?"news": c=="2"?"articles": c=="3"?"market": c=="4"?"forum": "url");
		changefeed(newfeed);
	}
	else if (c == "r") {
		update();
	}
}

function down() {
	//Step nextindex
	var nextindex = flyout.index;
	if (nextindex == undefined) {
		nextindex = 0;
	}
	else if (System.Gadget.Flyout.show) {
		nextindex++;
	}
	if (nextindex >= entries.length) {
		nextindex = 0;
	}
	openflyout(nextindex);
}

function up() {
	//Step nextindex
	var nextindex = flyout.index;
	if (nextindex == undefined) {
		nextindex = entries.length-1;
	}
	else if (System.Gadget.Flyout.show) {
		nextindex--;
	}
	if (nextindex < 0) {
		nextindex = entries.length-1;
	}
	openflyout(nextindex);
}

function nextunread() {
	//Go to next unread entry in chronological order
	for (var i=entries.length-1; i >= 0; i--) {
		var entry = entries[i];
		if (!entry.read) {
			//This is the next unread entry
			openflyout(i);
			break;
		}
	}
}

//Scroll
function startscrollup() {
	scrolltimer = setTimeout(scrollup, 150);
}

function startscrolldown() {
	scrolltimer = setTimeout(scrolldown, 150);
}

function scrollup() {
	var contents = document.getElementById("contents");
	contents.scrollTop -= 1;
	if (contents.scrollTop != 0) {
		scrolltimer = setTimeout(scrollup, 10);
	}
	updatescroll();
}

function scrolldown() {
	var contents = document.getElementById("contents");
	contents.scrollTop += 1;
	if (contents.scrollTop+contents.clientHeight < contents.scrollHeight) {
		scrolltimer = setTimeout(scrolldown, 10);
	}
	updatescroll();
}

function stopscroll() {
	clearTimeout(scrolltimer);
	updatescroll();
}

function goup() {
	var contents = document.getElementById("contents");
	contents.scrollTop = 0;
	updatescroll();
}

function godown() {
	var contents = document.getElementById("contents");
	contents.scrollTop = contents.scrollHeight-contents.clientHeight;
	updatescroll();
}

function updatescroll() {
	var contents = document.getElementById("contents");
	//Hide or show scrollers
	var scrollup = document.getElementById("scrollup");
	var scrolldown = document.getElementById("scrolldown");
	scrollup.style.display = (contents.scrollTop == 0?"none":"block");
	scrolldown.style.display = (contents.scrollTop+contents.clientHeight >= contents.scrollHeight?"none":"block");
	//Change the arrow on the top scroller if there's an unread item above
	var moveup = document.getElementById("moveup");
	var unread = false;
	if (scrollup.style.display == "block") {
		for (var i=0; i < entries.length; i++) {
			if (!entries[i].read) {
				var item = document.getElementById("item"+i);
				if (item.offsetTop < contents.scrollTop) {
					moveup.src = "images/moveup-unread.png";
					unread = true;
					break;
				}
			}
		}
	}
	if (!unread) {
		moveup.src = "images/moveup.png";
	}
}

//Debug
function dbg(txt) {
	var debug = document.getElementById("debug");
	if (debug.style.display != "none") {
		debug.appendChild(document.createTextNode(txt));
		debug.appendChild(document.createElement("br"));
	}
}

function clrdbg() {
	var debug = document.getElementById("debug");
	while (debug.hasChildNodes()) {
		debug.removeChild(debug.firstChild);
	}
}

//Functions missing in IE

//https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Global_Objects/Array/indexOf
if (!Array.prototype.indexOf) {
	Array.prototype.indexOf = function(elt /*, from*/) {
		var len = this.length >>> 0;
		var from = Number(arguments[1]) || 0;
		from = (from < 0) ? Math.ceil(from) : Math.floor(from);
		if (from < 0) {
			from += len;
		}
		for (; from < len; from++) {
			if (from in this && this[from] === elt) {
				return from;
			}
		}
		return -1;
	};
}
