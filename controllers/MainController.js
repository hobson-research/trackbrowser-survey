const config = require('config'); 
const Navigation = require(__dirname + '/../models/Navigation');

var MainController = {}; 

MainController.getIndex = function(req, res) {
	Navigation.getAllUsersNavigationCounts()
		.then((countMap) => {
			res.render('index', {
				'sessions': config.get('sessions'), 
				'countMap': countMap
			})
		})
		.catch((err) => {
			console.log(err); 
			res.send('Error retrieving navigation counts'); 
		});


};

MainController.getUserNavigations = function(req, res) {
	console.log(req.params); 

	Navigation.getNavigationsByUserName(req.params.userName)
		.then((navigations) => {
			res.render('user-navigations', {
				'userName': req.params.userName, 
				'navigations': navigations
			});
		});
};

MainController.getNavigation = function(req, res) {
	Navigation.getNavigationInfoById(req.params.trackId)
		.then((navObj) => {
			res.render('navigation', {
				'navObj': navObj
			});
		})
		.catch((err) => {
			console.log('Error getting data'); 
			console.log(err); 
		});
};

MainController.postSurvey = function(req, res) {
	console.log(req.body); 

	if(req.body.next != '') {
		res.redirect('/navigation/' + req.body.next); 
	} else {
		res.send('End of survey'); 
	}
}; 


module.exports = MainController; 