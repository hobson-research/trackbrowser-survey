const config = require('config'); 
const MongoClient = require('mongodb').MongoClient; 
const ObjectId = require('mongodb').ObjectId; 
const dbUrl = config.get('dbConfig.url'); 
const url = require('url'); 
const PNG = require('pngjs').PNG; 
const path = require('path'); 
const fs = require('fs'); 

var sessions = config.get('sessions'); 
var listUsersRegex = []; 
var excludeHostnames = config.get('excludeHostnames'); 

sessions.forEach((session) => {
	session.users.forEach((userName) => {
		listUsersRegex.push(new RegExp('^' + userName + '$', 'i'));
	});
});

var _db; 
var _browsingDataCollection; 
var _surveyCollection; 
var screenshotPath = config.get('dataDirectory'); 
var googleMainPageCount = 0; 



MongoClient.connect(dbUrl)
	.then((dbInstance) => {
		_db = dbInstance; 
		_browsingDataCollection = _db.collection('browsing_data'); 
		_surveyCollection = _db.collection('survey_collection'); 

		return _surveyCollection.remove({}); 
	})
	.then((removeResults) => {
		return _browsingDataCollection
			.find({
				'userName': {
					'$in': listUsersRegex
				}, 
				'type': {
					// only grab navigation and screenshot events
					'$in': ['navigation', 'screenshot']
				}
			})
			.sort({
				//sort by time
				'timestamp': 1
			})
			.toArray(); 
	})
	.then(async (docs) => {
		console.log('=========================================='); 
		console.log('0. Select entries of target users');
		console.log(docs.length + ' total navigation and screenshot entries found (unfiltered)'); 
 		
 		console.log('=========================================='); 
 		console.log('1. URL Check'); 
 		// filter only valid URLs
		docs = docs.filter(isValidNavigation); 
		console.log(docs.length + ' entries left after filtering out URLs with possible private information'); 

		var filteredDocs = []; 

		var navCount = 0; 
		var validScreenshotCount = 0; 
		var invalidScreenshotCount = 0;

		// lowercase usernames and delete mongodb id to avoid conflicts
		for (var i = 0; i < docs.length; i++) {
			var doc = docs[i]; 

			// convert all usernames to lowercase
			doc.userName = doc.userName.toLowerCase(); 

			// delete _id to avoid db conflict on insert
			delete doc._id; 

			if (doc.type == 'navigation') {
				filteredDocs.push(doc); 
				navCount++; 
			}
			else if (doc.type == 'screenshot') {
				var isValid = await isValidScreenshot(doc.fileName); 
				
				if (isValid) {
					filteredDocs.push(doc); 
					validScreenshotCount++; 
				}
				else {
					invalidScreenshotCount++; 
					console.log('Excluding screenshot ' + doc.fileName); 
				}
			}
		}

		console.log(navCount + ' navigation entries (excluding screenshots) before arrangement'); 
		console.log(googleMainPageCount + ' google.com main page URLs'); 

		console.log('=========================================='); 
 		console.log('2. Screenshot Check'); 
		console.log(validScreenshotCount + ' valid screenshots, ' + invalidScreenshotCount + ' invalid screenshots'); 

		return arrangeNavigations(filteredDocs); 
	})
	.then((allNavs) => {
		return _surveyCollection.
			insert(allNavs);
	})
	.then(() => {
		_db.close(); 
	})
	.catch((err) => {
		console.log('Error'); 
		console.log(err); 
	}); 





var arrangeNavigations = function(docs) {
	var userNavs = {}; 
	var allNavs = []; 

	docs.forEach((doc) => {
		if (!userNavs.hasOwnProperty(doc.userName)) userNavs[doc.userName] = {}; 
		if (!userNavs[doc.userName].hasOwnProperty(doc.tabViewId)) userNavs[doc.userName][doc.tabViewId] = [];  

		userNavs[doc.userName][doc.tabViewId].push(doc); 
	});

	var newNavCount = 0; 

	// iterate over each user to match screenshots
	for (var userName in userNavs) {
		// iterate over each tabview of a user
		for (var tabViewId in userNavs[userName]) {
			// navigation to add screenshots to
			var currentNav = null; 
			var lastUrlObj = ''; 

			var navs = userNavs[userName][tabViewId]; 

			for (var i = 0, navLength = navs.length; i < navLength; i++) {
				var nav = navs[i]; 

				if (nav.type == 'navigation') {
					currentNav = nav; 
					currentNav.screenshots = []; 
					lastUrlObj = url.parse(nav.url); 

					continue; 
				}

				else if (nav.type == 'screenshot') {
					// 
					if ((currentNav == null) || !isSameUrl(nav.url, currentNav.url) ) {
						// create missing navigation entry from screenshot
						var newNav = createNewNavFromScreenshot(nav); 

						currentNav = newNav; 
						currentNav.screenshots = []; 
						lastUrlObj = url.parse(newNav.url); 

						// insert newly created navigation entry
						navs.splice(i, 0, newNav); 
						i++; 
						navLength++; 

						newNavCount++; 
					}

					currentNav.screenshots.push(navs.splice(i, 1)[0]); 
					i--; 
					navLength--; 
				}
			}
		}
	}

	console.log(newNavCount + ' new navigation entries created from unmatched screenshots'); 

	var noScreenshotsLength = 0; 
	var negativeDurationsLength = 0; 

	// iterate over each user to match screenshots
	for (var userName in userNavs) {
		var allUserNavs = []; 

		// iterate over each tabview of a user
		for (var tabViewId in userNavs[userName]) {
			var navs = userNavs[userName][tabViewId]; 

			for (var i = 0, navLength = navs.length; i < navLength; i++) {
				var nav = navs[i]; 

				nav.trackId = nav.userName + '-' + nav.tabViewId + '-' + i;

				if (nav.screenshots.length == 0) {
					noScreenshotsLength++; 
				}

				else {
					for (var screenshotIndex = 0; screenshotIndex < nav.screenshots.length - 1; screenshotIndex++) {
						nav.screenshots[screenshotIndex].duration = nav.screenshots[screenshotIndex + 1].timestamp - nav.screenshots[screenshotIndex].timestamp; 
					}


					nav.screenshots[nav.screenshots.length - 1].duration = null; 

					allUserNavs.push(nav); 	
				}
			}
		}


		// sort all user navigations by timestamp
		allUserNavs.sort((a, b) => {
			return a.timestamp - b.timestamp; 
		});


		// calculate durations for last screenshot items 
		// and set next navigation track ID
		for (var i = 0, navLength = allUserNavs.length - 1; i < navLength; i++) {
			var nav = allUserNavs[i]; 

			var duration = allUserNavs[i + 1].timestamp - nav.screenshots[nav.screenshots.length - 1].timestamp; 

			if (duration >= 0) {
				nav.screenshots[nav.screenshots.length - 1].duration = duration;
			} else {
				negativeDurationsLength++; 
			}

			nav.nextTrackId = allUserNavs[i + 1].trackId; 
		}

		if (allUserNavs.length > 0) {
			allUserNavs[allUserNavs.length - 1].nextTrackId = null; 
		}

		allNavs = allNavs.concat(allUserNavs); 
	}

	console.log(negativeDurationsLength + ' screenshots have negative duration values, will be set to null'); 
	console.log(noScreenshotsLength + ' navigation entries do not have screenshots'); 
	console.log('=========================================='); 
	console.log('Results');
	console.log(allNavs.length + ' navigation entries after pre-processing'); 

	return allNavs; 
}; 

var isValidNavigation = function(navObj) {
	urlString = navObj.url; 

	if (urlString == null) {
		return false; 
	}

	var urlObj = url.parse(urlString); 

	if (urlObj.hostname == null) {
		return false; 
	}

	else if (urlObj.hostname == 'www.google.com') {
		if (urlObj.hash == null && (urlObj.path == '/?gws_rd=ssl' || urlObj.path == '/')) {
			googleMainPageCount++; 
			return true; 
		}
	}

	else {
		for (var i = 0; i < excludeHostnames.length; i++) {
			if (urlObj.hostname.includes(excludeHostnames[i])) {
				return false; 
			}
		}
	}

	return true; 
};



var isValidScreenshot = function(fileName) {
	return true; 
	/*
	return new Promise(
		(resolve, reject) => {
			var filePath = path.join(screenshotPath, fileName);

			try {
				var data = fs.readFileSync(filePath); 
				var image = PNG.sync.read(data); 

				// console.log(image); 
				// console.log('width=' + image.width + ', height=' + image.height);

				if (image.width < 50 || image.height < 200) {
					resolve(false); 
					return; 
				}

				var topIndex = 130; 
				var bottomIndex = image.height - 100; 

				var leftIndex = 0; 
				var rightIndex = image.width - 25; 

				for (var i = leftIndex; i < rightIndex; i += 8) {
					for (var j = topIndex; j < bottomIndex; j += 8) {
						var pixelIndex = (image.width * j + i) << 2; 

						if (image.data[pixelIndex] != 255 || image.data[pixelIndex + 1] != 255 || image.data[pixelIndex + 2] != 255) {
							// console.log('(x=' + i + ', y=' + j + ')'); 
							// console.log(image.data[pixelIndex] + ', ' + image.data[pixelIndex + 1] + ', ' + image.data[pixelIndex + 2]);

							resolve(true); 
							return; 
						}
					}
				}

				resolve(false); 
			} catch(e) {
				console.log('exception'); 
				if (e.hasOwnProperty('code') && e.code == 'ENOENT') {
					console.log("File doesn't exist"); 
				}

				resolve(false); 
			}
		}
	);
	*/
};



var createNewNavFromScreenshot = function(screenshot) {
	return {
		'type': 'navigation', 
		'tabViewId': screenshot.tabViewId, 
		'url': screenshot.url, 
		'userName': screenshot.userName, 
		'date': new Date(screenshot.timestamp - 1).toGMTString(), 
		'timestamp': screenshot.timestamp - 1
	}; 
};



var isSameUrl = function(url1, url2) {
	var urlObj1 = url.parse(url1); 
	var urlObj2 = url.parse(url2); 

	return ((urlObj1.hostname == urlObj2.hostname) && (urlObj1.path == urlObj2.path)); 
}
