DomeControls = function ( camera, domElement ) {

	var _this = this;

	this.camera = camera;
    this.camera.matrixAutoUpdate = false;

	this.domElement = ( domElement !== undefined ) ? domElement : document;

	
	var mouseStartX, mouseStartY;
    var cameraLookAtPos = new THREE.Vector2(0, 10);
    var cameraDistance = 60;
    var cameraTilt = 45/180*Math.PI;
    var cameraRotation = 90/180*Math.PI;
    var cameraTargetLookAtPos = new THREE.Vector2(0,0);
    var cameraTargetRotation = 0/180*Math.PI;
    var cameraTargetTilt = 45/180*Math.PI;
    var cameraTargetDistance = 50;

	this.update = function () {
        // update camera position, lookAt position, and up vectors
        cameraLookAtPos.x += (cameraTargetLookAtPos.x - cameraLookAtPos.x) * 0.05;
        cameraLookAtPos.y += (cameraTargetLookAtPos.y - cameraLookAtPos.y) * 0.05;
        cameraRotation += (cameraTargetRotation - cameraRotation) * 0.05;
        cameraTilt += (cameraTargetTilt - cameraTilt) * 0.05;
        cameraDistance += (cameraTargetDistance - cameraDistance) * 0.05;
        //console.log("camPos="+cameraLookAtPos.x+":"+cameraLookAtPos.y +" cameraRotation="+cameraRotation +" cameraTilt="+cameraTilt +" cameraDistance="+cameraDistance);
        
        var transform = new THREE.Matrix4();
        var t1 = new THREE.Matrix4().makeTranslation(cameraLookAtPos.x, cameraLookAtPos.y, 0);
        var rz = new THREE.Matrix4().makeRotationZ(cameraRotation);
        var rx = new THREE.Matrix4().makeRotationX(cameraTilt);
        var t2 = new THREE.Matrix4().makeTranslation(0,0,cameraDistance);
        camera.matrixWorld = t1.multiply(rz).multiply(rx).multiply(t2);
	};

	this.topView = function() {
		//cameraTargetRotation = 0;
		cameraTargetTilt = 0;
	};

	this.sideView = function() {
		cameraTargetTilt = 90/180*Math.PI;
	};

	this.center = function() {
		cameraTargetTilt = 0;
		cameraTargetRotation = 0;
		cameraTargetLookAtPos = new THREE.Vector2(0,0);
	};

	this.lookAt = function(x, y) {
		cameraTargetLookAtPos =  new THREE.Vector2(x,y);
	}
	
	this.zoomIn = function() {
		cameraTargetDistance -= 5;
		clampCamDistance();
	}
	this.zoomOut = function() {
		cameraTargetDistance += 5;
		clampCamDistance();
	}

	this.rotateCW = function() {
		cameraTargetRotation += 90/180*Math.PI;
	}
	this.rotateCCW = function() {
		cameraTargetRotation -= 90/180*Math.PI;
	}

	this.getCameraDistance = function() { return cameraDistance; };

	// listeners
	function mousedown( event ) {
		event.preventDefault();
		event.stopPropagation();
		
		mouseStartX = event.clientX;
		mouseStartY = event.clientY;
		
		domElement.addEventListener( 'mousemove', mousemove, false );
		domElement.addEventListener( 'mouseup', mouseup, false );
	}

	function mousemove( event ) {
		//console.log("event.buttons=" + event.buttons);
		var dy = event.clientY - mouseStartY;
		var dx = mouseStartX - event.clientX;
		if(event.buttons == 2) {
			cameraTargetRotation += 0.1*dx/180*Math.PI;
			cameraTargetTilt -= 0.1*dy/180*Math.PI;
			if(cameraTargetTilt > Math.PI/2.0)
				cameraTargetTilt = Math.PI/2.0;
			else if(cameraTargetTilt < 0.0)
				cameraTargetTilt = 0.0;
		} else if(event.buttons == 1) {
			// rotate deltas
			var cos = Math.cos(cameraRotation);
			var sin = Math.sin(cameraRotation);
			var ddx = cos * dx - sin * dy;
			var ddy = cos * dy + sin * dx;
			cameraTargetLookAtPos.x += ddx * 0.01;
			cameraTargetLookAtPos.y += ddy * 0.01;
		}
		
		mouseStartX = event.clientX;
		mouseStartY = event.clientY;
		
		event.preventDefault();
		event.stopPropagation();
	}

	function mouseup( event ) {
		event.preventDefault();
		event.stopPropagation();
		domElement.removeEventListener( 'mousemove', mousemove );
		domElement.removeEventListener( 'mouseup', mouseup );
	}

	function clampCamDistance() {
		if(cameraTargetDistance > 50)
			cameraTargetDistance = 50;
		else if(cameraTargetDistance < 3)
			cameraTargetDistance = 3;
	}
	
	function mousewheel( event ) {
		event.preventDefault();
		event.stopPropagation();

		var delta = 0;
		if ( event.wheelDelta ) { // WebKit / Opera / Explorer 9
			delta = event.wheelDelta / 40;
		} else if ( event.detail ) { // Firefox
			delta = - event.detail / 3;
		}

		cameraTargetDistance -= delta / 10;
		clampCamDistance();
	}

	

	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	this.domElement.addEventListener( 'mousedown', mousedown, false );
	this.domElement.addEventListener( 'mousewheel', mousewheel, false );
	this.domElement.addEventListener( 'DOMMouseScroll', mousewheel, false ); // firefox

//	window.addEventListener( 'keydown', keydown, false );
//	window.addEventListener( 'keyup', keyup, false );
};
