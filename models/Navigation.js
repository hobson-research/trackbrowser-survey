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


// find all navigation entries by username
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


// get navigation counts by each user
// if isResponse flag is true, return the count of navigation entries with at least one user response recorded
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


// get all navigation entries with at least one response
Navigation.getAllResponses = function() {
	return new Promise((resolve, reject) => {
		var responseDocs = []; 

		browsingDataCollection.find({
			'type': 'navigation'
		})
			.forEach((doc) => {
				if (doc.responses.length > 0) {
					delete doc.screenshots;

					responseDocs.push(doc); 
				}
			}, 
			(err) => {
				if (err) reject(err); 
				else resolve(responseDocs); 
			});
	}); 
};


// query and return navigation info by tracking id
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