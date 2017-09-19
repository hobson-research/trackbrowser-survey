from pymongo import MongoClient

list_users = ['Bubble', 'Dargude2', 'kakakyle0214 ', 'Katy', 'Lewyreus', 'Liangwenqian93 ', 'Locust', 'Naruto', 'Pommel9', 'rookie', 'ssshah10', 'tanvirotkar', 'ventra', 'zlow4', 'zsosa']

# MongoDB connection
client = MongoClient('localhost', 27017)
db = client.trackbrowser

# MongoDB aggregation query pipeline to randomly sample a navigation
pipeline = [
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
	for nav in db.browsing_data.aggregate(pipeline):
		randomNavigation = nav	
	
	
	# Based on the selected navigation, find the next navigation entry based on time
	nextNavigation = db.browsing_data.find_one({
		"userName": randomNavigation.get("userName"), 
		"type": "navigation", 
		"tabViewId": randomNavigation.get("tabViewId"), 
		"timestamp": {
			"$gt": randomNavigation.get("timestamp")
		}
	})

	# Find screenshot entries for the selected navigation event
	screenshots = db.browsing_data.find({
		"userName": randomNavigation.get("userName"), 
		"type": "screenshot", 
		"tabViewId": randomNavigation.get("tabViewId"), 
		"timestamp": {
			"$gt": randomNavigation.get("timestamp"), 
			"$lt": nextNavigation.get("timestamp")
		}
	})

	# Query screenshot
	print(randomNavigation)
	print(nextNavigation)

	# Screenshots
	print("Screenshot(s)")
	
	for screenshot in screenshots: 
		print(screenshot)

main()