
function init() {
	System.Gadget.document.parentWindow.lastview = "iframe";
	var entry = System.Gadget.document.parentWindow.flyout.entry;

	var url = "http://www.sweclockers.com/";
	if (entry != undefined) {
		url = entry.link;
	}

	var iframe = document.getElementById("iframe");
	iframe.src = url;

	document.body.focus();
}

function key() {
	var c = String.fromCharCode(window.event.keyCode).toLowerCase();
	var index = System.Gadget.document.parentWindow.flyout.index;
	if (c == "f" && index != null) {
		System.Gadget.document.parentWindow.openflyout(index, "snippet");
	}
	else {
		System.Gadget.document.parentWindow.key(c);
	}
}
