// Copyright 2015 Quuppa Oy. All rights reserved.
var Q = Q || {};

Q.currentCoordinateSystem === undefined;

Q.switchCoordinateSystem = function(id) {
	if(Q.coordinateSystems === undefined)
		return; // not yet loaded?
	var coordSys = Q.coordinateSystems[id];
	if(coordSys === undefined)
		return;

	Q.coordSysTagFilter.setCoordSystem(id);
	Q.mapController.onCoordinateSystemChanged(coordSys);
	Q.currentCoordinateSystem = coordSys;
};

Q.init2DMap = function() {
	if(Q.mapController && Q.mapController.uninit)
		Q.mapController.uninit();
	Q.coordSysTagFilter.removeListener(Q.mapController);
	Q.selectionManager.removeListener(Q.mapController);
	
	$("#mapPanel").empty();
	var newCanvas = $('<canvas id="mapCanvas" class="mapPanel">Your browser does not support the HTML5 canvas tag.</canvas>');
	$('#mapPanel').append(newCanvas);
	
	Q.mapController = new Q.Map2DController(Q.coordSysTagFilter, Q.selectionManager);
	Q.coordSysTagFilter.addListener(Q.mapController);
	Q.selectionManager.addListener(Q.mapController);

	if(Q.currentCoordinateSystem !== undefined)
		Q.mapController.onCoordinateSystemChanged(Q.currentCoordinateSystem);
};

Q.init3DMap = function() {
	if(Q.mapController && Q.mapController.uninit)
		Q.mapController.uninit();
	Q.coordSysTagFilter.removeListener(Q.mapController);
	Q.selectionManager.removeListener(Q.mapController);
	
	$("#mapPanel").empty();
	
	Q.mapController = new Q.Map3DController(Q.coordSysTagFilter, Q.selectionManager);
	Q.coordSysTagFilter.addListener(Q.mapController);
	Q.selectionManager.addListener(Q.mapController);

	if(Q.currentCoordinateSystem !== undefined)
		Q.mapController.onCoordinateSystemChanged(Q.currentCoordinateSystem);
};

function main() {
	Q.notificationManager = new Q.NotificationManager();
	Q.selectionManager = new Q.SelectionManager();
	var datamodel = new Q.TagDataRetriever(100);
	var keywordFilter = new Q.KeywordTagFilter(datamodel);
	Q.coordSysTagFilter = new Q.CoordinateSystemTagFilter(keywordFilter);

	var treeController = new Q.TreeController(Q.coordSysTagFilter, Q.selectionManager);
	Q.coordSysTagFilter.addListener(treeController);
	Q.selectionManager.addListener(treeController);

	Q.init2DMap();
	
	Q.selectionManager.addListener({
		onSelectionAdd: function(obj) {
			var pos = datamodel.getTag(obj.id).getPosition();
			if(pos === undefined) {
				Q.notificationManager.showNotification("Cannot show on map, as this tag has no location information at all!");
				return;
			}
		}
	});
	
	datamodel.addListener({
		onTagsUpdate: function(tags) {
			for(var i = 0; i < tags.length; i++) {
				var tag = tags[i];
				if(tag.__autoFollow) {
					if(tag.location !== undefined && tag.location.coordinateSystemId !== Q.currentCoordinateSystem.id) {
						Q.switchCoordinateSystem(tag.location.coordinateSystemId);
						Q.notificationManager.showNotification("Auto-followed tag moved to another coordinate system, autoswitching to that.");
						$("#coordSysSelect").val(tag.location.coordinateSystemName);
						return;
					}
				}
			}
		}
	})
	

	Q.coordinateSystems = {};
	
	// fetch project data (coordinate systems, background images etc.)
	jQuery.ajax({
		url : "../qpe-web-6.2.1/getProjectInfo?version=2",
		dataType : 'json',
		async : true,
		success : function (data, textStatus, jqXHR) {
			// add coor sys names to select box and to map
			data = data.coordinateSystems;
			if(data === undefined)
				return;
			
			// sort coordinate systems by name
			data.sort(function(a,b){
				return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0);
			});

			for(var i = 0; i < data.length; i++) {
				data[i].name = data[i].name || data[i].id;
				$("#coordSysSelect").append('<option id="' + data[i].id + '">' + data[i].name + '</option>');
				// put it in map datastructure (for easier lookups later)
				Q.coordinateSystems[data[i].id] = data[i];
			}
			
			// as backgroundimages used in other coordinates systems do not appear "natively" under that coordinatesystem, we need to add a reference to it
			for(var i = 0; i < data.length; i++) {
				for(var j = 0; j < data[i].backgroundImages.length; j++) {
					var bg = data[i].backgroundImages[j];
					if(bg.otherCoordSys !== undefined) {
						var otherCSs = bg.otherCoordSys.split(',');
						delete bg.otherCoordSys;  // remove when processed so that this does not get into infinite loop...
						for(var k = 0; k < otherCSs.length; k++) {
							var csID = otherCSs[k];
							var cs = Q.coordinateSystems[csID];
							if(cs !== undefined) {
								cs.backgroundImages.push(bg);
							}							
						}
					}
				}
			}
			
			if(data.length > 0) {
				// select the first coordinate system to be shown first
				Q.switchCoordinateSystem(data[0].id);
			}

		},
		error : function (jqXHR, textStatus, errorThrown) {
			Q.notificationManager.showNotification("Loading project information from server failed, please check your network connection.");
		}
	});

	$("#tagIDFilter").keyup(function(e) {
		//console.log("CHANGED " + $("#tagIDFilter").val());
		keywordFilter.setKeyword($("#tagIDFilter").val());
	});

	$("#tagFieldFilter").keyup(function(e) {
		//console.log("CHANGED " + $("#tagIDFilter").val());
		treeController.setFieldFilter($("#tagFieldFilter").val());
	});

	$("#coordSysSelect").change(function() {
		var id = $("#coordSysSelect option:selected").attr('id');
		Q.switchCoordinateSystem(id);
	});
	
	$("#tagSortButton").click(function() {
		datamodel.sort();
	});
	
	$("#show2DMap").click(function() {
		Q.init2DMap();
	});
	
	$("#show3DMap").click(function() {
		Q.init3DMap();
	});
	
	
	var dragStartPosX;
	var leftPaneStartW;
	var rightPaneStartW;
	$('#drawer').on('dragstart', function(event) { event.preventDefault(); });
	$("#drawer").mousedown(function(e) {
		if(e.which === 1) { // left mouse down
			rightPaneStartW = $("#mapContainer").width();
			leftPaneStartW = $("#leftPane").width();
			dragStartPosX = e.pageX;

			$(window).mousemove(function(e) {
				if(e.which === 1) { // left mouse down
					var dx = e.clientX - dragStartPosX;
					//console.log("Mousemove " + dx);
					if(leftPaneStartW+dx > 0 && rightPaneStartW-dx > 5) {
						$("#mapContainer").width(rightPaneStartW-dx);
						$("#leftPane").width(leftPaneStartW+dx);
					}
				}
				e.preventDefault();
			});
			$(window).mouseup(function(e) {
				//console.log("MOUSEUP");
				// convert width values from px to percentage so that window.resize works automatically
				var totalWidth = $(window).width();
				var leftPaneWidth = $("#leftPane").width();
				var rightPaneWidth = $("#mapContainer").width();
				var left = leftPaneWidth / totalWidth * 100.0;
				var right = rightPaneWidth / totalWidth * 100.0;
				$("#mapContainer").width(right + "%");
				$("#leftPane").width(left + "%");
				dragStartPosX = undefined;
				$(window).unbind("mousemove");
				$(window).unbind("mouseup");
			});
			
		}
	});
	
	var el = document.getElementById("drawer");
	var onTouchMove = function(e) {
		e.preventDefault();
		if (event.targetTouches.length == 1 && dragStartPosX !== undefined) {
			var touch = event.targetTouches[0];
			var dx = touch.clientX - dragStartPosX;
			if(leftPaneStartW+dx > 0 && rightPaneStartW-dx > 5) {
				$("#mapContainer").width(rightPaneStartW-dx);
				$("#leftPane").width(leftPaneStartW+dx);
			}
		}
	}
	var onTouchEnd = function(e) {
		e.preventDefault();
		// convert width values from px to percentage so that window.resize works automatically
		var totalWidth = $(window).width();
		var leftPaneWidth = $("#leftPane").width();
		var rightPaneWidth = $("#mapContainer").width();
		var left = leftPaneWidth / totalWidth * 100.0;
		var right = rightPaneWidth / totalWidth * 100.0;
		$("#mapContainer").width(right + "%");
		$("#leftPane").width(left + "%");
		dragStartPosX = undefined;
		el.removeEventListener("touchmove", onTouchMove);
		el.removeEventListener("touchend", onTouchEnd);
	};
	el.addEventListener("touchstart", function(e) {
		e.preventDefault();
		if (e.targetTouches.length == 1) {
			rightPaneStartW = $("#mapContainer").width();
			leftPaneStartW = $("#leftPane").width();
			dragStartPosX = e.targetTouches[0].pageX;
			el.addEventListener("touchmove", onTouchMove, false);
			el.addEventListener("touchend", onTouchEnd, false);
		}
	}, false);
	//el.addEventListener("touchcancel", handleCancel, false);

	
//	$("#drawer").click(function() {
//		$("#leftPane").toggle();
//		if ($("#leftPane").is(":visible")) {
//			$("#mapContainer").width("80%");
//			$("#leftPane").width("20%");
//		} else {
//			$("#mapContainer").width("100%");
//		}
//	});

	String.prototype.endsWith = function(suffix) {
		return this.indexOf(suffix, this.length - suffix.length) !== -1;
	};

	
	Q.createAgoString = function(d) {
		if(d < 1000)
			return d + " ms";
		d = Math.floor(d/1000);
		if(d < 60)
			return d + " s";
		d = Math.floor(d/60);
		if(d < 60)
			return d + " min";
		d = Math.floor(d/60);
		return d + "hrs";
	};

	Q.createDisplayDate = function(d) {
		return d.getHours() + ":" + d.getMinutes() + "." + d.getSeconds();
	}
	
	function componentToHex(c) {
	    var hex = c.toString(16);
	    return hex.length == 1 ? "0" + hex : hex;
	}
	
	Q.rgbToHex = function(r, g, b) {
	    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
	}
};