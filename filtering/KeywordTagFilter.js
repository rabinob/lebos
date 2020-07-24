// Copyright 2015 Quuppa Oy. All rights reserved.
var Q = Q || {};
Q.KeywordTagFilter = function(dm) {
	Q.TagFilter.call(this, dm);
	this.__keyword = "";
};

Q.KeywordTagFilter.prototype = Object.create( Q.TagFilter.prototype );


Q.KeywordTagFilter.prototype.setKeyword = function(w) {
	this.__keyword = w;
	this.__doFiltering();
};

Q.KeywordTagFilter.prototype.__filter = function(tag) {
	if(this.__keyword === undefined || this.__keyword.length === 0)
		return true;
	return tag.id.indexOf(this.__keyword) > -1 
		|| (tag.info.name !== null && tag.info.name.indexOf(this.__keyword) > -1);
};
