// Copyright 2015 Quuppa Oy. All rights reserved.
var Q = Q || {};
Q.TagDataRetriever = function(updateInterval) {
	this.__tagMap = {};
	this.__tagList = [];
	this.__query = "version=2";
	this.__listeners = [];
	this.__lastNotificationShownTS = 0;
	this.updateInterval = updateInterval;
	
	var that = this;
	
	
	var v2 = undefined;
	if(this.__query != undefined && this.__query.indexOf("version=2") > -1) {
		v2 = true;
	}

	parseTagLocations = function(data, textStatus, jqXHR) {
		lastNotificationShownTS = 0;
		if(v2) {
			var serverTime = data.responseTS;
			data = data.tags;
		}
		var updatedTags = [];
		for (var i = 0; i < data.length; i++) {
			var tag = data[i];
			var localTag = that.__tagMap[tag.id];
			if (localTag === undefined)
				continue; // location info could arrive earlier than tagInfo... we need to ignore this until we have tagInfo data too. (causes too many problems elsewhere)
			localTag.location = tag;
			localTag.serverTime = serverTime;
			updatedTags.push(localTag);
		}
		
		// notify listeners
		for (var l = 0; l < that.__listeners.length; l++) {
				if (that.__listeners[l].onTagsUpdate != undefined)
					that.__listeners[l].onTagsUpdate(updatedTags);
		}
		
		for (var l = 0; l < that.__listeners.length; l++) {
			if (that.__listeners[l].onTagUpdateFinished != undefined)
				that.__listeners[l].onTagUpdateFinished();
		}

	};

	parseTagInfos = function(data, textStatus, jqXHR) {
		this.__lastNotificationShownTS = 0;
		if(v2) {
			var serverTime = data.responseTS;
			data = data.tags;
			var addedTags = [];
			var updatedTags = [];
			for(var i = 0; i < data.length; i++) {
				var tag = data[i];
				var localTag = that.__tagMap[tag.id];
				var isAdd = true;
				if (localTag === undefined) {
					localTag  = {};
					localTag.id = tag.id;
					//TODO: make a separate tag object?
					localTag.getPosition = function () {
						// decide should we use precise location or RSSI?
						var now = this.serverTime;
						var posAge = Number.MAX_VALUE;
						if(this.location && this.location.positionTS) {
							posAge = now-this.location.positionTS;
							if(posAge < Q.settings.maxAge || Q.settings.maxAge === 0) { 
								if (Q.settings.useSmoothing) { 
									if(this.location.smoothedPositionX !== undefined && this.location.smoothedPositionY !== undefined && this.location.smoothedPositionZ)
										return { 
											x: this.location.smoothedPositionX, 
											y: this.location.smoothedPositionY, 
											z: this.location.smoothedPositionZ, 
											type : "Smoothed",
											age: posAge,
											coordSystem: this.location.coordinateSystemId };  // v1.1 format
									else if (this.location.smoothedPosition !== undefined && this.location.smoothedPosition !== null)  
										return { 
											x: this.location.smoothedPosition[0],
											y: this.location.smoothedPosition[1],
											z: this.location.smoothedPosition[2],
											type : "Smoothed",
											age: posAge,
											coordSystem: this.location.coordinateSystemId };  // v2 format
								}
								
								if (this.location.positionX !== undefined && this.location.positionY !== undefined && this.location.positionZ !== undefined)
									return { 
										x: this.location.positionX,
										y: this.location.positionY,
										z: this.location.positionZ,
										type: "Raw",
										age: posAge,
										coordSystem: this.location.coordinateSystemId };  // v1.1 format
								else if (this.location.position !== undefined && this.location.position !== null)
									return { 
										x: this.location.position[0],
										y: this.location.position[1],
										z: this.location.position[2],
										type: "Raw",
										age: posAge,
										coordSystem: this.location.coordinateSystemId };  // v2 format
							}
						}						
						posAge = this.info.rssiTS !== undefined ? now-this.info.rssiTS : Number.MAX_VALUE;
						if(this.info.rssiLocatorCoords !== undefined && this.info.rssiLocatorCoords !== null)
							return { x: this.info.rssiLocatorCoords[0], y: this.info.rssiLocatorCoords[1], type: "RSSI", age: posAge, coordSystem: this.info.rssiCoordinateSystemId };
						return undefined;
					};
					// create observer pattern for tag
					localTag.__observers = [];
					localTag.subscribe = function(fn) {
						localTag.__observers.push(fn);
					};
					localTag.unsubscribe = function(fn) {
						var i = localTag.__observers.indexOf(fn);
						if(i > -1) {
							localTag.__observers.splice(i, 1);
						}
					};
					localTag.fire = function(prop) {
				        this.__observers.forEach(function(item) {
				            item.call(localTag, prop);
				        });
				    }
					localTag.__visible = true;
					localTag.__autoFollow = false;
					
					that.__tagMap[tag.id] = localTag;
					that.__tagList.push(localTag);
					addedTags.push(localTag);
				} else {
					isAdd = false;
					updatedTags.push(localTag);
				}
				// copy values
				for (var key in tag) {
//					localTag[key] = tag[key];
				}
				localTag.info = tag;
				localTag.serverTime = serverTime;
			}
			// notify listeners
			for (var l = 0; l < that.__listeners.length; l++) {
				if (that.__listeners[l].onTagsAdd != undefined)
					that.__listeners[l].onTagsAdd(addedTags);
				if (that.__listeners[l].onTagsUpdate != undefined)
					that.__listeners[l].onTagsUpdate(updatedTags);
			}
		}
//		else {
//			for ( var key in data) {
//				if(key === "version" || key === "responseTimestampEpoch")
//					continue;
//					var tag = data[key];
//					tag.id = key;
//	
//					var existing = __tagMap[tag.id];
//					if (existing === undefined) {
//						newList[tag.id] = tag;
//						for (var l = 0; l < that.__listeners.length; l++) {
//							if (that.__listeners[l].onTagAdd != undefined)
//								that.__listeners[l].onTagAdd(tag);
//						}
//					} else {
//						//delete __tagMap[tag.id];
//						//newList[tag.id] = existing;
//	
//						for (var l = 0; l < that.__listeners.length; l++) {
//							if (that.__listeners[l].onTagUpdate != undefined)
//								that.__listeners[l].onTagUpdate(tag);
//						}
//					}
//					// hack to add button pressed to locations
////					if(__tagMap[tag.id] !== undefined) {
////						__tagMap[tag.id].buttonState = tag.buttonState;
////					}
//			}
//		}
//		
//		for(var id in __tagMap) {
//			if(!__tagMap.hasOwnProperty(id))
//				continue;
//			for (var l = 0; l < that.__listeners.length; l++) {
//				if (that.__listeners[l].onTagRemove != undefined)
//					that.__listeners[l].onTagRemove(__tagMap[id]);
//			}
//		}
//
//		__tagMap = newList;
	};

	// kick out the first requests
	setTimeout(this.__pollLocation, updateInterval, this);
	setTimeout(this.__pollTagInfo, updateInterval*10, this);
};


Q.TagDataRetriever.prototype.reset = function() {
	for (var l = 0; l < this.__listeners.length; l++) {
		if (this.__listeners[l].onTagsRemove != undefined)
			this.__listeners[l].onTagsRemove(__tagList);
	}
	this.__tagMap = {};
	this.__tagList = [];
};

Q.TagDataRetriever.prototype.sort = function() {
	this.__tagList.sort(function(a, b) {
		var idA = (a.info && a.info.name) || a.id;
		var idB = (b.info && b.info.name) || b.id;
		return idA.localeCompare(idB);
	});
	
	for (var l = 0; l < this.__listeners.length; l++) {
		if (this.__listeners[l].onTagsRemove != undefined)
			this.__listeners[l].onTagsRemove(this.__tagList);
		if (this.__listeners[l].onTagsAdd != undefined)
			this.__listeners[l].onTagsAdd(this.__tagList);
	}
};

Q.TagDataRetriever.prototype.addListener = function(l) {
	this.__listeners.push(l);
};

Q.TagDataRetriever.prototype.getTag = function(id) {
	return this.__tagMap[id];
};

Q.TagDataRetriever.prototype.getTags = function() {
	return this.__tagList;
};


Q.TagDataRetriever.prototype.__pollLocation = function(o) {
	// send poll for tag locations
	var maxAge = (Q.settings.maxAge > 0 ? "&maxAge=" + Math.floor(Q.settings.maxAge) : "");
	var radiusThreshold = (Q.settings.tagPositionRadiusThreshold > 0 ? "&radius=" + Q.settings.tagPositionRadiusThreshold : "");

	var q = o.__query;
	var that = this;
	jQuery.ajax({
		url : "../qpe-web-6.2.1/getTagPosition?" + q + maxAge + radiusThreshold,
		// url : "http://127.0.0.1:8080/qpe/getTagLocation",
		dataType : 'json',
		async : true,
		success : function(data, textStatus, jqXHR) {
			parseTagLocations(data, textStatus, jqXHR);
			setTimeout(o.__pollLocation, o.updateInterval, o);
		},
		error : function(jqXHR, textStatus, errorThrown) {
			console.log('error', 'loading tag positions failed, ' + textStatus);
			if(new Date().getTime() - o.__lastNotificationShownTS > 20000) {
				Q.notificationManager.showNotification("Network error while retrieving tag locations.", 4000);
				o.__lastNotificationShownTS = new Date().getTime();
			}
			setTimeout(o.__pollLocation, o.updateInterval, o);
		}
	});
};


Q.TagDataRetriever.prototype.__pollTagInfo = function(o) {
	var q = o.__query;
	var that = this;
	// do poll for tagInfos
	jQuery.ajax({
		url : "../qpe-web-6.2.1/getTagInfo?" + q,
		dataType : 'json',
		async : true,
		success : function(data, textStatus, jqXHR) {
			parseTagInfos(data, textStatus, jqXHR);
			setTimeout(o.__pollTagInfo, o.updateInterval*10, o);
		},
		error : function(jqXHR, textStatus, errorThrown) {
			console.log('error', 'loading tag info failed, ' + textStatus);
			if(new Date().getTime() - o.__lastNotificationShownTS > 20000) {
				Q.notificationManager.showNotification("Network error while retrieving tag infos.", 4000);
				o.__lastNotificationShownTS = new Date().getTime();
			}
			setTimeout(o.__pollTagInfo, o.updateInterval*10, o);
		}
	});
};