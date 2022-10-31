const mif = 10;
let gravityPower = 0.2;
let massLoss = 0.9;
let PAUSE;
let SELECTmode;

let largestPlanetDiameter;

let cam;
let planets;

function setup() { 
 	let canvas = createCanvas(displayWidth*0.8, displayHeight*0.8);
	canvas.parent("#CanvasDiv");
	select("#tool type").changed(swapTools);
	swapTools();

	SELECTmode = false;

	cam = new CAMERA();

	//datasheet
	setInterval(displayData, 2000)

	//pause
	select("#pauseBTN").mousePressed( function(){ PAUSE=true; } );
	select("#playBTN").mousePressed( function(){ PAUSE=false; } );

	//index input
	select("#IndexInput").input( updatePlanetSliders );
	//select button
	select("#SelectPlanetButton").mousePressed( function(){
		SELECTmode = true;
		cursor(CROSS);
	});

	//ARM tools
	select("#removeBTN").mousePressed( function(){ 
		let ind = Number( select("#IndexInput").value() );
		if( !isValidIndex(ind) ){
			return;
		}
		planets.splice(ind,1);
	});
	select("#modifyBTN").mousePressed( function(){ 
		let ind = Number( select("#IndexInput").value() );
		if( !isValidIndex(ind) ){
			return;
		}
		let angle =  toRadians( select("#ARMangle").value() );
		let power = select("#ARMmagnitude").value();

		planets[ind].r = floor( select("#ARMradius").value() );
		planets[ind].vel.set(-sin(angle)*power,cos(angle)*power);
	});
	canvas.mousePressed( function(){
		if(!SELECTmode){
			if( select("#tool type").value() != "arm" ){ return; }

			let angle = toRadians( select("#ARMangle").value() );
			let power = select("#ARMmagnitude").value();
			let R = floor( select("#ARMradius").value() );
	
			let x = (mouseX-width*0.5)/cam.scale;
			let y = (mouseY-height*0.5)/cam.scale;
	
			planet = new Planet(x,y, -sin(angle)*power,cos(angle)*power, R)
			planets.push(planet);
		}else{
			SELECTmode = false;
			if( select("#tool type").value() == "arm" ){ cursor(HAND); }
			else{ cursor(MOVE); }
		
			let mousePos = createVector( (mouseX-width*0.5)/cam.scale, (mouseY-height*0.5)/cam.scale );
			
			let closestId = null;
			let closestDist = null;
			for(let i=0; i < planets.length; i++){
				p = planets[i];
				let dist = mousePos.dist(p.pos);

				if( dist > p.r + 5/cam.scale ){ continue; }
				if( closestDist == null || dist < closestDist ){
					closestDist = dist;
					closestId = i;
				}
			}
			
			if(closestId != null){
				select("#IndexInput").value(closestId);
				updatePlanetSliders();
			}
		}
	});
	select("#refreshBTN").mousePressed( updatePlanetSliders );

	//clear scene button
	select("#ClearSceneBTN").mousePressed( function(){
		if( !confirm("Are you sure you want to delete all planets?") ) return;
		planets = [];
	});

	//create initial planets
	planets = [];
	for(let i=0; i < 50; i++){
		planet = new Planet(random(width),random(height),random(-mif,mif),random(-mif,mif),random(10)+3)
		planets.push(planet);
	}

	windowResized();
} 

function draw() {
	let hMode = select("#HAC").checked();
	let sPi = select("#SAOIC").checked();

	let gravityPower = select("#GPS").value();
	let numCycles = select("#TMS").value();
	massLoss = select("#IMLS").value();

	
	//physics
	if(!PAUSE){
		for(let cycle=0; cycle < numCycles; cycle++){
	
			for(let i=0; i < planets.length; i++){
				planets[i].update();
			}
	
			for(let i=0; i < planets.length; i++){
				pl1 = planets[i];
				for(let j=i+1; j < planets.length; j++){
					pl1.gravitate(planets[j]);
				}
			}	

			for(let i=planets.length-1; i > -1; i--){
				if(planets[i].toDelete){
					planets.splice(i,1);
					ind = select("#IndexInput").value();
					if(ind > i){
						select("#IndexInput").value(ind-1);
					}
				}
			}
		}
	}

	//largest planet calculations
	let biggestId = 0;
	let center = createVector(0,0);

	for(let i=0; i < planets.length; i++){
		center.add(planets[i].pos);
		if(planets[biggestId].r < planets[i].r){
			biggestId = i;
		}
	}

	//camera:
	if(planets.length > 0){
		switch( select("#CamFocusType").value() ){
			case "xl":
				cam.pos = planets[biggestId].pos.copy();
				break;
			case "cent":
				center.div(planets.length);
				cam.pos = center;
				break;
			case "index":
				let ind = Number( select("#IndexInput").value() );
				if( !isValidIndex(ind) ){
					select("#IndexInput").value( 0 );
				}else{
					cam.pos = planets[ind].pos.copy();
				}
				break;
		}
	}

	//some data sheet numbers:
	if(planets.length > 0){
		largestPlanetDiameter = planets[biggestId].r * 2; 
	}


	//drawing
	cam.applyToScene();
	background(0);
	noStroke();
	fill(255);

	for(let i=0; i < planets.length; i++){
		planets[i].pos.sub(cam.pos);
		planets[i].draw();
	}
	if(sPi){
		textSize(15/cam.scale);
		textAlign(CENTER);

		for(let i=0; i < planets.length; i++){
			planets[i].showText(i);
		}
	}
	if(hMode){
		rectMode(CENTER);
		noFill();
		strokeWeight(3/cam.scale);
		stroke(0,255,0);

		for(let i=0; i < planets.length; i++){
			planets[i].highlight();
		}
	}

	//highlight selected planet
	if( planets.length > 0 && select("#SSPC").checked() ){
		let ind = select("#IndexInput").value();

		if( !isValidIndex(ind) ){
			select("#IndexInput").value(0);
		}else{
			rectMode(CENTER);
			noFill();
			strokeWeight(3/cam.scale);
			stroke(255,0,0);

			planets[ ind ].highlight();
		}
	}
	
	cam.pos.set(0,0);
}


//events
function windowResized(){
	resizeCanvas(windowWidth*0.65, windowHeight - 50);
}
function mouseDragged(){
	if(mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height && select("#tool type").value() != "arm"){
		cam.move();
	}
}
function mouseWheel(event){
	if(mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height){
		cam.scale += event.delta*0.0005;
	}
}

//swaping tools
function swapTools(){
	switch( select("#tool type").value() ){
		case "cam":
			cursor(MOVE);

			select("#camera tools").show();
			select("#physics tools").hide();
			select("#ARM tools").hide();
			select("#LS tools").hide();
			break;
		case "phy":
			cursor(MOVE);

			select("#camera tools").hide();
			select("#physics tools").show();
			select("#ARM tools").hide();
			select("#LS tools").hide();
			break;
		case "arm":
			cursor(HAND);

			select("#camera tools").hide();
			select("#physics tools").hide();
			select("#ARM tools").show();
			select("#LS tools").hide();
			break;
		case "ls":
			cursor(HAND);

			select("#camera tools").hide();
			select("#physics tools").hide();
			select("#ARM tools").hide();
			select("#LS tools").show();
			break;
	}
}

function isValidIndex(ind){
	if(ind.length == 0 || planets.length == 0){ 
		return(false); 
	}
	else{
		try{
			let test = planets[ind].pos.copy();
			return(true);
		}
		catch(err){
			alert("OH NO! It seems that you have entered an invalid index. It must be a whole number and it shall be in planets list range.");
			return(false);
		}
	}
}

function updatePlanetSliders(){
	let ind = Number( select("#IndexInput").value() );
	if( !isValidIndex(ind) ){
		select("#IndexInput").value(0);
		return;
	}
	let p = planets[ind];
	
	select("#ARMangle").value( floor( map(p.vel.heading(), -PI,PI, -180, 180)+90 ) );
	select("#ARMmagnitude").value( round( p.vel.mag() ) );
	select("#ARMradius").value( p.r );
}

function toRadians(deegrees){
	return( map(deegrees, -180, 180, 0,TWO_PI) );
}


//displaying data
function displayData(){
	let content = "";
	content += "number of planets: " + planets.length;
	content += "<br>largest planets diameter: " + largestPlanetDiameter + "000 km";
	content += "<br>time multiplicator: " + select("#TMS").value();
	content += "<br>gravity power: " + select("#GPS").value();

	select("#DataSheet").html(content);
}


//classes
class Planet{
	constructor(x,y,fx=0,fy=0,r=2){
		this.pos = createVector(x,y);
		this.vel = createVector(fx,fy);
		
		this.r = floor(r);
		this.mass = 1;

		this.toDelete = false;
	}

	update(){
		this.pos.add(this.vel);
	}

	edges(){
		if(this.pos.x+this.r < 0){this.pos.x = width+this.r;}
		if(this.pos.y+this.r < 0){this.pos.y = height+this.r;}
		if(this.pos.x-this.r > width){this.pos.x = -this.r;}
		if(this.pos.y-this.r > height){this.pos.y = -this.r;}
	}

	gravitate(planet){
		let d = planet.pos.copy();
		d.sub(this.pos);
		let dist = planet.pos.dist(this.pos);
		
		let dir = d.copy();
		dir.setMag(1);

		let power = gravityPower/dist;

		if(dist < (this.r + planet.r)*0.5 ){
			this.merge(planet);
		}else{
		
			let acc1 = dir.copy();
			acc1.mult(planet.r*planet.mass*power);
			let acc2 = dir.copy();
			acc2.mult(this.r*this.mass*-power);

			this.addVel(acc1);
			planet.addVel(acc2);

		}
	}

	merge(planet){
		if(planet.r > this.r){
			planet.grow(this);
		}else{
			this.grow(planet);
		}
	}

	grow(planet){
		let f1 = this.vel.copy();
		f1.mult(this.r*this.mass);
		
		let f2 = planet.vel.copy();
		f2.mult(planet.r*planet.mass);

		this.r += planet.r * massLoss;
		this.r = floor(this.r);
		planet.toDelete = true;

		f1.add(f2);
		f1.div(this.r*this.mass);

		this.vel = f1;
	}
	
	addVel(vel){
		this.vel.add(vel);
	}

	draw(){
		ellipse(this.pos.x,this.pos.y,this.r);
	}

	highlight(){
		rect(this.pos.x, this.pos.y, this.r+50, this.r+50);
	}
	
	showText(txt){
		text(txt,this.pos.x,this.pos.y+this.r*0.5+60);
	}
}

class CAMERA{
	constructor(){
		this.pos = createVector(0,0);
		this.scale = 1;
	}
	
	applyToScene(){
		translate(width/2,height/2);
		scale(this.scale, this.scale);
		if(this.scale<0){this.scale = 0;}
	}

	move(){
		this.pos.x -= (mouseX - pmouseX)/this.scale;
		this.pos.y -= (mouseY - pmouseY)/this.scale;
	}
}










