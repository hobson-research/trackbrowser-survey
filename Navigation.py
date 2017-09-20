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

	# Return a single random navigation event
	@staticmethod
	def get_random_navigation(self):
		pass

	# Get screenshots associated with current navigation event
	def get_screenshots(self):
		pass

	# Find the next navigation event in the same tab
	def get_next_navigation(self):
		pass

	