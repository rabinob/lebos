// Copyright 2015 Quuppa Oy. All rights reserved.
var Q = Q || {};
Q.Map2DInteractionManager = function(map, selectionManager) {
	// this.map = map;
	// isLeftMouseButtonDown = false;
	leftMouseDownPos = undefined; // [0, 0];
	touchStartPos = undefined;
	
	this.disablePan = false;
	that = this;
	
	this.onMouseDown = function(event) {
		event.preventDefault();

		if (event.button === 0) {
			// isLeftMouseButtonDown = true;
			// leftMouseDownPos[0] = event.clientX;
			// leftMouseDownPos[1] = event.clientY;
			leftMouseDownPos = [ event.clientX, event.clientY ];
		}
	};

	this.onMouseMove = function(event) {
		event.preventDefault();
		if (event.button === 0 && /* isLeftMouseButtonDown */leftMouseDownPos !== undefined) {
			var dx = event.clientX - leftMouseDownPos[0];
			var dy = event.clientY - leftMouseDownPos[1];
			map.viewport.pan(-dx, -dy);
			map.render();
			leftMouseDownPos[0] = event.clientX;
			leftMouseDownPos[1] = event.clientY;
		}
		
		// do hit test for highlighting (in reverse order to hit the topmost first)
		var drawables = map.getDrawables();
		var hitObjects = [];
		for(var i = drawables.length - 1; i >= 0 ; i--) {
			if(drawables[i].setHighlighted !== undefined)  // reset all highlights
				drawables[i].setHighlighted(false);

			if(drawables[i].hitTest !== undefined) {
				var isHit = drawables[i].hitTest(event.offsetX, event.offsetY, map.viewport);
				if(isHit) {
					hitObjects.push(drawables[i]);
				}
			}
		}
		if(hitObjects.length > 0) {
			var msg = "";
//			for(var i = 0; i < hitObjects.length; i++) {
				if(hitObjects[0].setHighlighted !== undefined)
					hitObjects[0].setHighlighted(true);
				if(hitObjects[0].name && hitObjects[0].name.length > 0) {
					msg += hitObjects[0].name + " "; 
				}
//			}
			map.renderLabel(msg, [event.offsetX, event.offsetY]);
		} else {
			map.renderLabel(undefined, undefined);  // clear label
		}
		map.render();
//		var screen = [event.offsetX, event.offsetY];
//		var metres = map.viewport.transformToCoordsM(screen);
//		var s = metres[0].toFixed(2) + ":" + metres[1].toFixed(2);
//		map.renderLabel(s, screen);
		var px = [event.offsetX, event.offsetY];
		//console.log(px + "(px) => " + map.viewport.transformToCoordsM(px) + "(m)");
	};

	this.onMouseUp = function(event) {
		event.preventDefault();
		if (event.button === 0 /* && isLeftMouseButtonDown */) {
			// isLeftMouseButtonDown = false;
			leftMouseDownPos = undefined;
		}
	};

	this.onMouseWheel = function(event, delta) {
		if (delta > 0) {
			var e = event.originalEvent;
			zoomIn([ e.offsetX || e.layerX, e.offsetY || e.layerY ]);
			//console.log(event.originalEvent.layerX +":"+ event.originalEvent.layerX);
		} else {
			zoomOut();
		}
	};

	this.onTouchStart = function(event) {
		event.preventDefault();
		// act only if there's exactly one finger inside this element
		if (event.targetTouches.length == 1) {
			var touch = event.targetTouches[0];
			touchStartPos = [ touch.clientX, touch.clientY ];
			console.log("start at " + touchStartPos[0] +":"+ touchStartPos[1]);
		}
	};
	this.onTouchMove = function(event) {
		event.preventDefault();
		// act only if there's exactly one finger inside this element
		if (event.targetTouches.length == 1 && touchStartPos !== undefined) {
			var touch = event.targetTouches[0];
			var dx = touch.clientX - touchStartPos[0];
			var dy = touch.clientY - touchStartPos[1];
			map.viewport.pan(-dx, -dy);
			map.render();
			touchStartPos[0] = touch.clientX;
			touchStartPos[1] = touch.clientY;
		}
	};
	this.onTouchEnd = function(event) {
		event.preventDefault();
		// act only if there's exactly one finger inside this element
		if (event.targetTouches.length == 1) {
			touchStartPos = undefined;
		}
	};

	this.onClick = function(event) {
		event.preventDefault();
		// act only if there's exactly one finger inside this element
		var drawables = map.getDrawables();
		for(var i = 0; i < drawables.length; i++) {
			if(drawables[i].hitTest !== undefined) {
				var isHit = drawables[i].hitTest(event.offsetX, event.offsetY, map.viewport);
				if(isHit) {
					//console.log("HIT " + drawables[i].tag.id);
					var tag = drawables[i].tag;
					if(!tag)
						continue;
					if(selectionManager && !selectionManager.isSelected(tag)) {
						// raise flag so that mapcontroller does not center on newly selected object
						that.disablePan = true;
						selectionManager.addToSelection(tag);
						that.disablePan = false;
					} else
						selectionManager.removeFromSelection(tag);
				}
			}
		}
	};

	zoomOut = this.zoomOut = function() {
		map.viewport.scale = map.viewport.scale * 0.8;
		if(map.viewport.scale < 1)
			map.viewport.scale = 1;
		map.render();
	};

	zoomIn = this.zoomIn = function(mousePos) {
		map.viewport.scale = map.viewport.scale * 1.2;
		if(map.viewport.scale > 100)
			map.viewport.scale = 100;
		if (mousePos !== undefined && mousePos instanceof Array
				&& mousePos.length === 2) {
			// compute how much we need to pan so that map zooms to mouse
			// pointer
			var x = mousePos[0] - map.viewport.w / 2;
			var y = mousePos[1] - map.viewport.h / 2;
			map.viewport.pan(x * 0.1, y * 0.1);
		}
		map.render();
	};

	rotateCW = this.rotateCW = function() {
		map.viewport.rotation += 90.0;
		map.render();
	};

	rotateCCW = this.rotateCCW = function() {
		map.viewport.rotation -= 90.0;
		map.render();
	};

};
