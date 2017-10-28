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
		browsingDataCollection = db.collection('browsing_data_filtered'); 
	});	



Navigation.getNavigationsByUserName = function(userName, isResponse) {
	var findQuery = {
		'userName': new RegExp('^' + userName + '$', 'i'), 
		'type': 'navigation'
	}; 

	if (isResponse) {
		findQuery['$where'] = 'this.responses.length > 0'
	}

	return browsingDataCollection
		.find(findQuery)
		.toArray();
};



Navigation.getAllUsersNavigationCounts = function(isResponse) {
	return new Promise((resolve, reject) => {
		var userCountMap = {}; 

		var FIND_RESPONSES_PIPELINE = [
			{
				'$match': {
					'type': 'navigation'
				}
			},
			{
				'$project': {
					'userName': 1, 
					'responses': 1, 
					'numResponses': {
						'$size': '$responses'
					}
				}
			}
		]; 

		browsingDataCollection.aggregate(FIND_RESPONSES_PIPELINE, (err, docs) => {
			docs.forEach((doc) => {
				if (isResponse && (doc.numResponses == 0)) {
					return; 
				}					

				if (userCountMap.hasOwnProperty(doc.userName)) userCountMap[doc.userName]++; 
				else userCountMap[doc.userName] = 1; 
			}); 

			resolve(userCountMap); 
		}); 
	}); 
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


Navigation.recordResponse = async function(trackId, responseObj) {
	return await browsingDataCollection
		.update({
			trackId: trackId
		}, {
			'$push': {
				responses: responseObj
			}
		});
};



module.exports = Navigation; 