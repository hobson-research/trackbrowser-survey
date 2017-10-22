const config = require('config'); 
const MongoClient = require('mongodb').MongoClient; 
const ObjectId = require('mongodb').ObjectId; 

const url = config.get('dbConfig.url'); 

var db; 
var browsingDataCollection; 
var Navigation = {}; 

MongoClient.connect(url)
	.then((dbInstance) => {
		db = dbInstance; 
		browsingDataCollection = db.collection('survey_collection'); 
	});	



Navigation.getNavigationsByUserName = function(userName) {
	return browsingDataCollection
		.find({
			'userName': new RegExp('^' + userName + '$', 'i'), 
			'type': 'navigation'
		})
		.toArray();
};



Navigation.getNavigationInfoById = function(trackId) {
	return new Promise(
		(resolve, reject) => {
			browsingDataCollection
				.findOne({ trackId: trackId })
				.then((currentNav) => {
					resolve(currentNav); 
				})
				.catch((err) => {
					console.log('err in getNavigationInfoById()'); 
					console.log(err);
				});
		}
	);
};



Navigation.getNavigationById = function(trackId) {
	return browsingDataCollection
		.findOne({
			trackId: trackId
		});
};



module.exports = Navigation; 