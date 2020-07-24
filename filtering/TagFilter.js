// Copyright 2015 Quuppa Oy. All rights reserved.
var Q = Q || {};
Q.TagFilter = function(dm) {
	this.__datamodel = dm;
	this.__listeners = [];
	this.__filteredTags = [];
	dm.addListener(this);
};

Q.TagFilter.prototype.reset = function() {
	this.__datamodel.reset();
};

Q.TagFilter.prototype.addListener = function(l) {
	this.__listeners.push(l);
};

Q.TagFilter.prototype.removeListener = function(l) {
	var i = this.__listeners.indexOf(l);
	if(i > -1) {
		this.__listeners.splice(i, 1);		
	}
};

Q.TagFilter.prototype.getTags = function() {
	return this.__filteredTags;
};

Q.TagFilter.prototype.getTag = function(id) {
	return this.__find(id);
};


Q.TagFilter.prototype.onTagsAdd = function(tags) {
	var __addedTags = [];
	for(var i = 0; i < tags.length; i++) {
		var tag = tags[i];
		if (this.__filter(tag)) {
			this.__filteredTags.push(tag);
			__addedTags.push(tag);
		}
	}
	
	for (var l = 0; l < this.__listeners.length; l++) {
		if (this.__listeners[l].onTagsAdd != undefined)
			this.__listeners[l].onTagsAdd(__addedTags);
	}
};


Q.TagFilter.prototype.onTagsRemove = function(tags) {
	var __removedTags = [];
	for(var i = 0; i < tags.length; i++) {
		var tag = tags[i];
		if(this.__doRemove(tag)) {
			__removedTags.push(tag);
		}
	}
	for (var l = 0; l < this.__listeners.length; l++) {
		if (this.__listeners[l].onTagsRemove != undefined)
			this.__listeners[l].onTagsRemove(__removedTags);
	}			
};


Q.TagFilter.prototype.onTagsUpdate = function(updatedTags) {
	var __updatedTags = [];
	var __removedTags = [];
	var __addedTags = [];
	for(var i = 0; i < updatedTags.length; i++) {
		var tag = updatedTags[i];
		var passFilter = this.__filter(tag);
		if(this.__find(tag.id)) {
			if(passFilter) {
				__updatedTags.push(tag);
			} else {
				if(this.__doRemove(tag))
					__removedTags.push(tag);
			}
		} else if(passFilter) {
			// the tag previously filtered out now passes the filter -> add
			this.__filteredTags.push(tag);
			__addedTags.push(tag);
		}
	}
	
	for (var l = 0; l < this.__listeners.length; l++) {
		if (__removedTags.length > 0 && this.__listeners[l].onTagsRemove != undefined)
			this.__listeners[l].onTagsRemove(__removedTags);
		if (__addedTags.length > 0 && this.__listeners[l].onTagsAdd != undefined)
			this.__listeners[l].onTagsAdd(__addedTags);
		if (__updatedTags.length > 0 && this.__listeners[l].onTagsUpdate != undefined)
			this.__listeners[l].onTagsUpdate(__updatedTags);
	}

};

Q.TagFilter.prototype.onTagUpdateFinished = function() {
	// just a passthrough
	for (var l = 0; l < this.__listeners.length; l++) {
		if (this.__listeners[l].onTagUpdateFinished != undefined)
			this.__listeners[l].onTagUpdateFinished();
	}
};



Q.TagFilter.prototype.__doFiltering = function() {
	// remove from current list all that do not pass filter
	var addedTags = [];
	var removedTags = [];
	for (var i = this.__filteredTags.length-1; i >= 0; i--) {
		var t = this.__filteredTags[i];
		if( ! this.__filter(t)) {
			//console.log("Removing " + t.id);
			this.__filteredTags.splice(i, 1);
			removedTags.push(t);
		};
	}

	// add all new ones that pass the filter
	var tags = this.__datamodel.getTags();
	for (var i = 0; i < tags.length; i++) {
		var t = tags[i];
		if(this.__filter(t) && !this.__find(t.id)) {
			//console.log("Adding " + t.id);
			this.__filteredTags.push(t);
			addedTags.push(t);
		};
	};	
	for (var l = 0; l < this.__listeners.length; l++) {
		if (this.__listeners[l].onTagsRemove != undefined)
			this.__listeners[l].onTagsRemove(removedTags);
		if (this.__listeners[l].onTagsAdd != undefined)
			this.__listeners[l].onTagsAdd(addedTags);
	};
};

// to be overridden by the extending objects!
Q.TagFilter.prototype.__filter = function(tag) {
	return true;
};

Q.TagFilter.prototype.__find = function(id) {
	for (var i = 0; i < this.__filteredTags.length; i++) {
		if (this.__filteredTags[i].id === id)
			return this.__filteredTags[i];
	}
	return undefined;
};


Q.TagFilter.prototype.__doRemove = function(tag) {
	for (var i = 0; i < this.__filteredTags.length; i++) {
		if (this.__filteredTags[i].id === tag.id) {
			this.__filteredTags.splice(i, 1);
			return true;
		}
	}
	return false;
};
