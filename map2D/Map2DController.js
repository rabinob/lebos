// Copyright 2015 Quuppa Oy. All rights reserved.
var Q = Q || {};
Q.Map2DController = function(datamodel, selectionManager) {
	var map = this.map = new Q.Map2D(document.getElementById("mapCanvas"));
	this.__datamodel = datamodel;
	this.__tagDrawables = {};
	this.__currentCoordSystem;
	this.__selectionManager = selectionManager;
	this.__interactionManager = new Q.Map2DInteractionManager(map, selectionManager);
	this.__overriders = {};

	var that = this;
	
	var canvasElement = $("#mapCanvas");
	canvasElement.mousedown(this.__interactionManager.onMouseDown);
	canvasElement.mousemove(this.__interactionManager.onMouseMove);
	canvasElement.mouseup(this.__interactionManager.onMouseUp);
	canvasElement.mousewheel(this.__interactionManager.onMouseWheel);
	canvasElement.click(this.__interactionManager.onClick);
	var el = document.getElementById("mapCanvas");
	el.addEventListener("touchstart", this.__interactionManager.onTouchStart, false);
	el.addEventListener("touchend", this.__interactionManager.onTouchEnd, false);
	//el.addEventListener("touchcancel", handleCancel, false);
	el.addEventListener("touchmove", this.__interactionManager.onTouchMove, false);
	
	$("#zoomIn").click(this.__interactionManager.zoomIn);
	$("#zoomOut").click(this.__interactionManager.zoomOut);
	$("#rotateCW").click(this.__interactionManager.rotateCW);
	$("#rotateCCW").click(this.__interactionManager.rotateCCW);

	
	this.getOverriders();

	var grid = new Q.GridDrawable();
	map.addDrawable(grid);

	var tags = this.__datamodel.getTags();
	this.onTagsAdd(tags);
	
	setInterval(function() {
		map.render();
	}, 500);
};

Q.Map2DController.prototype.onSelectionAdd = function(tag) {
	var drawable = this.__tagDrawables[tag.id];
	if(drawable !== undefined) {
		if(drawable.tag.__visible !== undefined && !drawable.tag.__visible) {
			Q.notificationManager.showNotification("Tag hidden, click on its dot in tree to make it visible on map!");
			return;			
		}
		drawable.isSelected = true;
		this.map.bringToTop(drawable);
		if(Q.settings.centerOnSelected && !this.__interactionManager.disablePan) {
			var pos = tag.getPosition();
			this.map.viewport.centerM = [pos.x, pos.y];
			this.map.render();
		}
	}
};

Q.Map2DController.prototype.onSelectionRemove = function(tag) {
	var drawable = this.__tagDrawables[tag.id];
	if(drawable !== undefined) {
		//drawable.name = undefined;
		drawable.isSelected = false;
	};
};

Q.Map2DController.prototype.onTagsAdd = function(tags) {
	for(var i = 0; i < tags.length; i++) {
		var tag = tags[i];
		//console.log("MAP tag add " + tag.id);
		var name = tag.info.name || tag.id;
		var image = undefined;
		var overridingProps = undefined;
		for(var k in this.__overriders) { // iterating over keys because of the startsWith check below...
			if(name.indexOf(k) === 0) {  // startWith check!
				overridingProps = this.__overriders[k];
				break;
			}
		}
		if(overridingProps !== undefined) {
			// overriders found, apply them
			for(var prop in overridingProps) {
				var val = overridingProps[prop];
				tag[prop] = val;
				console.log(tag.id + ":" + prop + " -> " + val);
			}
			// setup overriding image
			if(tag.imageSrc && tag.imageSrc.length > 0) {
				image = new Image(30, 30);
				image.src = tag.imageSrc;
			}
		}
	
		var drawable = new Q.TagDrawable(tag, image);
		drawable.name = name;
		drawable.isSelected = this.__selectionManager.isSelected(tag);
		this.map.addDrawable(drawable);
		this.__tagDrawables[tag.id] = drawable;
	}
};


Q.Map2DController.prototype.onTagsRemove = function(tags) {
	for(var i = 0; i < tags.length; i++) {
		var tag = tags[i];
		var drawable = this.__tagDrawables[tag.id];
		if(drawable === undefined) {
			console.log("ERROR on remove, tagDrawable not found " + tag.id);
			continue;
		}
		//console.log("MAP tag remove " + tag.id);
		delete this.__tagDrawables[tag.id];
		this.map.removeDrawable(drawable);
	}
};


Q.Map2DController.prototype.onTagUpdateFinished = function() {
	this.map.render();
};



Q.Map2DController.prototype.onCoordinateSystemChanged = function(coordSys) {
	// remove old bgimage drawables
	if(this.__currentCoordSystem !== undefined) {
		for (var i = 0; i < this.__currentCoordSystem.bgImageDrawables.length; i++) {
			this.map.removeDrawable(this.__currentCoordSystem.bgImageDrawables[i]);
		}
		for (var i = 0; i < this.__currentCoordSystem.polygonDrawables.length; i++) {
			this.map.removeDrawable(this.__currentCoordSystem.polygonDrawables[i]);
		}
		if(this.__currentCoordSystem.inactiveAreaDrawable != undefined)
			this.map.removeDrawable(this.__currentCoordSystem.inactiveAreaDrawable);
	}

	this.__currentCoordSystem = {};
	this.__currentCoordSystem.coordSystem = coordSys;
	this.__currentCoordSystem.bgImageDrawables = [];
	this.__currentCoordSystem.polygonDrawables = [];
	this.__currentCoordSystem.inactiveAreaDrawable = undefined;
	
	// add new bgimage drawables
	for (var i = 0; i < coordSys.backgroundImages.length; i++) {
		var img = new Image();
		var bg = coordSys.backgroundImages[i];
		this.applyOverriders(bg);
		if(!bg.visible)
			continue;
		img.src = bg.base64;
		var imageDrawable = new Q.BackgroundImageDrawable(img, bg.origoX, bg.origoY, bg.metersPerPixelX, bg.metersPerPixelY, bg.rotation, bg.alpha, bg.visible);
		this.map.addDrawable(imageDrawable);
		this.__currentCoordSystem.bgImageDrawables.push(imageDrawable);
	};
	
	// helper method
	var parsePoints = function(str) {
		var pts = [];
		var split1 = str.split("|");
		for(var i = 0; i < split1.length; i++) {
			var split2 = split1[i].split(",");
			var p = [parseFloat(split2[0]), parseFloat(split2[1])];
			pts.push(p);
		}
		return pts;
	}
	function argbToRGB(color) {
	    return '#'+ ('000000' + (color & 0xFFFFFF).toString(16)).slice(-6);
	}
	
	// add polygons
	var polysForInactiveAreaRendering = [];
	var holesForInactiveAreaRendering = [];
	for(polyName in coordSys.polygons) {
		var poly = coordSys.polygons[polyName];
		this.applyOverriders(poly);
		var points = parsePoints(poly.polygonData); // [[0,0], [-10,10], [10,20], [30,-10], [0,0]];
		polysForInactiveAreaRendering.push(points);
		if(!poly.visible)
			continue;
		var drawable = new Q.PolygonDrawable(points, undefined);
		drawable.type = "trackingarea";
		if(coordSys.backgroundImages.length === 0) //should we make trackingareas visible?
			drawable.color = "#ffffff";
		drawable.zIndex = 1;
		this.map.addDrawable(drawable);
		this.__currentCoordSystem.polygonDrawables.push(drawable);
		// extract name string
		var name = "";
		for(g in poly.trackingAreas) {
			var grid = poly.trackingAreas[g];
			name += grid.track3d ? "3D:" : "2D:";
			name += grid.name + " ";
		}
		drawable.name = name;
		
		
		// holes
		for(holeName in poly.polygonHoles) {
			var hole = poly.polygonHoles[holeName];
			var holePoints = parsePoints(hole.polygonData);
			holesForInactiveAreaRendering.push(holePoints);
		}
		
	}
	
	for(polyName in coordSys.zones) {
		var poly = coordSys.zones[polyName];
		this.applyOverriders(poly);
		if(!poly.visible)
			continue;
		var points = parsePoints(poly.polygonData);
		var c = "#" + (poly.color ? poly.color.slice(3) : "ffffff");
		var holes = [];
		if(poly.polygonHoles !== undefined) {
			for(var i = 0; i < poly.polygonHoles.length; i++) {
				var holePoints = parsePoints(poly.polygonHoles[i].polygonData);
				holes.push(holePoints);
			}
		}
		var drawable = new Q.PolygonDrawable(points, c, holes);
		drawable.type = "zone";
		drawable.zIndex = 2;
		this.map.addDrawable(drawable);
		this.__currentCoordSystem.polygonDrawables.push(drawable);
		drawable.name = "Zone:"+poly.name;
	}
	
	//polysForInactiveAreaRendering.push([[0,0], [30,-10], [10,20], [-10,10], [0,0]]);
	//polysForInactiveAreaRendering.push([[0,0], [-10,10], [10,20], [30,-10], [0,0]]);
	//polysForInactiveAreaRendering.push([[0,0], [0,-10], [-10,-20], [-30,0], [0,0]]);
	//polysForInactiveAreaRendering.push([[18.25,20.25],[18.25,27.5],[-19,27.5],[-19,25],[-20.5,25],[-20.5,29.25],[-24.5,29.25],[-24.5,26],[-25.5,26],[-25.5,29.25],[-31,29.25],[-30.75,28.25],[-31.25,26.75],[-32.5,25.75],[-50.5,25.5],[-50.79,-32.47],[-26.28,-32.33],[-26.45,-3.61],[0.63,-3.45],[0.79,-32.3],[8.99,-32.13],[9,-26.75],[12.5,-24],[50,-24],[49.75,20.25],[18.25,20.25]]);
	//polysForInactiveAreaRendering.push([[18.25,20.25],[0.63,-3.45],[0.79,-32.3],[8.99,-32.13],[9,-26.75],[12.5,-24],[50,-24],[49.75,20.25],[18.25,20.25]]);
	//holesForInactiveAreaRendering.push([[0,0], [30,-10], [10,20], [-10,10], [0,0]]);
	
	var inactiveAreaRenderer = new Q.InactiveAreaRendererDrawable(polysForInactiveAreaRendering, holesForInactiveAreaRendering);
	inactiveAreaRenderer.zIndex = 10;
	this.map.addDrawable(inactiveAreaRenderer);
	this.__currentCoordSystem.inactiveAreaDrawable = inactiveAreaRenderer;
};


Q.Map2DController.prototype.applyOverriders = function(obj) {
	var overridingProps = undefined;
	for(var k in this.__overriders) { // iterating over keys because of the startsWith check below...
		if(obj.id.indexOf(k) === 0) {  // startWith check!
			overridingProps = this.__overriders[k];
			break;
		}
	}
//	var overridingProps = this.__overriders[obj.id];
	for(var prop in overridingProps) {
		var val = overridingProps[prop];
		obj[prop] = val;
		console.log(obj.id + ":" + prop + " -> " + val);
	}
}


Q.Map2DController.prototype.getOverriders = function() {
	var that = this;
	jQuery.ajax({
		url : "./overriders.json",
		dataType : 'json',
		async : true,
		success : function(data, textStatus, jqXHR) {
			that.__overriders = data;
		},
		error : function(jqXHR, textStatus, errorThrown) {
			// nothing to do...
			console.log("overriders.json error:" + textStatus);
		}
	});
};