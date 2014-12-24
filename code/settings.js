System.Gadget.onSettingsClosing = settingsClosing;

var version = 0.8;
var thread = "http://www.sweclockers.com/forum/showthread.php?threadid=868657";

function init() {
	//feed
	feed.value = System.Gadget.Settings.readString("feed");
	//feedurl
	feedurl.value = System.Gadget.Settings.readString("feedurl");
	//theme
	refreshthemes();
	theme.value = System.Gadget.Settings.readString("theme");
	//showscrollbar
	if (System.Gadget.Settings.read("showscrollbar")) {
		showscrollbar.checked = "checked";
	}
	//updateinterval
	updateinterval.value = System.Gadget.Settings.read("updateinterval");
	//view
	view.value = System.Gadget.Settings.readString("view");

	//Thread
	document.getElementById("thread").href = thread;
	//Check for update
	document.getElementById("version").appendChild(document.createTextNode(version));
	// checkforupdate();
}

function settingsClosing(event) {
	if (event.closeAction == event.Action.commit) {
		//Validate
		if (isNaN(updateinterval.value) || parseInt(updateinterval.value) < 20) {
			//Prevent string values and interval below 20 seconds
			updateinterval.value = "20";
			event.cancel = true;
			return;
		}
		//Write new settings
		System.Gadget.Settings.writeString("feed", feed.value);
		System.Gadget.Settings.writeString("feedurl", feedurl.value);
		System.Gadget.Settings.writeString("theme", theme.value);
		System.Gadget.Settings.write("showscrollbar", showscrollbar.checked);
		System.Gadget.Settings.write("updateinterval", parseInt(updateinterval.value));
		System.Gadget.Settings.writeString("view", view.value);
		event.cancel = false;
	}
}

function refreshthemes() {
	//Get themes in directory
	var dir = System.Shell.itemFromPath(System.Gadget.path+"\\themes");
	var themes = [];
	for (var i=0; i < dir.SHFolder.Items.count; i++) {
		var item = dir.SHFolder.Items.item(i);
		if (item.isFolder) {
			themes.push(item.name);
		}
	}

	//Update if number of themes differ
	if (themes.length != theme.childNodes.length) {
		var curtheme = theme.value;
		//clear themes
		while (theme.hasChildNodes()) {
			theme.removeChild(theme.firstChild);
		}
		//add themes
		for (var i=0; i < themes.length; i++) {
			var option = document.createElement("option");
			option.value = themes[i];
			option.appendChild(document.createTextNode(themes[i]));
			theme.appendChild(option);
		}
		theme.value = curtheme;
	}
}

function browsethemes() {
	System.Shell.execute(System.Gadget.path+"\\themes");
}

function checkforupdate() {
	var url = "http://stefansundin.com/stuff/sweclockers-gadget/latest-stable.txt?"+(new Date().getTime());
	var loading = document.getElementById("loading");
	var result = document.createElement("span");
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
			if (xhr.status == 200) {
				var latest = parseFloat(xhr.responseText);
				result.appendChild(document.createTextNode(latest+". "));
				if (version != latest && !isNaN(latest)) {
					var update = document.createElement("sup");
					update.style.color = "red";
					var link = document.createElement("a");
					link.href = thread;
					link.appendChild(document.createTextNode("Uppdatera!"));
					result.appendChild(link);
				}
				loading.parentNode.replaceChild(result, loading);
			}
			else {
				//Display error
				result.appendChild(document.createTextNode("Error ("+xhr.status+")"));
				loading.parentNode.replaceChild(result, loading);
			}
		}
	};
	xhr.open("GET", url, true);
	xhr.send();
}
