// Copyright 2015 Quuppa Oy. All rights reserved.
var Q = Q || {};

Q.Viewport = function () {
	this.w = 100;
	this.h = 100;
	this.centerM = [0, 0];
	// Scale of the viewport. Bigger scale value means more zoomed in. Tells how many pixels 1 meter corresponds to.
	this.scale = 10.0;
	this.rotation = 0;
};

Q.Viewport.prototype.transformToPixels = function(coordsM) {
	var px = coordsM[0];
	var py = -coordsM[1];
	// translate to current viewport center
	px -= this.centerM[0];
	py += this.centerM[1];
    // apply scale
    px *= this.scale;
    py *= this.scale;
	// apply rotation. 
	var r = Math.PI/180*this.rotation;
	p2x = px * Math.cos(r) - py * Math.sin(r);
	p2y = px * Math.sin(r) + py * Math.cos(r);
	//  translate to center of the viewport
    p2x += this.w/2.0;
    p2y += this.h/2.0;
	
	return [p2x, p2y];
};

Q.Viewport.prototype.transformToCoordsM = function(px) {	
	var x = -(this.w/2.0 - px[0]);
	var y = (this.h/2.0 - px[1]);
	// apply rotation. 
	var r = Math.PI/180*this.rotation;
	var x2 = x * Math.cos(r) - y * Math.sin(r);
	var y2 = x * Math.sin(r) + y * Math.cos(r);
	// apply scale
    x2 /= this.scale;
    y2 /= this.scale;
    
    x2 += this.centerM[0];
    y2 += this.centerM[1];
    
    return [x2, y2];
};


Q.Viewport.prototype.pan = function (dx, dy) {
	var r = -Math.PI/180*this.rotation;
	var x2 = dx * Math.cos(r) - dy * Math.sin(r);
	var y2 = dx * Math.sin(r) + dy * Math.cos(r);
	this.centerM[0] = this.centerM[0] + x2 / this.scale;
	this.centerM[1] = this.centerM[1] - y2 / this.scale;
};
