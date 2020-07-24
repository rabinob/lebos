// Copyright 2015 Quuppa Oy. All rights reserved.
var Q = Q || {};
Q.Map2D = function (canvas) {
	this.__drawables = [];
	this.__canvas = canvas;
	
	// give others access to viewport
	this.viewport = new Q.Viewport();
};

Q.Map2D.prototype.addDrawable = function (drawable) {
	var index = this.__drawables.indexOf(drawable);
	if (index == -1) {
		this.__drawables.push(drawable);
		this.__drawables.sort(function(a,b){
			var za = (a.zIndex !== undefined ? a.zIndex : 0);
			var zb = (b.zIndex !== undefined ? b.zIndex : 0);
			return za-zb;
		});
		if (drawable.setContainingMap !== undefined)
			drawable.setContainingMap(this);
	}
};

Q.Map2D.prototype.bringToTop = function(drawable) {
	var a = this.__drawables;
	var from = a.indexOf(drawable);
	if(from < 0)
		return;
	
	// find the last drawable with same zIndex
	var to = a.length - 1;
	for(; to > -1; to--) {
		if(a[to].zIndex <= drawable.zIndex) {
			break;
		}
	}
	// move it
	a.splice(to, 0, a.splice(from, 1)[0]);
};

Q.Map2D.prototype.removeDrawable = function (drawable) {
	var index = this.__drawables.indexOf(drawable);
	if (index > -1) {
		if (drawable.setContainingMap !== undefined)
			drawable.setContainingMap(undefined);
		this.__drawables.splice(index, 1);
	}
};

Q.Map2D.prototype.removeAllDrawables = function () {
	for(var i = 0; i < this.__drawables.length; i++) {
		var drawable = this.__drawables[i];
		if (drawable.setContainingMap !== undefined)
			drawable.setContainingMap(undefined);
	}
	this.__drawables = [];
};

Q.Map2D.prototype.getDrawables = function () {
	return this.__drawables;
};


Q.Map2D.prototype.render = function () {
	var ctx = this.__canvas.getContext("2d");
	//http://stackoverflow.com/questions/1664785/html5-canvas-resize-to-fit-window
	//ctx.canvas.width = window.innerWidth;
	//ctx.canvas.height = window.innerHeight;
	ctx.canvas.width = this.viewport.w = this.__canvas.clientWidth;
	ctx.canvas.height = this.viewport.h = this.__canvas.clientHeight;
	//console.log(window.innerWidth + ":" + window.innerHeight +":"+ this.__canvas.clientWidth +":"+ this.__canvas.clientHeight);
	// clear background
	//ctx.fillStyle = "#ffffff";
	ctx.fillStyle = Q.settings.backgroundColor; //"#000000";
	ctx.fillRect(0, 0, this.viewport.w, this.viewport.h);
	
//	ctx.translate(this.viewport.w/2, this.viewport.h/2);
//	ctx.rotate((Math.PI/180)*Q.settings.map2DRotation);
//	ctx.translate(-this.viewport.w/2, -this.viewport.h/2);
	
	//console.log("cx=" + this.viewport.centerM[0] + " cy=" + this.viewport.centerM[1] + " s=" + this.viewport.scale + " r=" + this.viewport.rotation  );
	
	for (var i = 0; i < this.__drawables.length; i++) {
		this.__drawables[i].draw(ctx, this.viewport);
	}
	
	if(this.labelString && this.labelPositionPx) {
		var PADDING = 5;
		ctx.fillStyle = "#000000";
		ctx.font="20px Calibri";
		ctx.globalAlpha = 0.6;
		var w = ctx.measureText(this.labelString).width;
		var h = 15;  //ctx.font.height
		ctx.fillRect(this.labelPositionPx[0], this.labelPositionPx[1]-h-2*PADDING, w+2*PADDING, h+2*PADDING);
		ctx.fillStyle="#ffffff";
		ctx.globalAlpha = 1.0;
		ctx.fillText(this.labelString, this.labelPositionPx[0]+PADDING, this.labelPositionPx[1]-PADDING);
	}
};


Q.Map2D.prototype.renderLabel = function (str, locationPx) {
	this.labelString = str;
	this.labelPositionPx = locationPx;
	this.render();
}

Q.Map2D.prototype.onresize = function () {
	
}