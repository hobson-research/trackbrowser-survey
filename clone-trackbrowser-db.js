const config = require('config'); 
const MongoClient = require('mongodb').MongoClient; 
const ObjectId = require('mongodb').ObjectId; 
const url = config.get('dbConfig.url'); 

var db; 
var browsingDataCollection; 
var clonedCollection; 

var list_users = config.get('sessions')[0].users;

MongoClient.connect(url)
	.then((dbInstance) => {
		db = dbInstance; 
		browsingDataCollection = db.collection('browsing_data'); 

		return browsingDataCollection
			.find({
				'userName': {
					'$in': list_users
				}
			})
			.toArray(); 
	})
	.then((allNavs) => {
		console.log(allNavs.length); 
	});
