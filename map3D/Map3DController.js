// Copyright 2015 Quuppa Oy. All rights reserved.
var Q = Q || {};
Q.Map3DController = function (datamodel, selectionManager) {
//	if (!Detector.webgl)
//		Detector.addGetWebGLMessage();
	
	var container, stats, camera, renderer;
	var tagDrawables = {}; // map containing all drawables added to map so far
	var ballSize = 0.2;
	this.running = true;
	this.backgroundImages = [];
	
	container = document.getElementById('mapPanel');
	
	$('#mapPanel').append("<div id='buttons' class='bwrap'>" +
			"<button id='1' onclick='Q.Map3DController.controls.topView();'>Top view</button>" +
			"<button id='2' onclick='Q.Map3DController.controls.sideView();'>Side view</button>" +
			"<button id='3' onclick='Q.Map3DController.controls.center();'>Center</button>" +
			"</div>");
	
	var scene = this.__scene = new THREE.Scene();
//		camera = new THREE.CombinedCamera( window.innerWidth / 2, window.innerHeight / 2, 70, 1, 1000, - 500, 1000 );
	camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);

	//controls = new THREE.TrackballControls(camera, container);
	this.controls  = new DomeControls(camera, container);
	Q.Map3DController.controls = this.controls;
	
	$("#zoomIn").click(Q.Map3DController.controls.zoomIn);
	$("#zoomOut").click(Q.Map3DController.controls.zoomOut);
	$("#rotateCW").click(Q.Map3DController.controls.rotateCW);
	$("#rotateCCW").click(Q.Map3DController.controls.rotateCCW);


	this.__geometry = new THREE.SphereGeometry(ballSize, 25, 25);

	var axisHelper = new THREE.AxisHelper();
	axisHelper.scale.x = 100;
	axisHelper.scale.y = 100;
	axisHelper.scale.z = 100;
	axisHelper.position.z = 0.011;
	scene.add(axisHelper);

	var c = Q.settings.gridColor;
	var convertToThreeColor = function(c) {
		if(c.indexOf("#") === 0)
			return [c, 1.0];
		if(c.indexOf("rgba(") === 0) {
			var s = c.substring(5, c.length);
			s = s.substring(0, s.length-1);
			s = s.split(',');
			r = parseInt(s[0]);
			g = parseInt(s[1]);
			b = parseInt(s[2]);
			a = (s.length === 4 ? s[3] : 1);
			return [Q.rgbToHex(r,g,b), a];
		}
	}
	var threeColor = convertToThreeColor(c);
	//console.log(c + " => " + threeColor);	
	var material = new THREE.MeshBasicMaterial({
		transparent : true,
		color : Q.settings.gridColor,
		opacity : Q.settings.gridAlpha, 
		wireframe : false
	});
	var geometry = new THREE.Geometry();
	var h = 0.01;
	for(var i = -100; i <= 100; i+=10) {
	    geometry.vertices.push(new THREE.Vector3(i, -100, h));
	    geometry.vertices.push(new THREE.Vector3(i, 100, h));
	    geometry.vertices.push(new THREE.Vector3(-100, i, h));
	    geometry.vertices.push(new THREE.Vector3(100, i, h));
	}
    var tenMeterGrid = new THREE.LineSegments(geometry, material);
    scene.add(tenMeterGrid);

	var geometry = new THREE.Geometry();
	var h = 0.01;
	for(var i = -100; i <= 100; i+=1) {
	    geometry.vertices.push(new THREE.Vector3(i, -100, h));
	    geometry.vertices.push(new THREE.Vector3(i, 100, h));
	    geometry.vertices.push(new THREE.Vector3(-100, i, h));
	    geometry.vertices.push(new THREE.Vector3(100, i, h));
	}
    var oneMeterGrid = new THREE.LineSegments(geometry, material);
    scene.add(oneMeterGrid);

	// lights
	light = new THREE.DirectionalLight(0xffffff);
	light.position.set(0, 0, 1);
	scene.add(light);
	light = new THREE.AmbientLight(0x222222);
	scene.add(light);

	// renderer
	renderer = new THREE.WebGLRenderer({
		antialias : true
	});
	//renderer.domElement.className = "mapPanel";
	//renderer.autoClear = false;
	//renderer.sortObjects = false;
	renderer.setClearColor(Q.settings.backgroundColor/*0x555555*/, 1);
	renderer.setSize(container.clientWidth, container.clientHeight);
	container.appendChild(renderer.domElement);
	
	var onWindowResize = function() {
		renderer.setSize(container.clientWidth, container.clientHeight);
		console.log("Resizing 3D");
	}
	window.addEventListener( 'resize', onWindowResize, false );

	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.top = '0px';
	stats.domElement.style.zIndex = 100;
	//container.appendChild(stats.domElement);
	
	function animate() {
		if(!that.running)
			return;
		requestAnimationFrame(animate);
		render();
		that.controls.update();
		if(Q.settings.gridVisible) {
			oneMeterGrid.visible = that.controls.getCameraDistance() < 10;
			tenMeterGrid.visible = true;
			axisHelper.visible = true;
		} else {
			oneMeterGrid.visible = false;
			tenMeterGrid.visible = false;
			axisHelper.visible = false;
		}
	}

	function render() {
		renderer.setClearColor(Q.settings.backgroundColor/*0x555555*/, 1);
		renderer.render(scene, camera);
		stats.update();
	}

	
	this.__updateDrawable = function(drawable, tag) {
		drawable.scale.x = Q.settings.dotScaleFactor;
		drawable.scale.y = Q.settings.dotScaleFactor;
		drawable.scale.z = Q.settings.dotScaleFactor;
		
		var pos = tag.getPosition();
		drawable.position.x = pos.x;
		drawable.position.y = pos.y;
		drawable.position.z = pos.z;
		drawable.shadowDrawable.position.x = pos.x;
		drawable.shadowDrawable.position.y = pos.y;
		drawable.shadowDrawable.position.z = 0.015;
		
		// change shadow size as the dot's z changes
		if(drawable.position.z < 0)
			drawable.shadowDrawable.scale.x = drawable.shadowDrawable.scale.y = 0.0;  // hide shadow when "below surface"
		else {
			var heightFactor = drawable.position.z/1.1;  // adjust the 'sensitivity' of the heightFactor by changing this value, together with the max clamping value below.
			if(heightFactor < 1.0)
				heightFactor = 1.0;
			if(heightFactor > 4.0)
				heightFactor = 4.0;
			//console.log("Heightfactor=" + heightFactor);
			drawable.shadowDrawable.scale.x = drawable.shadowDrawable.scale.y = ballSize * Q.settings.dotScaleFactor * heightFactor;
		}
	} 
	
	that = this;
	this.__tagEventHandler = function(prop) {
		// this is set to the tag by the caller within this function..
		if(prop === "__visible") {
			if(!this.__visible) {
				console.log("removing tag viz " + this.id);	
				that.__removeTagMesh(this);
			} else {
				console.log("adding tag viz" + this.id);
				that.__addTagMesh(this);
			}
		} 
	}
	
	var tags = datamodel.getTags();
	this.onTagsAdd(tags);
	
	animate();
};

Q.Map3DController.prototype.uninit = function() {
	console.log("Map3DController.prototype.uninit()");
	this.running = false;
	// unsubscribe from every tag currently rendered
	for(var i = 0; i < this.__scene.children.length; i++) {
		var o = this.__scene.children[i];
		if(o.tag) {
			o.tag.unsubscribe(this.__tagEventHandler);
		}
	}
}

Q.Map3DController.prototype.onSelectionAdd = function(tag) {
	if(Q.settings.centerOnSelected) {
		if(tag.__visible !== undefined && !tag.__visible) {
			Q.notificationManager.showNotification("Tag hidden, click on its dot in tree to make it visible on map!");
			return;			
		}

		var pos = tag.getPosition();
		if(pos)
			this.controls.lookAt(pos.x, pos.y);
	}
};


Q.Map3DController.prototype.onTagsAdd = function(tags) {
	for(var i = 0; i < tags.length; i++) {
		var tag = tags[i];
		if(tag.__visible)  {
			this.__addTagMesh(tag);
		}
		tag.subscribe(this.__tagEventHandler);
	}
}



Q.Map3DController.prototype.onTagsRemove = function(tags) {
	for(var i = 0; i < tags.length; i++) {
		var tag = tags[i];
		tag.unsubscribe(this.__tagEventHandler);
		this.__removeTagMesh(tag);
	}
};


Q.Map3DController.prototype.onTagsUpdate = function(tags) {
	for(var i = 0; i < tags.length; i++) {
		var tag  = tags[i];
		//console.log("Map3DController.prototype.onTagUpdate " + tag.id);
		for(var j = 0; j < this.__scene.children.length; j++) {
			var o = this.__scene.children[j];
			if(o.tag && o.tag === tag) {
				this.__updateDrawable(o, tag);
				break;
			}
		}
	}
};

Q.Map3DController.prototype.onTagUpdateFinished = function() {
//	this.map.render();
};

Q.Map3DController.prototype.onCoordinateSystemChanged = function(coordSys) {
	console.log(".Map3DController.prototype.onCoordinateSystemChanged");
	// remove old bgimages
	for(var i = 0; i < this.backgroundImages.length; i++) {
		this.__scene.remove(this.backgroundImages[i]);
	}
	this.backgroundImages = [];
	// now add new ones
	var data = coordSys.backgroundImages;
	var that = this;
	for ( var i = 0; i < data.length; i++) {
		var bgImg = data[i];
		if(!bgImg.visible)
			continue;
		var image = new Image();
		var callback = function(bgImgData, imageObj, index) {
			return function() {
				var texture = new THREE.Texture( imageObj );
				texture.image = imageObj;
				texture.needsUpdate = true;
				var geo = new THREE.PlaneGeometry(1, 1);
				var material = new THREE.MeshBasicMaterial({map : texture});
				if(bgImgData.alpha < 1.0) {
					material.opacity = bgImgData.alpha; 
					material.transparent = true;
				}
				var mesh = new THREE.Mesh(geo, material);
				mesh.matrixAutoUpdate = false;
				
				
				// rotation
				var rz = new THREE.Matrix4().makeRotationZ(bgImgData.rotation / 180.0 * Math.PI);
				// compute offsets
				var origoOffsetX = (imageObj.width / 2.0 - bgImgData.origoX) *  bgImgData.metersPerPixelX;
				var origoOffsetY = (bgImgData.origoY - imageObj.height / 2.0) *  bgImgData.metersPerPixelY;
				var t = new THREE.Matrix4().makeTranslation(origoOffsetX, origoOffsetY, index/1000.0);
				// compute scales
				var xMeters = imageObj.width * bgImgData.metersPerPixelX;
				var yMeters = imageObj.height * bgImgData.metersPerPixelY;
				var s = new THREE.Matrix4().makeScale(xMeters, yMeters, 1);
				
				mesh.matrix = rz.multiply(t).multiply(s);
				that.__scene.add(mesh);
				that.backgroundImages.push(mesh);
			};
		}(bgImg, image, i);
		image.onload = callback;
		image.src = bgImg.base64;  // Load it!
	}
};


Q.Map3DController.prototype.__addTagMesh = function(tag) {
	var ballSize = 0.2;
	var material = new THREE.MeshLambertMaterial({
		color : tag.info.color,
		shading : THREE.FlatShading
	});
	drawable = new THREE.Mesh(this.__geometry, material);
	drawable.updateMatrix();
	//drawable.matrixAutoUpdate = false;
	this.__scene.add(drawable);
	
	var shadowGeometry = new THREE.CircleGeometry(ballSize*5, 25);
	var shadowMaterial = new THREE.MeshLambertMaterial({
		color : 0x222222,
		shading : THREE.FlatShading,
		transparent : true,
		opacity : 0.6
	});
	var shadowDrawable = new THREE.Mesh(shadowGeometry, shadowMaterial);
	this.__scene.add(shadowDrawable);
	drawable.shadowDrawable = shadowDrawable;
	
	this.__updateDrawable(drawable, tag);
	
	if (tag.name !== undefined)
		drawable.name = tag.name;

	drawable.tag = tag;
	console.log("Map3DController.prototype.__addTagMesh " + tag.id);
}

Q.Map3DController.prototype.__removeTagMesh = function(tag) {
	for(var i = 0; i < this.__scene.children.length; i++) {
		var drawable = this.__scene.children[i];
		if(drawable.tag && drawable.tag === tag) {
			this.__scene.remove(drawable);
			this.__scene.remove(drawable.shadowDrawable);
			console.log("Map3DController.prototype.__removeTagMesh " + tag.id);
			return;
		}
	}
	console.log("ERROR Map3DController.prototype.__removeTagMesh " + tag.id + " mesh not found!");
}

