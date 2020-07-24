// Copyright 2015 Quuppa Oy. All rights reserved.
var Q = Q || {};
Q.NotificationManager = function() {
	$("#notificationBar").hide();
};


Q.NotificationManager.prototype.showNotification = function(msg, howLong) {
	$("#notificationBar").html(msg).show();
	setTimeout(function() {
		$("#notificationBar").fadeOut();
	}, howLong || 2000);
};