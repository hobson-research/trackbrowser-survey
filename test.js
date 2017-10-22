const path = require('path'); 
const fs = require('fs'); 
const config = require('config'); 
const url = require('url'); 


var screenshotPath = config.get('dataDirectory'); 

var screenshots = [
	"capture_Katy_20160207_1929.png",
	"capture_ventra_20160206_162821.png",
	"capture_ventra_20160206_162821.png", 
	"capture_Bubble_20160209_075902.png",
	"capture_karand2_20170125_211008.png",
	"capture_UIUCIB_20170123_181755.png"
];

var PNG = require('pngjs').PNG; 


var isValidScreenshot = function(fileName) {
	return new Promise(
		(resolve, reject) => {
			var filePath = path.join(screenshotPath, fileName);

			try {
				var data = fs.readFileSync(filePath); 
				var image = PNG.sync.read(data); 

				// console.log(image); 
				// console.log('width=' + image.width + ', height=' + image.height);

				if (image.width < 50 || image.height < 250) {
					resolve(false); 
					return; 
				}

				var topIndex = 130; 
				var bottomIndex = image.height - 100; 

				var leftIndex = 0; 
				var rightIndex = image.width - 25; 

				for (var i = leftIndex; i < rightIndex; i += 8) {
					for (var j = topIndex; j < bottomIndex; j += 8) {
						var pixelIndex = (image.width * j + i) << 2; 

						if (image.data[pixelIndex] != 255 || image.data[pixelIndex + 1] != 255 || image.data[pixelIndex + 2] != 255) {
							console.log('(x=' + i + ', y=' + j + ')'); 
							console.log(image.data[pixelIndex] + ', ' + image.data[pixelIndex + 1] + ', ' + image.data[pixelIndex + 2]);

							resolve(true); 
							return; 
						}
					}
				}

				resolve(false); 
			} catch(e) {
				console.log('exception'); 
				if (e.hasOwnProperty('code') && e.code == 'ENOENT') {
					console.log("File doesn't exist"); 
				}

				resolve(false); 
			}
		}
	);
};

/*

var fileName = 'hackbrowsercapture_jstl_20170302_225532.png'; 
console.log('checking file ' + fileName); 

isValidScreenshot(fileName)
	.then((result) => {
		console.log(fileName + ' check=' + result); 
	}); 
*/

/*
var checkScreenshots = async function(screenshotFileNames) {
	for (var i = 0; i < screenshotFileNames.length; i++) {
		var fileName = screenshotFileNames[i]; 

		console.log('fileName: ' + fileName); 

		var result = await isValidScreenshot(fileName); 
		console.log(fileName + ' check=' + result); 
	}
};

checkScreenshots(screenshots); 
*/

var excludeHostnames = []; 


var navObj = {
	url: "https://www.google.com/#q=seeking+alpha&*"
};

var isValidNavigation = function(navObj) {
	urlString = navObj.url; 

	if (urlString == null) {
		return false; 
	}

	var urlObj = url.parse(urlString); 

	console.log(urlObj)

	if (urlObj.hostname == null) {
		return false; 
	}

	else if (urlObj.hostname == 'www.google.com') {
		if (urlObj.hash == null && (urlObj.path == '/?gws_rd=ssl' || urlObj.path == '/')) {
			return false; 	
		}
	}

	else {
		for (var i = 0; i < excludeHostnames.length; i++) {
			if (urlObj.hostname.includes(excludeHostnames[i])) {
				return false; 
			}
		}
	}

	return true; 
};

console.log(isValidNavigation(navObj)); 