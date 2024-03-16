const ratio50m = 10, ratio10m = 50, ratio1m = 150;
let world101m;
let box5m, tab_colors, world, world110m, world50, world10m, world5m, text_countries; 
const p = "data/";
const colors = ["#452525", "#4E2F2F", "#573939", "#604343", "#694D4D", "#725757", "#7B6161", "#846B6B", "#8D7575", "#967F7F", "#9F8989", "#A89393", "#B19D9D", "#BAa7a7"];
function loadGeoJSON(url, fallbackUrl) {
    return d3.json(url).catch(() => d3.json(fallbackUrl));
}
Promise.all([
    d3.json(p+"box-5m.json").then(d => box5m = d),
    d3.json(p+"text_countries.json").then(d => text_countries = d),
    d3.json(p+"colors_countries.json").then(d => tab_colors = d),
    loadGeoJSON(p+"world-110m.geojson.gz", p+"world-110m.geojson").then(d => world110m = d),
    loadGeoJSON(p+"world-50m.geojson.gz", p+"world-50m.geojson").then(d => world50m = d),
    loadGeoJSON(p+"world-10m.geojson.gz", p+"world-10m.geojson").then(d => world10m = d),
    loadGeoJSON(p+"world-5m.geojson.gz", p+"world-5m.geojson").then(d => world5m = d)
]).then(() => {
    redraw(); // Appeler `redraw` une seule fois après le chargement de tous les fichiers
}).catch(error => {
    console.error("Erreur lors du chargement des fichiers", error);
});

function isCounterClockwise(polygon) {
    // Calcule l'aire signée du polygone
    let area = d3.polygonArea(polygon);
    // Retourne true si l'aire est négative (sens trigonométrique)
    return area < 0;
}
function geometryBox(geometry) {
    const bounds = d3.geoBounds(geometry);
    const topLeft = [bounds[0][0], bounds[1][1]];
    const topRight = [bounds[1][0], bounds[1][1]];
    const bottomLeft = [bounds[0][0], bounds[0][1]];
    const bottomRight = [bounds[1][0], bounds[0][1]];

    return [topLeft, topRight, bottomRight, bottomLeft];
}
const width = window.innerWidth * 1;
const height = window.innerHeight * 1;

let canvas = d3.select("#map")
				 .attr("width", width)
				 .attr("height", height)
				 .node();
const context = canvas.getContext("2d");
const projection = d3.geoMercator()
					 .scale(100)
					 .translate([width / 2, height / 2])
					 .rotate([0, 0]);
const path = d3.geoPath(projection, context);
const stw = 0.8;
let zoomState = d3.zoomIdentity;
const zoom = d3.zoom()
				.scaleExtent([1, 200000])
				.on('zoom', zoomed);
d3.select(canvas).call(zoom)
	.on("mousedown.zoom",null)
	.on("mouseup.zoom",null)
	.on("mousemove.zoom",null)
	.on("dblclick.zoom", null);
	
	
const drag = d3.drag() .on('drag', dragged);
d3.select(canvas).call(drag);
function dragged(event){
	requestAnimationFrame(() => {
		zoomState.x += event.dx;
		zoomState.y += event.dy;
		redraw();
	});
}
function zoomed(event) {
    const newK = event.transform.k;
    if (event.sourceEvent && newK !== zoomState.k) {
        const mousePoint = [
            event.sourceEvent.clientX - canvas.getBoundingClientRect().left,
            event.sourceEvent.clientY - canvas.getBoundingClientRect().top
        ];
        interpolateZoomScale(zoomState.k, newK, mousePoint);
    }
}
function interpolateZoomScale(fromK, toK, mousePoint) { 
	const duration = 150; // Durée de l'animation en ms
    const startTime = Date.now(); // Temps de début de l'animation
    (function animateZoom() {
        const now = Date.now();
        const time = Math.min(1, ((now - startTime) / duration));
        const currentK = d3.interpolate(fromK, toK)(time);
        const mouseCanvasX = (mousePoint[0] - zoomState.x) / zoomState.k;
        const mouseCanvasY = (mousePoint[1] - zoomState.y) / zoomState.k;
        const newMouseCanvasX = mouseCanvasX * currentK;
        const newMouseCanvasY = mouseCanvasY * currentK;
        const translateChangeX = mousePoint[0] - newMouseCanvasX;
        const translateChangeY = mousePoint[1] - newMouseCanvasY;
        zoomState.k = currentK;
		zoomState.x = translateChangeX;
		zoomState.y = translateChangeY;
        redraw();
        if (time < 1) {
            requestAnimationFrame(animateZoom);
        }
    })();
}
function applyZoom() {
	context.translate(zoomState.x, zoomState.y);
	context.scale(zoomState.k, zoomState.k);
}
function isVisible(box,vox){
	if(isAnyPointInsideBox(box,vox)){
		return true;
	}else{
		if(isAnyPointInsideBox(vox,box)){
			return true;
		}else{
			if(isVisibleLong(box,vox)){
				return true;
			}else{
				return false;
			}
		}
	}
}
function redraw(){
	context.clearRect(0, 0, width, height);
    context.save();
	applyZoom();
	var adjustedScale = Math.pow(zoomState.k, 1/1.3);
	var newStrokeWidth = Math.max(stw / adjustedScale, 0.0000015);
	var vhq = false;
	var vox = isBoundingBoxVisibleAfterZoom(projection, zoomState, width, height)
	world = zoomState.k > ratio10m ? world10m : (zoomState.k > ratio50m ? world50m : world110m);
	if(zoomState.k > ratio1m){
		vhq = true;
	}
	let minFontSize = 0;
	if(zoomState.k < 1.3){ minFontSize = 70; }
	if(zoomState.k < 2){ minFontSize = 50; }
	if(zoomState.k < 3){ minFontSize = 40; }
	if(zoomState.k < 4){ minFontSize = 30; }
	if(vhq){
		var vhq_tab = [];
		var vhq_tab_color = [];
		var i = 0;
		box5m.forEach(function(v,k){
			
			var box = v.box;
			if (!vhq_tab.includes(v.a3)){
				if(isVisible(box,vox)){
					vhq_tab[i] = v.a3;
					if(tab_colors[v.a3_color]){
						vhq_tab_color[i] = tab_colors[v.a3_color]['color7'];
					}else{
						vhq_tab_color[i] = "#ffffff";
					}
					i++;
				}
			}
		});
		for(var i = 0; i < vhq_tab.length; i++){
			if(world5m[vhq_tab[i]]){
				if(vhq_tab[i].includes("Z0")){
					var co = "#000"
				}else{
					var co = colors[vhq_tab_color[i]]
				}
				world5m[vhq_tab[i]].forEach(function(v,k){
					var box = v.properties.box;
					if(isVisible(box,vox)){
						context.beginPath();
						context.fillStyle = co;
						context.lineWidth = newStrokeWidth;
						path(v);
						context.fill();
						context.strokeStyle = 'white';
						context.stroke();
					}					
				});
			}
		}
	}else{
		world.features.forEach(function(v,k){
			var box = v.properties.box;
			if(zoomState.k < 3 || isVisible(box,vox)){
				if(tab_colors[v.properties.ADM0_A3]){
					var co = colors[tab_colors[v.properties.ADM0_A3]['color7']] ;
				}else{
					var co = "#654545";
				}
				var st = newStrokeWidth;
				context.beginPath();
				context.fillStyle = co;
				context.lineWidth = st;
				path(v);
				context.fill();
				context.strokeStyle = 'white';
				context.stroke();
			}
		});	
	}
	text_countries.forEach(function(v,k){
		var fontSize = v.size;
		if(fontSize > minFontSize){
			if(isAnyPointInsideBox([[v.lng,v.lat]],vox)){
				var coord = projection([v.lng,v.lat]);
				context.font = '600 ' + fontSize + 'px Arial';
				context.scale(0.1, 0.1);
				context.textAlign = 'center'; 
				context.textBaseline = 'middle';
				context.fillStyle = 'white';
				context.fillText(v.name, (coord[0]/0.1), (coord[1]/0.1));
				context.scale(1/0.1, 1/0.1);
			}
		}
	});
	
	context.restore();	
}
function intersects(bbox, viewBounds) {
    if (bbox[2] < viewBounds[0][0] || viewBounds[1][0] < bbox[0]) {
        return false;
    }
    if (bbox[3] < viewBounds[0][1] || viewBounds[1][1] < bbox[1]) {
        return false;
    }
    return true;
}
function applyTransformToPoint(point, transform) {
    return [(point[0] - transform.x) / transform.k, (point[1] - transform.y) / transform.k];
}
function isBoundingBoxVisibleAfterZoom(projection, transform, canvasWidth, canvasHeight) {
    const topLeft = projection.invert(applyTransformToPoint([0, 0], transform));
    const bottomRight = projection.invert(applyTransformToPoint([canvasWidth, canvasHeight], transform));
    const viewBounds = [topLeft, bottomRight];
    
	var left  = getTransformedPixelCoordinates(projection, [-180,0], transform);
	var right = getTransformedPixelCoordinates(projection, [180,0], transform);
	if(left[0] > 0){
		viewBounds[0][0] = -180;
	}
	if(right[0] < canvasWidth){
		viewBounds[1][0] = 180;
	}
	var vox = [];
	vox[0] = viewBounds[0]
	vox[1] = [];
	vox[1][0] = viewBounds[1][0];
	vox[1][1] = viewBounds[0][1];
	vox[2] = viewBounds[1];
	vox[3] = [];
	vox[3][0] = viewBounds[0][0];
	vox[3][1] = viewBounds[1][1];
	
	return vox;
}
function applyTransformation(point, transform) {
    return [(point[0] * transform.k + transform.x), (point[1] * transform.k + transform.y)];
}
function getTransformedPixelCoordinates(projection, coordinates, transform) {
    var pixelCoords = projection(coordinates);
    return applyTransformation(pixelCoords, transform);
}
function isPointInsideBox(point, box) {
    const [x, y] = point;
    const [[xMin, yMax], [xMax]] = [box[0], box[2]]; // En assumant que box[0] est top-left et box[2] est bottom-right
    return x >= xMin && x <= xMax && y <= yMax && y >= yMax - (yMax - box[3][1]);
}
function isAnyPointInsideBox(points, box) {
    return points.some(point => isPointInsideBox(point, box));
}
function isVisibleLong(box,vox){
	if(
		box[0][0] > vox[0][0] &&
		box[0][0] < vox[1][0] &&
		box[1][0] > vox[0][0] &&
		box[1][0] < vox[1][0] &&
		box[0][1] > vox[0][1] &&
		box[3][1] < vox[3][1] 
	){
		return true;
	}
	else if(
		box[0][1] < vox[0][1] &&
		box[0][1] > vox[2][1] &&
		box[2][1] < vox[0][1] &&
		box[2][1] > vox[2][1] &&
		box[0][0] < vox[0][0] &&
		box[1][0] > vox[1][0] 
	){
		return true;
	}
	else{
		return false;
	}
}