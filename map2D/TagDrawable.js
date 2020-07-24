// Copyright 2015 Quuppa Oy. All rights reserved.
var Q = Q || {};
Q.TagDrawable = function (tag, img) {
	this.tag = tag;
    this.zIndex = 10;  // by default, tags are a bit elevated
    this.name = undefined;
    this.isSelected = false;
    this.hitAreaSize = 15;
    this.image = img;
    
    
    

    this.__renderCovariance = function (ctx, viewport) {
        var eigenValues = new Float64Array(2);
        var eigenVectors = new Float64Array(4);
        this.__calc2DEigenVectors(this.tag.location.covarianceMatrix, eigenVectors, eigenValues);
        
        // render!
        var pos = this.tag.getPosition();
        ctx.save();
        ctx.beginPath();
        
        for (var ang = 0.0; ang < Math.PI * 2; ang += Math.PI / 10) {
            var x = pos.x + eigenVectors[0] * Math.cos(ang) + eigenVectors[2] * Math.sin(ang);
            var y = pos.y + eigenVectors[1] * Math.cos(ang) + eigenVectors[3] * Math.sin(ang);
            var tmp = viewport.transformToPixels([x, y]);
        	if(ang == 0.0)
        		ctx.moveTo(tmp[0], tmp[1]);
        	else
        		ctx.lineTo(tmp[0], tmp[1]);
        }
        ctx.closePath();
        ctx.fillStyle = this.tag.info.color;
        ctx.globalAlpha = 0.3;
        ctx.fill();
        ctx.restore();
    }
    
    this.__calc2DEigenVectors = function(matrix, eigenVectors, eigenValues) {
        var n = 2;
        var T = matrix[0] + matrix[3];
        var D = matrix[0] * matrix[3] - matrix[1] * matrix[2]; // xxSum * yySum - xySum * xySum;

        eigenValues[0] = T / 2.0 + Math.sqrt(T * T / 4.0 - D);
        eigenValues[1] = T / 2.0 - Math.sqrt(T * T / 4.0 - D);

        if (matrix[1] != 0.0) {
            eigenVectors[0] = eigenValues[0] - matrix[3];
            eigenVectors[1] = matrix[1];
            eigenVectors[2] = eigenValues[1] - matrix[3];
            eigenVectors[3] = matrix[1];
        } else {
            eigenVectors[0] = 1.0;
            eigenVectors[1] = 0.0;
            eigenVectors[2] = 0.0;
            eigenVectors[3] = 1.0;
        }
        for (var k = 0; k < n; k++) {
            var d = 0.0;
            for (var k2 = 0; k2 < n; k2++) {
                d += eigenVectors[k*n+k2] * eigenVectors[k*n+k2];
            }
            d = Math.sqrt(d);
            for (var k2 = 0; k2 < n; k2++) {
                eigenVectors[k*n+k2] *= Math.sqrt(eigenValues[k]) / d;
            }
        }
    }
};


Q.TagDrawable.prototype.hitTest = function (x, y, viewport) {
	if(this.tag.__visible !== undefined && !this.tag.__visible)
		return false;
	var pos = this.tag.getPosition();
	if(pos === undefined)
		return false;
	if(pos.type === "RSSI" && !this.isSelected)
		return false;

	//console.log("HitTest @" + x +":"+y);
	var pxPos = viewport.transformToPixels([pos.x, pos.y]);
	if(x < pxPos[0]-this.hitAreaSize || x > pxPos[0]+this.hitAreaSize || y < pxPos[1]-this.hitAreaSize || y > pxPos[1]+this.hitAreaSize)
		return false;
	return true;
};


Q.TagDrawable.prototype.draw = function (ctx, viewport) {
	if(this.tag.__visible !== undefined && !this.tag.__visible)
		return false;
	var pos = this.tag.getPosition();
	if(pos === undefined)
		return;
	if(pos.type === "RSSI" && !this.isSelected)
		return;

	var pxPos = viewport.transformToPixels([pos.x, pos.y]);
	ctx.save();
	var locationText;
		
	if(pos.type === "RSSI") {
		// rssi location is shown as a halo
		var meters = this.tag.info.rssi > 40 ? 5 : 15;
		// figure out how much in px the 'meters' corresponds to.
		var size = viewport.scale * meters;
		ctx.save();
		ctx.globalAlpha = 0.3;
		ctx.beginPath();
		ctx.arc(pxPos[0], pxPos[1], size, 0, Math.PI*2, false);
		ctx.fillStyle = this.tag.info.color;
		ctx.fill();
		ctx.closePath();
		ctx.restore();
		locationText = "(RSSI, ~" + meters + "m";
		if(pos.age > 10000)
			locationText += ", " + Q.createAgoString(pos.age) + " ago";
		locationText += ")";
	} else {
		// render covariance?
		if(this.isSelected && Q.settings.renderCovarianceForSelected) {
			if(this.tag.location.covarianceMatrix) {
				this.__renderCovariance(ctx, viewport);
			}
		}
		// if positionAccuracy is over user's threshold, we render a halo
		else if(Q.settings.tagPositionAccuracyEnabled) {
			// figure out how much in px the 'meters' corresponds to.
			var size = viewport.scale * this.tag.location.smoothedPositionAccuracy;
			ctx.save();
			ctx.globalAlpha = 0.3;
			ctx.beginPath();
			ctx.arc(pxPos[0], pxPos[1], size, 0, Math.PI*2, false);
			ctx.fillStyle = this.tag.info.color;
			ctx.fill();
			ctx.closePath();
			ctx.restore();
		}
		
		if(this.image !== undefined) {
			ctx.drawImage(this.image, pxPos[0] - this.image.width/2, pxPos[1] - this.image.height/2);
		} else {
			// smoothed and raw show a sharp dot
			var size = 3 + viewport.scale / 3.0 * Q.settings.dotScaleFactor;	
			ctx.beginPath();
			ctx.arc(pxPos[0], pxPos[1], size, 0, Math.PI*2, false);
			ctx.fillStyle = this.tag.info.color;
			ctx.fill();
			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 1;
			ctx.stroke();
			ctx.closePath();
		}

	}		
	
	// draw button pushed visualization (or simple black dot in middle if not pushed)
	ctx.beginPath();
	ctx.fillStyle = "#000000";
	if(this.tag.info.buttonState === 'pushed') {
		ctx.arc(pxPos[0], pxPos[1], 5, 0, Math.PI*2, false);
	} else {
		ctx.arc(pxPos[0], pxPos[1], 1, 0, Math.PI*2, false);
	}
	ctx.fill();
	ctx.closePath();

	if(this.isSelected) {
		ctx.fillStyle = "white";
		ctx.shadowColor = "black";
		ctx.shadowOffsetX = 1;
		ctx.shadowOffsetY = 1;
		ctx.shadowBlur = 1;
		ctx.font = '12pt Calibri';
		var txt = this.tag.info.name || this.tag.id || "Error, no name nor ID!";
		if(this.tag.info.heartRate && this.tag.info.heartRate !== null) {
			txt += " (HR:" + this.tag.info.heartRate + ")"; 
		}
		ctx.fillText(txt, pxPos[0]+2, pxPos[1]);
		if(locationText != undefined) {
			ctx.font = '8pt Calibri';
			ctx.fillText(locationText, pxPos[0]+2, pxPos[1]+12);
		}
	}
	ctx.restore();
};
