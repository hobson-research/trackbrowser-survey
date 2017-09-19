class Navigation:
	"""A navigation event of a user. A navigation event has the following properties

	Attributes: 
		userName: A string of user
		url: A string of navigated URL
		timestamp: A datetime of navigation event
	"""
	

	def __init__(self, navigationObject, tra):
		self.userName = navigationObject.userName
		self.url = navigationObject.url; 
		self.timestamp = navigationObject.timestamp

	def get_screenshots(self):
		pass

	def get_next_navigation(self):
		pass

	