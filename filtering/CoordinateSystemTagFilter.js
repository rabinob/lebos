// Copyright 2015 Quuppa Oy. All rights reserved.
var Q = Q || {};
Q.CoordinateSystemTagFilter = function(dm) {
	Q.TagFilter.call(this, dm);
	this.__coorSysID = "";
};

Q.CoordinateSystemTagFilter.prototype = Object.create( Q.TagFilter.prototype );


Q.CoordinateSystemTagFilter.prototype.setCoordSystem = function(w) {
	this.__coorSysID = w;
	this.__doFiltering();
};

Q.CoordinateSystemTagFilter.prototype.__filter = function(tag) {
	if(this.__coorSysID === undefined || this.__coorSysID.length === 0)
		return true;
	if(tag.location !== undefined && tag.location.coordinateSystemId !== undefined)
		if(tag.location.coordinateSystemId === this.__coorSysID)
			return true;
		else return false;
	if(tag.info.rssiCoordinateSystemId !== undefined && tag.info.rssiCoordinateSystemId === this.__coorSysID)
		return true;
	return false;
};
