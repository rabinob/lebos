// Copyright 2015 Quuppa Oy. All rights reserved.
var Q = Q || {};
Q.PolygonDrawable = function (points, color, holes) {
	this.type = undefined;
	this.zIndex = 0;
	this.points = points;
	this.color = color;
	this.isHighlighted = false;
	this.holes = holes;
	//compute bounding box in meter coord system for faster hit test
	var maxX = Number.MIN_VALUE;
	var minX = Number.MAX_VALUE;
	var maxY = Number.MIN_VALUE;
	var minY = Number.MAX_VALUE;
	for(var i = 0; i < points.length; i++) {
		if(points[i][0] >= maxX)
			maxX = points[i][0];
		else if(points[i][0] <= minX)
			minX = points[i][0];
		if(points[i][1] >= maxY)
			maxY = points[i][1];
		else if(points[i][1] <= minY)
			minY = points[i][1];
	}
	this.boundingBox = [minX, minY, maxX, maxY];
	this.boundingBox.contains = function(p) {
		if(p[0] < this[0] 
			|| p[0] > this[2]
			|| p[1] < this[1]
			|| p[1] > this[3])
			return false;
		return true;
	}
};

Q.PolygonDrawable.prototype.setHighlighted = function (isHighlighted) {
	this.isHighlighted = isHighlighted;
}

Q.PolygonDrawable.prototype.hitTest = function (x, y, viewport) {
	var metres = viewport.transformToCoordsM([x, y]);
	if(this.boundingBox.contains(metres)) {
		var insidePoly = this.pointInPoly(metres[0], metres[1]);
		if(insidePoly) {
			// check that if it is inside any of the holes, if yes, we consider the given point to NOT to be hitting this polygon.
			if(this.holes !== undefined) {
				for(var i = 0; i < this.holes.length; i++) {
					if(this.pointInPoly(metres[0], metres[1], this.holes[i]))
						return false;
				}
			}
			return true;
		}
	}
	return false;
};

Q.PolygonDrawable.prototype.draw = function (ctx, viewport) {
	if(this.type === "zone" && !Q.settings.renderZones)
		return;
	
	ctx.save();
	ctx.beginPath();

	// create path for the "main" polygon
	for(var i = 0; i < this.points.length; i++ ) {
		var p = viewport.transformToPixels(this.points[i]);
		if(i === 0)
			ctx.moveTo(p[0], p[1]);
		else
			ctx.lineTo(p[0], p[1]);
	}
	
	// add holes
	if(this.holes !== undefined && this.holes.length > 0) {
		for(var i = 0; i < this.holes.length; i++ ) {
			var holePoints = this.holes[i];
			for(var j = 0; j < holePoints.length; j++ ) {
				var p = viewport.transformToPixels(holePoints[j]);
				ctx.lineTo(p[0], p[1]);
			}
		}
	}
	
	if(this.color) {
		ctx.globalAlpha = this.isHighlighted ? 0.7 : 0.4;  // transparency on
		ctx.fillStyle = this.color;
		ctx.lineWidth = 1.0;
		ctx.fill();
		ctx.strokeStyle = "#ffffff";
		
	} else {
//		ctx.globalAlpha = this.isHighlighted ? 0.2 : 0.0;
//		ctx.fillStyle = "#000000";
//		ctx.fill();
		ctx.strokeStyle = "#000000";
		ctx.lineWidth = this.isHighlighted ? 5.0 : 3.0;
	}
	ctx.globalAlpha = 1.0;  // transparency off
	if(this.type !== "trackingarea" || (this.type === "trackingarea" && Q.settings.renderTrackingAreaBorders))
		ctx.stroke();

	ctx.closePath();
	ctx.restore();
};

// x & y are in meters!
Q.PolygonDrawable.prototype.pointInPoly = function(x, y, poly) {
	var pts = poly || this.points;
	var i, j, c = false;
	var nvert = pts.length;
	for (i = 0, j = nvert - 1; i < nvert; j = i++) {
		if (((pts[i][1] > y) != (pts[j][1] > y)) && (x < (pts[j][0] - pts[i][0]) * (y - pts[i][1]) / (pts[j][1] - pts[i][1]) + pts[i][0]))
			c = !c;
	}
	return c;
};
