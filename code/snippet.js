
function init() {
	System.Gadget.document.parentWindow.lastview = "snippet";
	var entry = System.Gadget.document.parentWindow.flyout.entry;

	//background
	var theme = System.Gadget.Settings.readString("theme");
	document.getElementById("background").src = "themes/"+theme+"/snippetbg.png";

	//title
	var link = document.getElementById("title-link");
	link.href = entry.link;
	link.appendChild(document.createTextNode(entry.title));

	//category
	document.getElementById("category").appendChild(document.createTextNode(entry.category));

	//date
	if (entry.date != "") {
		var d = new Date(entry.date);
		document.getElementById("date").appendChild(document.createTextNode(" "+d.getFullYear()+"-"+d.getFullMonth()+"-"+d.getFullDate()+" "+d.getFullHours()+":"+d.getFullMinutes()));
	}

	/*//Använd denna kod för att se motsvarande koder för bokstäver, i jakten på bokstäver som försvinner (se gadget.js parsefeed())
	var desc = "";
	for (var i=0; i < entry.desc.length; i++) {
		desc += entry.desc.charAt(i)+" ("+entry.desc.charCodeAt(i)+") ";
	}
	document.getElementById("desc").appendChild(document.createTextNode(entry.desc));
	*/

	//desc
	var desc = document.getElementById("desc");
	desc.innerHTML = entry.desc; //document.getElementById("desc").appendChild(document.createTextNode(desc));

	//link
	document.getElementById("link").href = entry.link;

	//thread
	if (entry.thread != "") {
		var thread = document.getElementById("thread");
		thread.href = entry.thread;
		thread.style.display = "block";
	}

	//Manage height, IE doesn't support max-height :(
	if (desc.clientHeight > 130) {
		desc.style.height = "130px";
		//Increase height of snippet (background becomes buggy)
		/*document.body.style.height = "500px";
		if (desc.clientHeight > 330) {
			desc.style.height = "330px";
		}*/
	}

	//focus
	document.body.focus();
}

function loadiframe() {
	System.Gadget.Flyout.file = "iframe.html";
}

function key() {
	var c = String.fromCharCode(window.event.keyCode).toLowerCase();
	var index = System.Gadget.document.parentWindow.flyout.index;
	if (c == "f") {
		loadiframe();
	}
	else {
		System.Gadget.document.parentWindow.key(c);
	}
}

//Mark as unread
function markunread() {
	var entry = System.Gadget.document.parentWindow.flyout.entry;
	entry.read = false;
	System.Gadget.Flyout.show = false;
}

function markunread_hover() {
	var markunread_img = document.getElementById("markunread_img");
	markunread_img.src = "images/lightbulb.png";
}

function markunread_out() {
	var markunread_img = document.getElementById("markunread_img");
	markunread_img.src = "images/lightbulb_off.png";
}


//Close button
function x() {
	System.Gadget.Flyout.show = false;
}

function x_hover() {
	var x = document.getElementById("x");
	x.src = "images/x_highlight.png";
}

function x_out() {
	var x = document.getElementById("x");
	x.src = "images/x.png";
}

//Date functions
if (!Date.prototype.getFullMonth) {
	Date.prototype.getFullMonth = function() {
		var month = this.getMonth();
		return (month<10?"0"+month:month);
	};
}

if (!Date.prototype.getFullDate) {
	Date.prototype.getFullDate = function() {
		var date = this.getDate();
		return (date<10?"0"+date:date);
	};
}

if (!Date.prototype.getFullHours) {
	Date.prototype.getFullHours = function() {
		var hour = this.getHours();
		return (hour<10?"0"+hour:hour);
	};
}

if (!Date.prototype.getFullMinutes) {
	Date.prototype.getFullMinutes = function() {
		var minute = this.getMinutes();
		return (minute<10?"0"+minute:minute);
	};
}
