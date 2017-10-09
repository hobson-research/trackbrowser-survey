const express = require('express');
const MongoClient = require('mongodb').MongoClient; 
const ObjectId = require('mongodb').ObjectId; 

const url = 'mongodb://localhost:27017/trackbrowser'; 

var app = express(); 
var http = require('http').Server(app); 

// set static assets
app.use(express.static('public'));
app.set('view engine', 'jade');
app.locals.pretty = true;

var db; 

var list_users = ['Bubble', 'Dargude2', 'kakakyle0214 ', 'Katy', 'Lewyreus', 'Liangwenqian93 ', 'Locust', 'Naruto', 'Pommel9', 'rookie', 'ssshah10', 'tanvirotkar', 'ventra', 'zlow4', 'zsosa']

// MongoDB aggregation query pipeline to randomly sample a navigation
var RANDOM_NAV_PIPELINE = [
	{
		"$match": {
			"userName": list_users[0],
			"type": "navigation"
		}
	},
	{
		"$sample": { 
			"size": 1
		}
	}
]; 

var init = function() {
	http.listen(8088, function() {
		console.log("Listening to port 8088"); 
	});
}; 

var getConnection = new Promise(
	function(resolve, reject) {
		if (db != null) resolve(db); 
		else resolve(MongoClient.connect(url)); 
	}
);

var getRandomNavigation = function() {
	var db = null; 

	var results = {
		currentNav: null, 
		nextNav: null, 
		screenshots: null
	};

	return new Promise(
		function(resolve, reject) {
			getConnection
				.then((dbInstance) => {
					db = dbInstance; 

					return getRandomDocument(db); 
				})
				.then((randomNav) => {
					results.currentNav = randomNav; 

					return getNextNavigation(db, results.currentNav); 
				})
				.then((nextNav) => {
					results.nextNav = nextNav; 

					return getScreenshots(db, results.currentNav, results.nextNav); 
				})
				.then((screenshots) => {
					results.screenshots = screenshots; 

					resolve(results); 
				})
				.catch((err) => {
					console.log('err in getRandomNavigation()'); 
					console.log(err);
				});

		}
	);
}; 


var getRandomDocument = function(db) {
	var tempLastNavTest = true; 

	if (tempLastNavTest) {
		return db.collection('browsing_data')
			.findOne({
				_id: ObjectId('56f32f1e7e91454e069b7596')
			})
	}

	return new Promise(
		(resolve, reject) => {
			db.collection('browsing_data')
				.aggregate(RANDOM_NAV_PIPELINE, function(err, result) {
					if (err) reject(err); 
					else resolve(result[0]); 
				});
		}
	);
}; 

var getNextNavigation = function(db, nav) {
	return db.collection('browsing_data')
		.findOne({
			'userName': nav['userName'], 
			'type': 'navigation', 
			'tabViewId': nav['tabViewId'], 
			'timestamp': {
				'$gt': nav['timestamp']
			}
		});
};

var getScreenshots = function(db, currentNav, nextNav) {
	var navEndTime = null; 

	if (nextNav == null) navEndTime = new Date().getTime(); 
	else navEndTime = nextNav['timestamp']; 

	console.log('navEndTime=' + navEndTime); 

	return db.collection('browsing_data')
		.find({
			'userName': currentNav['userName'], 
			'type': 'screenshot', 
			'tabViewId': currentNav['tabViewId'], 
			'timestamp': {
				'$gt': currentNav['timestamp'], 
				'$lt': navEndTime
			}
		})
		.toArray();
};

app.get('/', function(req, res) {
	res.end("Send some return data"); 
});

/*
	chained queries

	1. connect to database
	2. get a random navigation record
	3. get the next navigation record (null if last navigation event)
	4. find screenshots in between the two navigation events

	
*/

getRandomNavigation()
	.then((navObj) => {
		console.log('results'); 
		console.log(navObj); 

		console.log(navObj.screenshots.length + ' screenshots'); 

		if (navObj.screenshots.length > 1) {
			var isSame = true; 

			for (var i = 0; i < navObj.screenshots.length; i++) {
				var screenshot = navObj.screenshots[i]; 

				if (screenshot.url != navObj.currentNav.url) {
					console.log(screenshot); 
					console.log(screenshot.url); 
					console.log(navObj.currentNav.url); 

					isSame = false; 
					break; 
				}
			}

			if (isSame) console.log('All urls same'); 
			else console.log('url different!!!!!!!!!!!!!!!!!!!!!'); 
		}
	})
	.catch((err) => {
		console.log('Error in getting data'); 
		console.log(err); 
	});