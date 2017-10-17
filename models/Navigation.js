const config = require('config'); 
const MongoClient = require('mongodb').MongoClient; 
const ObjectId = require('mongodb').ObjectId; 

const url = config.get('dbConfig.url'); 

var db; 
var browsingDataCollection; 
var Navigation = {}; 

var list_users = config.get('sessions')[0].users;

MongoClient.connect(url)
	.then((dbInstance) => {
		db = dbInstance; 
		browsingDataCollection = db.collection('browsing_data'); 
	});	


Navigation.getNavigationsByUserName = function(userName) {
	return browsingDataCollection
		.find({
			'userName': userName, 
			'type': 'navigation'
		})
		.toArray();
};

Navigation.getNavigationInfoById = function(objectId) {
	var results = {
		currentNav: null, 
		prevNavId: null, 
		nextNavId: null, 
		screenshots: null
	};

	return new Promise(
		function(resolve, reject) {
			browsingDataCollection
				.findOne({ _id: ObjectId(objectId) })
				.then((currentNav) => {
					results.currentNav = currentNav; 

					return browsingDataCollection
						.findOne({
							'userName': results.currentNav['userName'], 
							'type': 'navigation', 
							'timestamp': {
								'$gt': results.currentNav['timestamp']
							}
						});
				})
				.then((nextNav) => {

					if (nextNav != null) {
						results.nextNavId = nextNav._id; 
					}

					return Navigation.getNextTabViewNavigation(results.currentNav); 
				})
				.then((nextTabViewNav) => {
					return Navigation.getScreenshots(results.currentNav, nextTabViewNav); 
				})
				.then((screenshots) => {
					if (screenshots.length > 0) {
						screenshots[screenshots.length - 1].duration = 1000; 
					}
					
					for (let i = 0; i < screenshots.length - 1; i++) {
						screenshots[i].duration = screenshots[i + 1].timestamp - screenshots[i].timestamp; 
					}

					results.screenshots = screenshots; 

					resolve(results); 
				})
				.catch((err) => {
					console.log('err in getNavigationInfoById()'); 
					console.log(err);
				});
		}
	);
};



Navigation.getRandomNavigation = function() {
	return new Promise(
		function(resolve, reject) {
			Navigation.getRandomDocument()
				.then((randomNav) => {
					return Navigation.getNavigationInfoById(randomNav._id); 
				})
				.then((navObject) => {
					resolve(navObject); 
				})
				.catch((err) => {
					console.log('err in getRandomNavigation()'); 
					console.log(err);
				});

		}
	);
}; 



Navigation.getRandomDocument = function() {
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

	var isTest = false; 

	if (isTest) {
		return browsingDataCollection
			.findOne({
				_id: ObjectId('56f32f1e7e91454e069b7596')
			})
	}

	return new Promise(
		(resolve, reject) => {
			browsingDataCollection
				.aggregate(RANDOM_NAV_PIPELINE, function(err, result) {
					if (err) reject(err); 
					else resolve(result[0]); 
				});
		}
	);
}; 


Navigation.getNavigationById = function(objectId) {
	return browsingDataCollection
		.findOne({
			_id: ObjectId(objectId)
		});
};


Navigation.getNextTabViewNavigation = function(nav) {
	return browsingDataCollection
		.findOne({
			'userName': nav['userName'], 
			'type': 'navigation', 
			'tabViewId': nav['tabViewId'], 
			'timestamp': {
				'$gt': nav['timestamp']
			}
		});
};


Navigation.getScreenshots = function(currentNav, nextNav) {
	var navEndTime = null; 

	if (nextNav == null) navEndTime = new Date().getTime(); 
	else navEndTime = nextNav['timestamp']; 

	console.log('navEndTime=' + navEndTime); 

	return browsingDataCollection
		.find({
			'userName': currentNav['userName'], 
			'type': 'screenshot', 
			'tabViewId': currentNav['tabViewId'], 
			'timestamp': {
				'$gt': currentNav['timestamp'], 
				'$lt': navEndTime
			}
		}, 
		{
			'sort': 'timestamp'
		})
		.toArray();
};

module.exports = Navigation; 