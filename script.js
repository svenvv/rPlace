var drawingData = {
	startX: 0,
	startY: 0,
	colors: [["rood", "blauw", "wit", "niets"]],
	kill: false
};

var modhash = window.reddit.modhash;
var timeSinceLastRetrieval = 5000;
var index = 0;
var sec = 0;
var currentVersion = 4;

const colorScheme = {
	"wit": 0,
	"lgrijs": 1,
	"dgrijs": 2,
	"zwart": 3,
	"roze": 4,
	"rood": 5,
	"oranje": 6,
	"bruin": 7,
	"geel": 8,
	"lgroen": 9,
	"groen": 10,
	"lblauw": 11,
	"blauw": 12,
	"dblauw": 13,
	"magenta": 14,
	"paars": 15,
	"niets": -1,
};

function replaceTextWithNumbers(){
	for (var i = 0; i < drawingData.colors[0].length * drawingData.colors.length; i++) {
		var width = drawingData.colors[0].length;
		var height = drawingData.colors.length;
		var tempx = i % width;
		var tempy = Math.floor(i / width);
		console.log(width, height, tempx, tempy, drawingData.colors);
		for (key in colorScheme) {
			if (drawingData.colors[tempy][tempx] == key) {
				drawingData.colors[tempy][tempx] = colorScheme[key];
				break;
			}
		}
	}
}

function retrieveAndDraw(doDraw) {

	if (timeSinceLastRetrieval > 360) {
		// retrieve data
		const url = 'https://placenl.basvdwollenberg.nl/data.json';

		//TODO implement random selection of multiple files
		//better to be handled @ serer

		fetch(url)
		.then((resp) => resp.json())
		.then(function(data) {
			drawingData.startX = data.startX;
			drawingData.starty = data.startY;
			drawingData.colors = data.colors;

			if (currentVersion < data.newVersion) {
				document.write('Je script is verouderd! Please update! <br> <a href="https://discord.gg/EU4NhBn">Discord</a> <a href=http://placenl.zeeuwse.cloud/script.js>Script</a>');
			}

			index = Math.floor(Math.random() * (drawingData.colors[0].length * drawingData.colors.length));
			timeSinceLastRetrieval = 0;
			replaceTextWithNumbers();

			if (doDraw) draw(0);
		})
		.catch(function(error) {
			console.log(error)
			setTimeout(() => retrieveAndDraw(doDraw), 10 * 1e3);
		});
	}  else {
		if (doDraw) draw(0);
	}
}

function draw(seconds) {
	if (drawingData.kill) {
		setTimeout(() => retrieveAndDraw(true), 360 * 1e3);
		return;
	}
	//retrieveAndDraw(false);
	var width = drawingData.colors[0].length;
	var height = drawingData.colors.length;
	index++;
	console.log(width, height, index);
    index = index % (width * height);
    sec = seconds = Math.ceil(seconds)
    setTimeout(() => {
        const x = index % width;
        const y = Math.floor(index / width);
        // vanaf nu kan een flagcolor -1 zijn, dan wordt die kleur als altijd correct gezien

        const flagColor = drawingData.colors[y][x];
        if (flagColor == -1) {
        	return draw(0);
        }
        // const xChange = flagColor != drawingData.colors[y][x - 1] || flagColor != drawingData.colors[y][x + 1];
        // const yChange = (drawingData.colors[y - 1] && flagColor != drawingData.colors[y - 1][x]) || (drawingData.colors[y + 1] && flagColor != drawingData.colors[y + 1][x]);
        // if  (!xChange && !yChange) {
        //     return draw(0);
        // }
        const ax = x + drawingData.startX;
        const ay = y + drawingData.startY;

        $.get("https://www.reddit.com/api/place/pixel.json?x=" + ax + "&y=" + ay)
        .then(res => {
        	console.log(res);
            if (res.color == flagColor) {
                console.log("Skipping " + (ax + ", " + ay) + " because it's already correct");
                return draw(1);
            }
            console.log("Drawing at " + ax + ", " + ay + " (https://www.reddit.com/r/place/#x=" + ax + "&y=" + ay + ")");
            $.ajax({ url: "https://www.reddit.com/api/place/draw.json", type: "POST",
                headers: { "x-modhash": modhash }, data: { x: ax, y: ay, color: flagColor }
            })
            .done(data => {
            	//data=json.parse(data);
            	draw(data.wait_seconds);
            	console.log(data);
            	return;
            })
            .error(data => {
            	//data = JSON.parse(data);
            	draw(data.responseJSON.wait_seconds);
            	return;
            });
        });
    }, seconds * 1000);
}

replaceTextWithNumbers();
retrieveAndDraw(true);
window.setInterval(() => console.log("Drawing in " + (sec--) + " seconds. Retrieval " + (timeSinceLastRetrieval < 0 ? "after next drawing. " : "in " + (360-timeSinceLastRetrieval++) + " seconds!")), 1e3);
