from pymongo import MongoClient
from flask import Flask

app = Flask(__name__)

list_users = ['Bubble', 'Dargude2', 'kakakyle0214 ', 'Katy', 'Lewyreus', 'Liangwenqian93 ', 'Locust', 'Naruto', 'Pommel9', 'rookie', 'ssshah10', 'tanvirotkar', 'ventra', 'zlow4', 'zsosa']

# MongoDB connection
DB_CLIENT = MongoClient('localhost', 27017)
DB = DB_CLIENT.trackbrowser

# MongoDB aggregation query pipeline to randomly sample a navigation
RANDOM_NAV_PIPELINE = [
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
]

def main():

	# Randomly select a navigation entry
	# MongoDB's aggregate query is used
	for nav in DB.browsing_data.aggregate(RANDOM_NAV_PIPELINE):
		random_navigation = nav	
	
	
	# Based on the selected navigation, find the next navigation entry based on time
	next_navigation = DB.browsing_data.find_one({
		"userName": random_navigation.get("userName"), 
		"type": "navigation", 
		"tabViewId": random_navigation.get("tabViewId"), 
		"timestamp": {
			"$gt": random_navigation.get("timestamp")
		}
	})

	# Find screenshot entries for the selected navigation event
	screenshots = DB.browsing_data.find({
		"userName": random_navigation.get("userName"), 
		"type": "screenshot", 
		"tabViewId": random_navigation.get("tabViewId"), 
		"timestamp": {
			"$gt": random_navigation.get("timestamp"), 
			"$lt": next_navigation.get("timestamp")
		}
	})

	if screenshots.count is 1: 
		print("Only 1 screenshot")
		

	# Query screenshot
	print(random_navigation)
	print(next_navigation)

	# Screenshots
	print(screenshots.count(), "screenshot(s)")
	
	for screenshot in screenshots: 
		print(screenshot)

main()
