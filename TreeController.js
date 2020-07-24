// Copyright 2015 Quuppa Oy. All rights reserved.
var Q = Q || {};

Q.TreeController = function(datamodel, selectionManager) {
	this.__datamodel = datamodel;
	this.__tree = $("#tagContainer");
	this.__disableScroll = false;
	this.__fieldFilterKey = "";
	this.selectionManager = selectionManager;
	var that = this;
	// update the tree and its timestamps even though there might not have been any onTagUpdate() calls.
	setInterval(function(ts) {
		var tagList = that.__datamodel.getTags();
		for(var i = 0; i < tagList.length; i++) {
			that.__updateDetails(tagList[i].id);
		}
	}, 1000);
	
	// Enable fast tooltips to show extra info
	//$(".tagInfoRow").tooltip({ show: { effect: "blind", duration: 100 } });
};

Q.TreeController.prototype.__createHtml = function(tag) {
	var infoHtml = "";
	if(tag.info !== undefined) {	
		var props = Object.getOwnPropertyNames(tag.info);
		props.sort();
		for (var i = 0; i < props.length; i++) {
			var key = props[i]; 
			if(key.indexOf(this.__fieldFilterKey) === -1)
				continue;
			if (!Q.settings.showRawDataInTree && (key.endsWith("TS") && key !== "lastPacketTS") || key.indexOf("__")==0)
				continue;
			var agoString = "";
			var titleString = "";
			if(key === "lastPacketTS" && tag.info["lastPacketTS"] !== null) {
				agoString = Q.createAgoString(tag.serverTime - tag.info["lastPacketTS"]);
			} else if(key.endsWith("TS")) {
				agoString = Q.createDisplayDate(new Date(tag.info[key]));				
			} else if(tag.info[key+"TS"] !== undefined) {
				agoString = Q.createAgoString(tag.serverTime - tag.info[key+"TS"]);
			}
			if(agoString.length > 0)
				agoString = " (" + agoString + ")";
			var val = "";
			if(key === "zones") {
				var arr = tag.info[key];
				if(arr !== null) {
					for(var j = 0; j < arr.length; j++) {
						val += 	arr[j].name + " ";
					}
				}
			} else {
				val = tag.info[key];
			}
			infoHtml += "<div class='tagInfoRow' title='" + titleString + "'><span class='tagLabel'>" + key + "</span> " + val + "<small>" + agoString + "</small></div>";
		}			
	}
	
	var locHtml = "";
	if(tag.location !== undefined) {
		var props = Object.getOwnPropertyNames(tag.location);
		props.sort();
		for (var i = 0; i < props.length; i++) {
			var key = props[i]; 
			if(key.indexOf(this.__fieldFilterKey) === -1)
				continue;
			if (!Q.settings.showRawDataInTree && key.endsWith("TS") || key.indexOf("__")==0)
				continue;
			var agoString = "";
			if(key.endsWith("TS")) {
				agoString = Q.createDisplayDate(new Date(tag.location[key]));
			} else if(tag.location[key+"TS"] !== undefined) {
				agoString = Q.createAgoString(tag.serverTime - tag.location[key+"TS"]);
			}
			if(agoString.length > 0)
				agoString = " (" + agoString + ")";
			var val = "";
			if(key === "zones") {
				var arr = tag.location[key];
				if(arr !== null) {
					for(var j = 0; j < arr.length; j++) {
						val += 	arr[j].name + " ";
					}
				}
			} else {
				val = tag.location[key];
			}
			locHtml += "<div class='tagLocationRow'><span class='tagLabel'>" + key + "</span> " + val + "<small>" + agoString + "</small></div>";
		}
	}
	if(infoHtml.length === 0 && locHtml.length === 0) {
		infoHtml += "<div class='tagInfoRow'><span class='tagLabel'>No fields</span></div>";
	}

	return infoHtml + locHtml;
};

Q.TreeController.prototype.__showDetails = function(tag) {
	if (tag === undefined)
		return;
	var existing = $("#" + tag.id + "_tagdetails")[0];
	if (existing === undefined) {
		var html = "<div id='" + tag.id + "_tagdetails'>";
		html += this.__createHtml(tag);
		html += "</div>";
		var el = $("#" + tag.id);
		el.append(html);
		return el;
	}
	return undefined;
};

Q.TreeController.prototype.__hideDetails = function(tag) {
	if (tag === undefined)
		return;
	var existing = $("#" + tag.id + "_tagdetails")[0];
	if (existing !== undefined) {
		existing.remove();
	}
};

Q.TreeController.prototype.__updateDetails = function(tag) {
	if (tag === undefined)
		return;
	// dont update tree more often that once a sec
	if(!tag._treeControllerLastUpdateTimestamp || (Date.now() - tag._treeControllerLastUpdateTimestamp) > 1000) {
		var existing = $("#" + tag.id + "_tagdetails");
		if (existing !== undefined) {
			existing.empty();
			var html = this.__createHtml(tag);
			existing.append(html);
		}
		tag._treeControllerLastUpdateTimestamp = Date.now();
	}
};

Q.TreeController.prototype.onTagsAdd = function(tags) {
	// helper function
	var setDotBorder = function(t) {
		var dot = $("#" + t.id + "_dot");
		dot.css("border-color", t.__autoFollow ? "green" : (t.__visible ? "white" : "red"));
		dot.css("background", (t.info && t.info.color) || (t.location && t.location.color));
	}
	for(var i = 0; i < tags.length; i++) {
		var tag = tags[i];
		//console.log("Tree onTagAdd " + tag.id);
		this.__tree.append("<div class='tagRow' id='" + tag.id + "'><span class='colorbox' id='" + tag.id + "_dot'>&nbsp;</span>" + (tag.info.name || tag.id) + "</div>");
		var that = this;
		
		setDotBorder(tag);
		var dotHandler = function(__tag) {
			console.log(__tag.id + " dot");
			return function(e) {
				e.preventDefault();
				e.stopPropagation();
				if(!__tag.__visible) {
					__tag.__visible = true;
					__tag.fire("__visible");
				} else {
					if(!__tag.__autoFollow) {
						// reset autoFollow for all tags to prevent multiple ones to be in autoFollow
						var tagList = that.__datamodel.getTags();
						for(var i = 0; i < tagList.length; i++) {
							var t = tagList[i];
							if(t.__autoFollow && t !== __tag) {
								t.__autoFollow = false;						
								t.fire("__autoFollow");
								var dot = $("#" + t.id + "_dot");
								setDotBorder(t);
							}
						}
						// go to autofollow mode for this tag
						__tag.__autoFollow = true;						
						__tag.fire("__autoFollow");
						Q.notificationManager.showNotification("Tag " + __tag.id + " is now autofollowed on map.");
					} else {
						__tag.__visible = false;
						__tag.fire("__visible");
						__tag.__autoFollow = false;
						__tag.fire("__autoFollow");
						Q.notificationManager.showNotification("Tag " + __tag.id + " is now hidden from map.");						
					}
				}
				setDotBorder(__tag);
			}
		}(tag);
		var dot = $("#" + tag.id + "_dot");
		dot.click(dotHandler);
		
		var handler = function(__tag) {
			return function(e) {
				var elID = e.target.id + "_tagdetails";
				var existing = $("#" + elID)[0];
				if (existing === undefined) {
					if(that.selectionManager) {
						// disable scrolling since the user's selection happens within the tree
						that.__disableScroll = true;
						that.selectionManager.addToSelection(__tag);
						
						that.__disableScroll = false;
					}
				} else {
					if(that.selectionManager)
						that.selectionManager.removeFromSelection(__tag);
				}
			}
		}(tag);
		$("#" + tag.id).click(handler);
		
		if(Q.selectionManager.isSelected(tag)) {
			this.__showDetails(tag);
		}
	}
};

Q.TreeController.prototype.onTagsRemove = function(tags) {
	for(var i = 0; i < tags.length; i++) {
		var tag = tags[i];
		//console.log("Tree onTagRemove " + tag.id);
		$("#" + tag.id).remove();
	}
};

Q.TreeController.prototype.onTagsUpdate = function(tags) {
	for(var i = 0; i < tags.length; i++) {
		var tag = tags[i];
		//console.log("Tree onTagUpdate " + tag.id);
		this.__updateDetails(tag);
	}
};

Q.TreeController.prototype.onSelectionAdd = function(obj) {
	var el = this.__showDetails(this.__datamodel.getTag(obj.id));
	if(el !== undefined && !this.__disableScroll) {
		el[0].scrollIntoView();
	}
};

Q.TreeController.prototype.onSelectionRemove = function(obj) {
	this.__hideDetails(this.__datamodel.getTag(obj.id));
};


Q.TreeController.prototype.setFieldFilter = function(key) {
	this.__fieldFilterKey = key;
};





