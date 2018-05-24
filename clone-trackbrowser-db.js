const config = require('config'); 
const MongoClient = require('mongodb').MongoClient; 
const ObjectId = require('mongodb').ObjectId; 
const dbUrl = config.get('dbConfig.url'); 
const url = require('url'); 
const PNG = require('pngjs').PNG; 
const path = require('path'); 
const fs = require('fs'); 
const winston = require('winston'); 

winston.level = 'info'; 

const logger = new (winston.Logger)({
	transports: [
		new (winston.transports.File)({ filename: './logs/clone-trackbrowser-db.log' })
	]
});

var sessions = config.get('sessions'); 
var listUsersRegex = []; 
var excludeHostnames = config.get('excludeHostnames'); 

// List the title of sessions to update
// Example: var sessionsToUpdate = ["Spring 2018"];
var sessionsToUpdate = [];

sessions.forEach((session) => {
  if (sessionsToUpdate.includes(session.title)) {
    session.users.forEach((userName) => {
      listUsersRegex.push(new RegExp('^' + userName + '$', 'i'));
    });
  }
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
		_surveyCollection = _db.collection('browsing_data_filtered'); 
    
    // To completely create a new survey collection, 
    // uncomment the line below
		// return _surveyCollection.remove({}); 
  
    // otherwise, keep the existing survey collections
		return true; 
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

		var navCount = 0; 
		var screenshotCount = 0; 

		// lowercase usernames and delete mongodb id to avoid conflicts
		for (var i = 0; i < docs.length; i++) {
			var doc = docs[i]; 

			// convert all usernames to lowercase
			doc.userName = doc.userName.toLowerCase(); 

			// copy original MongoDB ID to another column
			doc.originalId = doc._id; 

			// delete _id to avoid db conflict on insert
			delete doc._id; 


			if (doc.type == 'navigation') {
				navCount++; 
			}
			else if (doc.type == 'screenshot') {
				screenshotCount++; 
			}
			else {
			}
		}

		console.log(navCount + ' navigation entries'); 
		console.log(screenshotCount + ' screenshot entries'); 

		console.log('=========================================='); 
 		console.log('2. Screenshot Check'); 
		console.log(screenshotCount + ' screenshots'); 

		return arrangeNavigations(docs); 
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





/*
	first categorize all navigation entries by usernames
	then, categorize each user navigation by browser tab ID

	sort by timestamp to identify which navigation/screenshot entry first took place in the browser

	there are lots of corner cases

	- in many cases, some screenshot entries may be recorded to the server before the corresponding navigation event packet arrives. for this reason, URLs must be saved by each browser tab for lookup

	- users will frequently switch between tabs. screenshots are only taken when the user is actively using the tab (since TrackBrowser takes a "physical" screenshot before uploading to the server). this may result in a navigation event be recorded long before the screenshot arrives. again, this needs URL comparison in the same browser tab

	- other corner cases still being discovered
*/
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
			var navs = userNavs[userName][tabViewId]; 

			for (var i = 0, navLength = navs.length; i < navLength; i++) {
				var nav = navs[i]; 

				if (nav.type == 'navigation') {
					if ((currentNav != null) && (currentNav.url == nav.url)) {
						navs.splice(i, 1); 
						i--; 
						navLength--;

						continue; 
					}

					else {
						currentNav = nav; 
						currentNav.screenshots = []; 
						currentNav.responses = [];
					}
				}

				else if (nav.type == 'screenshot') {
					if ((currentNav == null) || !isSameUrl(nav.url, currentNav.url) ) {
						// create missing navigation entry from screenshot
						var newNav = createNewNavFromScreenshot(nav); 

						currentNav = newNav; 
						currentNav.originalId = null; 
						currentNav.screenshots = []; 
						currentNav.responses = [];

						logger.info(nav);

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

	console.log(newNavCount + ' screenshots have no matching navigation'); 

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
					// if (!nav.url.includes('yahoo')) console.log(nav); 
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



/*
	check if a navigation's URL is in a valid format
	and does not contain forbidden hostnames in its URL
	(facebook, gmail, compass, etc)
*/
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



/*
	check if a given image file is valid and not blank

	1. file exists
	2. is not a broken PNG
	3. is blank
*/
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



/*
	if a screenshot does not have a matching navigation entry, create a new navigation entry
*/
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



/*
	compare if two URLs are practically the same (query parameters may change inside the same page - those changes should be treated as a same navigation entry)
*/
var isSameUrl = function(url1, url2) {
	var urlObj1 = url.parse(url1); 
	var urlObj2 = url.parse(url2); 

	return ((urlObj1.hostname == urlObj2.hostname) && (urlObj1.path == urlObj2.path)); 

	// TODO: Test cases
}
