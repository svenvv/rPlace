var modhash = window.reddit.modhash;
var currentVersion = 9;
var drawingData = {
	startX:50,
	startY:0,
	kill:false,
	colors:[[5,5,5],[5,5,5]],
	newVersion: -1
};

var intervalId = -1;
var secondsLeft = -1;

var currentX = 0;
var currentY = 0;

function start(){
	updateGoal();
	setInterval(updateGoal(), 300 * 1e3);
	setTimeout(checkPixels(), 2000);
}

// retrieves target from server
function updateGoal() {
	const url = 'https://raw.githubusercontent.com/Sadye/rPlace/dev/data.json' + '?no-cache=' + (new Date).getTime();
	//TODO implement random selection of multiple files
	//better to be handled @ serer
	fetch(url)
	.then((resp) => resp.json())
	.then(function(data) {
		// update object that holds drawing data
		drawingData.startX = data.startX;
		drawingData.startY = data.startY;
		drawingData.colors = data.colors;
		if (currentVersion < data.newVersion) {
			// script needs updating
			document.body.innerHTML = '<center><br><br><h1>Je script is verouderd! Download alsjeblieft de nieuwe update (v' + data.newVersion + '). <br><br><br><br> <a href=https://raw.githubusercontent.com/Sadye/rPlace/master/script.js>Script</a> | <a href="https://discord.gg/EU4NhBn">Discord</a></h1></center>';
			return;
		}
		if (drawingData.kill && !data.kill) {
			// script was restarted after kill command
			setTimeout(checkPixels(), 2000);
		}
		drawingData.kill = data.kill;
		// pick a random x and y out of the drawing data
		currentY = Math.floor(Math.random() * drawingData.colors.length);
		currentX = Math.floor(Math.random() * drawingData.colors[currentY].length);
	})
	.catch(function(error) {
		console.log(error);
		console.log("Retrying: ");
		setTimeout(() => updateGoal(), 5000);
	});
}

function checkPixels() {
	// killswitch
	if (drawingData.kill) {
		console.log("Script is paused. Please standby...");
		return;
	}
	var tempX = currentX;
	var tempY = currentY;
	while (getTileAt(currentX + drawingData.startX, currentY + drawingData.startY) == drawingData.colors[currentY][currentX] || drawingData.colors[currentY][currentX] == -1) {
		currentX++;
		if (currentX > drawingData.colors[currentY].length - 1) {
			currentY += 1;
			currentX = 0;
		}
		if (currentY > drawingData.colors.length - 1) {
			currentY = 0;
		}

		if (tempX == currentX && tempY == currentY) {
			// we checked everything, no new tiles
			// try again in 10 seconds
			setTimeout( () => checkPixels(), 10);
			return;
		}
	}
	// remove info message interval
	window.clearInterval(intervalId);
	setTimeout( () => {
		// after a second, check a new pixel
		// automatically wrap around to the next line, or back to the start
		// if we go out of bounds
		if (currentX > drawingData.colors[currentY].length - 1) {
			currentY += 1;
			currentX = 0;
		}
		if (currentY > drawingData.colors.length - 1) {
			currentY = 0;
		}
		// ignore transparant pixels
		if (drawingData.colors[currentY][currentX] == -1) {
			currentX++;
			setTimeout( () => checkPixels(), 0);
			return;
		}
		var ax = currentX + drawingData.startX;
		var ay = currentY + drawingData.startY;
		console.log("Checking pixel at ("+ ax + ", " + ay +"). It should be color: " + getColorName(drawingData.colors[currentY][currentX]) + ". It currently is: " + getColorName(getTileAt(ax, ay)));

		// check for the correct pixels
		$.get("https://www.reddit.com/api/place/pixel.json?x=" + ax + "&y=" + ay)
		.then(res => {
			if (res.color == drawingData.colors[currentY][currentX]) {
	    		// color correct, so check the next pixel
	    		currentX++;
	    		setTimeout( () => checkPixels(), 0);
	    		return;
	    	} else {
	    		// color incorrect, so overwrite!
	    		setTimeout( () => drawPixel(), 0);
	    		return;
	    	}
	    }).fail(res => {
	    	// some error, try another in 10 seconds
	    	currentX++;
	    	setTimeout( () => checkPixels(), 10 * 1e3);
	    	return;
	    })
	}, 1000);
}

// draws a pixel
function drawPixel() {
	setTimeout( () => {
		// calculate correct x, y, color
		var ax = currentX + drawingData.startX;
		var ay = currentY + drawingData.startY;
		var newColor = drawingData.colors[currentY][currentX];
		// try to draw
		console.log("Pixel tekenen op locatie (" + ax + ", " + ay + ") Kleur: "+getColorName(newColor)+" (oud: "+getColorName(getTileAt(ax, ay)) +") (https://www.reddit.com/r/place/#x=" + ax + "&y=" + ay + ")");
		$.ajax({ url: "https://www.reddit.com/api/place/draw.json", type: "POST",
			headers: { "x-modhash": modhash }, data: { x: ax, y: ay, color: newColor }
		})
		.done( res => {
        	// drawing was succesfull
        	// so try again after cooldown
        	setTimeout(() => {
        		checkPixels()
        	}, res.wait_seconds * 1e3)
        	console.log("Succes! Nieuwe poging over " + res.wait_seconds + " seconden.");

        	// and show an info message so people know it's still working
        	secondsLeft = res.wait_seconds;
        	intervalId = setInterval( () => {
        		secondsLeft -= 10;
        		console.log("Nog " + secondsLeft + " seconden tot de volgende actie!");
        	}, 10 * 1e3)
        	return;
        })
		.error( res => {
        	// error, cooldown not passed probably
        	// give info message. If we received a cooldown error (status 429)
        	// use that value as the next action, else try again in ten seconds
        	setTimeout(() => {
        		checkPixels()
        	}, Math.max(Math.ceil(res.responseJSON.wait_seconds), 10) * 1e3);
        	console.log("Probleem! Nieuwe poging over " + Math.max(Math.ceil(res.responseJSON.wait_seconds), 10) + " seconden.");
        	
        	// and some info logging to the user
        	secondsLeft = Math.ceil(res.responseJSON.wait_seconds)
        	intervalId = setInterval( () => {
        		secondsLeft -= 10;
        		console.log("Nog " + secondsLeft + " seconden tot de volgende actie!");
        	}, 10 * 1e3)
        	return;
        });

	}, 500)
}

function getTileAt(x, y) {
	var colors = [
	{r: 255, g: 255, b: 255},
	{r: 228, g: 228, b: 228},
	{r: 136, g: 136, b: 136},
	{r: 34, g: 34, b: 34},
	{r: 255, g: 167, b: 209},
	{r: 229, g: 0, b: 0},
	{r: 229, g: 149, b: 0},
	{r: 160, g: 106, b: 66},
	{r: 229, g: 217, b: 0},
	{r: 148, g: 224, b: 68},
	{r: 2, g: 190, b: 1},
	{r: 0, g: 211, b: 221},
	{r: 0, g: 131, b: 199},
	{r: 0, g: 0, b: 234},
	{r: 207, g: 110, b: 228},
	{r: 130, g: 0, b: 128}
	];
	var data = document.getElementById("place-canvasse").getContext("2d").getImageData(x, y, 1, 1).data;
	return colors.findIndex(function(x) {return JSON.stringify(x) == JSON.stringify({r: data[0], g: data[1], b: data[2]});});
}

function getColorName(id) {
	if (id < 0 || id > 15) {
		return "???";
	}
	const colorScheme = [
		"wit",
		"lgrijs",
		"dgrijs",
		"zwart",
		"roze",
		"rood",
		"oranje",
		"bruin",
		"geel",
		"lgroen",
		"groen",
		"lblauw",
		"blauw",
		"dblauw",
		"magenta",
		"paars",
		"niets",
	];
	return colorScheme[id];
}

start();
