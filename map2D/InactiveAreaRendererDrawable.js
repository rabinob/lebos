// Copyright 2015 Quuppa Oy. All rights reserved.
var Q = Q || {};
Q.InactiveAreaRendererDrawable = function (polys, holes) {
	this.zIndex = 0;
	this.polys = polys;
	this.holes = holes;
};


Q.InactiveAreaRendererDrawable.prototype.draw = function (ctx, viewport) {
	if(!Q.settings.renderInactiveAreaAsGrey)
		return;
	ctx.save();
	ctx.beginPath();
	ctx.moveTo(0, 0);
	ctx.lineTo(0, viewport.h);
	ctx.lineTo(viewport.w, viewport.h);
	ctx.lineTo(viewport.w, 0);
	ctx.lineTo(0, 0);
	
	for(var i = 0; i < this.polys.length; i++ ) {
		var poly = this.polys[i];
		var a = this.computePolygonArea(poly);
		if(a > 0) {
			for(var j = poly.length-1; j >= 0; j--) {
				var p = viewport.transformToPixels(poly[j]);
				ctx.lineTo(p[0], p[1]);
			}
		} else {
			for(var j = 0; j < poly.length; j++) {
				var p = viewport.transformToPixels(poly[j]);
				ctx.lineTo(p[0], p[1]);				
			}
		}
		ctx.lineTo(0, 0);
	}
	// Holes
	for(var i = 0; i < this.holes.length; i++ ) {
		var hole = this.holes[i];
		var a = this.computePolygonArea(hole);
		if(a < 0) {  // note that we render in reverse order than the polys
			for(var j = hole.length-1; j >= 0; j--) {
				var p = viewport.transformToPixels(hole[j]);
				ctx.lineTo(p[0], p[1]);
			}
		} else {
			for(var j = 0; j < hole.length; j++) {
				var p = viewport.transformToPixels(hole[j]);
				ctx.lineTo(p[0], p[1]);				
			}
		}
		ctx.lineTo(0, 0);
	}

	ctx.globalAlpha = 0.6;  // transparency on
	ctx.fillStyle = "#000000";
	ctx.fill();
	ctx.restore();
};


Q.InactiveAreaRendererDrawable.prototype.computePolygonArea = function (points) {
	if(points.length < 2)
		return 0;
	var N = points.length;
	if(points[0][0] === points[points.length-1][0] && points[0][1] === points[points.length-1][1] )
		N = points.length - 1;
	var i, j, area = 0;
	for(i = 0; i < N; i++) {
		j = (i + 1) % N;
		area += points[i][0] * points[j][1];
		area -= points[i][1] * points[j][0];
	}
	area /= 2.0;
	return area;	
};
