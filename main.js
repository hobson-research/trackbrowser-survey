const express = require('express');
const bodyParser = require('body-parser')
const config = require('config'); 
const pug = require('pug'); 
const MainController = require(__dirname + '/controllers/MainController');

// express server init
var app = express(); 
var http = require('http').Server(app); 
http.listen(8088, function() {
	console.log("Listening to port 8088"); 
});

// view engine
app.set('view engine', 'pug');
app.locals.pretty = true;

// set static assets
app.use(express.static('public'));
app.use('/screenshot', express.static(config.get('dataDirectory')));

// body parser
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())


app.get('/', MainController.getIndex);
app.get('/navigations/user/:userName', MainController.getUserNavigations); 
app.get('/navigation/:trackId', MainController.getNavigation);

app.get('/response', MainController.getResponseIndex); 
app.get('/response/navigations/user/:userName', MainController.getUserNavigationResponse); 
app.get('/response/navigation/:trackId', MainController.getNavigationResponse); 
app.get('/response/export', MainController.exportResponsesToCSV);  

app.post('/navigation/:trackId', MainController.postSurvey); 