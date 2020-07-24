// Copyright 2015 Quuppa Oy. All rights reserved.
var Q = Q || {};
Q.SelectionManager = function() {
	this.__selected = [];
	this.__listeners = [];
};

Q.SelectionManager.prototype.isSelected = function(obj) {
	return this.__selected.indexOf(obj) > -1 ? true : false;
};

Q.SelectionManager.prototype.addToSelection = function(obj) {
	this.__selected.push(obj);
	for(var i = 0; i < this.__listeners.length; i++) {
		var l = this.__listeners[i];
		if(l.onSelectionAdd !== undefined)
			l.onSelectionAdd(obj);
	};
};

Q.SelectionManager.prototype.removeFromSelection = function(obj) {
	var index = this.__selected.indexOf(obj);
	if (index > -1) {
		this.__selected.splice(index, 1);
		for(var i = 0; i < this.__listeners.length; i++) {
			var l = this.__listeners[i];
			if(l.onSelectionRemove !== undefined)
				l.onSelectionRemove(obj);
		};
	};
};


Q.SelectionManager.prototype.addListener = function(l) {
	this.__listeners.push(l);
};

Q.SelectionManager.prototype.removeListener = function(l) {
	var i = this.__listeners.indexOf(l);
	if(i > -1) {
		this.__listeners.splice(i, 1);		
	}
};