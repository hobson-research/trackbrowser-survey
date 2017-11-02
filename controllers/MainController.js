const config = require('config'); 
const json2csv = require('json2csv'); 
const fs = require('fs'); 
const Navigation = require(__dirname + '/../models/Navigation');

const webpageTypes = config.get('webpageTypes'); 

var MainController = {}; 

MainController.getIndex = function(req, res) {
	renderIndex(req, res, false); 
};

MainController.getUserNavigations = function(req, res) {
	renderUserNavigations(req, res, false); 
};

MainController.getNavigation = function(req, res) {
	renderNavigation(req, res, false); 
};

MainController.getResponseIndex = function(req, res) {
	renderIndex(req, res, true); 
};

MainController.getUserNavigationResponse = function(req, res) {
	renderUserNavigations(req, res, true); 
};

MainController.getNavigationResponse = function(req, res) {
	renderNavigation(req, res, true); 
};

MainController.postSurvey = function(req, res) {
	var responseObj = {
		'timestamp': new Date().getTime(), 
		'webpage-type': req.body['webpage-type'], 
		'characterize-research': req.body['characterize-research'], 
		'company-name': req.body['company-name']
	};

	console.log(req.body); 

	Navigation.recordResponse(req.params.trackId, responseObj)
		.then((recordResult) => {
			if(req.body.next != '') {
				res.redirect('/navigation/' + req.body.next); 
			} else {
				res.send('End of survey'); 
			}
		});
}; 

MainController.exportResponsesToCSV = function(req, res) {
	var fields = ['nav-username', 'nav-url', 'nav-date', 'response-date', 'webpage-type', 'characterize-research', 'company-name']; 
	var browsingData = []; 
	var csvData = []; 

	var exportDateStr = new Date().toISOString().substr(0, 10).replace(/-/g, "_"); 
	var exportFileName = "tb_responses" + "_" + exportDateStr + ".csv"; 
	var exportFilePath =  __dirname + "/../export/" + exportFileName; 

	Navigation.getAllResponses()
		.then((allResponses) => {
			allResponses.forEach((nav) => {
				nav.responses.forEach((response) => {
					csvData.push({
						'nav-username': nav.userName, 
						'nav-url': nav.url, 
						'nav-date': nav.date, 
						'response-date': new Date(response['timestamp']).toGMTString(), 
						'webpage-type': response['webpage-type'], 
						'characterize-research': response['characterize-research'], 
						'company-name': response['company-name']
					});
				});
			});

			json2csv({ data: csvData, fields: fields }, function(err, csv) {
				if (err) {
					console.log(err); 
					return; 
				}
				
				fs.writeFile(exportFilePath, csv, function(err) {
					if (err) {
						console.log("error exporting csv file in exportBrowsingDocsToCSV()"); 
					}
					
					res.download(exportFilePath); 
				});
			});
		}); 
};

var renderIndex = function(req, res, isResponse) {
	Navigation.getAllUsersNavigationCounts(isResponse)
		.then((countMap) => {
			res.render('index', {
				'sessions': config.get('sessions'), 
				'countMap': countMap, 
				'isResponse': isResponse
			})
		})
		.catch((err) => {
			console.log(err); 
			res.send('Error retrieving navigation counts'); 
		});
};

var renderUserNavigations = function(req, res, isResponse) {
	Navigation.getNavigationsByUserName(req.params.userName, isResponse)
		.then((navigations) => {
			res.render('user-navigations', {
				'userName': req.params.userName, 
				'navigations': navigations, 
				'isResponse': isResponse
			});
		});
};

var renderNavigation = function(req, res, isResponse) {
	Navigation.getNavigationById(req.params.trackId)
		.then((navObj) => {
			res.render('navigation', {
				'navObj': navObj, 
				'isResponse': isResponse, 
				'webpageTypes' : webpageTypes
			});
		})
		.catch((err) => {
			console.log('Error getting data'); 
			console.log(err); 
		});
};




module.exports = MainController; 