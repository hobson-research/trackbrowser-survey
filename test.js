const express = require('express');
const MongoClient = require('mongodb').MongoClient; 
const ObjectId = require('mongodb').ObjectId; 

const url = 'mongodb://localhost:27017/trackbrowser'; 

var app = express(); 
var http = require('http').Server(app); 

var list_users = ['Bubble', 'Dargude2', 'kakakyle0214 ', 'Katy', 'Lewyreus', 'Liangwenqian93 ', 'Locust', 'Naruto', 'Pommel9', 'rookie', 'ssshah10', 'tanvirotkar', 'ventra', 'zlow4', 'zsosa']

var db = null; 

MongoClient.connect(url)
	.then((dbInstance) => {
		db = dbInstance; 

		return; 
	})
	.then(() => {
		return db.collection('browsing_data').find({
			tabViewId: 'wv-6', 
			url: 'http://investors.amcnetworks.com/releasedetail.cfm?ReleaseID=959070', 
			userName: 'Bubble'
		}).toArray();
	})
	.then((navs) => {
		console.log(navs); 
	})
	.catch((err) => {
		console.log('err'); 
		console.log(err); 
	});