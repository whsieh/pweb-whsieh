
window.requestAnimationFrame = window.requestAnimationFrame ||
	window.mozRequestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.msRequestAnimationFrame;

// Bind some common math operators for convenience
var PI = Math.PI, round = Math.round,
abs = Math.abs, sqrt = Math.sqrt,
pow = Math.pow, max = Math.max,
min = Math.min, sin = Math.sin,
cos = Math.cos, floor = Math.floor,
tan = Math.tan, atan2 = Math.atan2,
random = Math.random

// Initialize canvas and 2D context vars
var canv = document.getElementById('main')
canv.width = $(window).width()
canv.height = $(window).height()
var cwidth = canv.width
var cheight = canv.height
var ctx = canv.getContext('2d')
var FPS = 60
var TIMESTEPMS = 1000/FPS

// Initialize variables to track the view window location
var viewOffset = P(0,0)
var viewOffsetVel = P(0,0)
var viewOffsetAcc = P(0,0)
var viewSpan = P(canv.width,canv.height)

// Initialize vertex outlines (rings)
var ring0 = new Image()
ring0.src = 'graph/drawn0.png'
var ring1 = new Image()
ring1.src = 'graph/drawn1.png'
var ring2 = new Image()
ring2.src = 'graph/drawn2.png'
var ring3 = new Image()
ring3.src = 'graph/drawn3.png'
var ring4 = new Image()
ring4.src = 'graph/drawn4.png'
// Store ring graphics
var rings = [ring0,ring1,ring2,ring3,ring4]
// Initialize edge ending graphic 
var brush = new Image()
brush.src = 'graph/brush_end_thin.png'
var dot = new Image()
dot.src = 'graph/dot.png'
// Initialize all sketched vertex graphics
var me = new Image()
me.src = 'icons/me.png'
var projects = new Image()
projects.src = 'icons/projects.png'
var about = new Image()
about.src = 'icons/about.png'
var contact = new Image()
contact.src = 'icons/contact.png'
var resume = new Image()
resume.src = 'icons/resume.png'
var dygraph = new Image()
dygraph.src = 'icons/dygraph.png'
var gomoku = new Image()
gomoku.src = 'icons/gomoku.png'
var pweb = new Image()
pweb.src = 'icons/pweb.png'
var qwop = new Image()
qwop.src = 'icons/qwop.png'
var gmail = new Image()
gmail.src = 'icons/gmail.png'
var linkedin = new Image()
linkedin.src = 'icons/linkedin.png'
var github = new Image()
github.src = 'icons/github.png'
// Store vertex graphics
var icons = {
	'me':me,
	'projects':projects,
	'about':about,
	'contact':contact,
	'resume':resume,
	'dygraph':dygraph,
	'gomoku':gomoku,
	'pweb':pweb,
	'qwop':qwop,
	'gmail':gmail,
	'linkedin':linkedin,
	'github':github
}
// Store vertex labels
var labels = {
	'me':['Wenson','48px joecasual'],
	'projects':['Projects','40px joecasual'],
	'about':['About','40px joecasual'],
	'contact':['Contact','40px joecasual'],
	'resume':['Resume','40px joecasual'],
	'dygraph':['DyGraph','28px joecasual'],
	'gomoku':['Gomoku AI','28px joecasual'],
	'pweb':['Personal Website','28px joecasual'],
	'qwop':['Q(wop)','28px joecasual'],
	'gmail':['Gmail','28px joecasual'],
	'github':['Github','28px joecasual'],
	'linkedin':['LinkedIn','28px joecasual']
}

var projectNames = {'dygraph':true,'qwop':true,'gomoku':true,'pweb':true}
var contactNames = {'gmail':true,'linkedin':true,'github':true}
// Maps a div ID to whether the corresponding info panel is showing
var panels = {'#about':false,'#gomoku':false,'#dygraph':false,
			'#qwop':false,'#pweb':false}

var curPanel = null

// Initialize miscellaneous variables
var VERTEX_RADIUS = 32
var REPULSION = 200000
var ATTRACTION = 0.015
var EQUILIBRIUM = 25
var DRAG = 0.9
var minX=cwidth/2,minY=cheight/2,
	maxX=cwidth/2,maxY=cheight/2
var initialized = false
var mousePos = P(cwidth/2,cheight/2)
var prevMousePos = P(cwidth/2,cheight/2)
var prevMouseVel = P(0,0)
var mouseVel = P(0,0)
var mouseAcc = P(0,0)
var canvRect = canv.getClientRects()[0]
var ctop = canvRect.top,
	cleft = canvRect.left
var cWHRatio = cwidth/cheight

var IDLE = 0
var HIGHLIGHTED = 1
var selVtxIndex = -1
var mouseoverActive = true
var framecount = 0

var doScroll = false
var clearAll = false

var projExpand = false
var projExpandLock = false

var contExpand = false
var contExpandLock = false

var scrollMessage = null

/* PERSONAL WEBSITE-SPECIFIC */

function FlashingMessage(text,font,x,y,freq,maxt,oncomplete) {
	this.x = x
	this.y = y
	this.t = 0
	this.maxt = maxt
	this.fade = function(t) {
		return (1-cos(freq*t))/2
	}
	this.text = text
	this.font = font
	var oldFont = ctx.font
	ctx.font = font
	this.textwidth = ctx.measureText(text).width
	ctx.font = oldFont
	this.finished = false
	this.oncomplete = oncomplete
}

FlashingMessage.prototype.clear = function() {
	if (!this.finished) {
		ctx.clearRect(this.x-10,this.y-50,this.textwidth+20,100)
	}
}

FlashingMessage.prototype.draw = function() {
	if (!this.finished && this.t < this.maxt) {
		var oldAlpha = ctx.globalAlpha
		ctx.globalAlpha = this.fade(this.t)
		this.t++
		drawText(this.text,this.x,this.y,this.font)
		ctx.globalAlpha = oldAlpha
	} else {
		this.oncomplete()
		this.finished = true
	}
}

function hideInfoPanels() {
	for (id in panels) {
		$(id).hide()
		panels[id] = false
	}
	$('.textbox').hide()
}

$(window).resize(function() {
	canv.width = $(window).width()
	canv.height = $(window).height()
	cwidth = canv.width
	cheight = canv.height
	canvRect = canv.getClientRects()[0]
	ctop = canvRect.top,
	cleft = canvRect.left
	cWHRatio = cwidth/cheight
});

function scrollView(shiftX,shiftY) {
	if (minX > cwidth-200) {
		if (shiftX < 0) {
			viewOffset.x -= shiftX
		} else {
			viewOffsetVel.x = -0.5*viewOffsetVel.x
		}
	} else if (maxX < 200) {
		if (shiftX > 0) {
			viewOffset.x -= shiftX
		} else {
			viewOffsetVel.x = -0.5*viewOffsetVel.x
		}
	} else {
		viewOffset.x -= shiftX
	}
	if (minY > cheight-200) {
		if (shiftY < 0) {
			viewOffset.y -= shiftY
		} else {
			viewOffsetVel.y = -0.5*viewOffsetVel.y
		}
	} else if (maxY < 200) {
		if (shiftY > 0) {
			viewOffset.y -= shiftY
		} else {
			viewOffsetVel.y = -0.5*viewOffsetVel.y
		}
	} else {
		viewOffset.y -= shiftY
	}
}

canv.onmousemove = function(event) {
	if (doScroll) {
		var shiftX = event.clientX - mousePos.x,
			shiftY = event.clientY - mousePos.y
		scrollView(shiftX,shiftY)
		viewOffsetVel.x = mouseVel.x
		viewOffsetVel.y = mouseVel.y
		viewOffsetAcc.x = mouseAcc.x
		viewOffsetAcc.y = mouseAcc.y
	}
	prevMousePos.x = mousePos.x
	prevMousePos.y = mousePos.y
	mousePos.x = event.clientX
	mousePos.y = event.clientY
	prevMouseVel.x = mouseVel.x
	prevMouseVel.y = mouseVel.y
	mouseVel.x = mousePos.x - prevMousePos.x
	mouseVel.y = mousePos.y - prevMousePos.y
	mouseAcc.x = mouseVel.x - prevMouseVel.x
	mouseAcc.y = mouseVel.y - prevMouseVel.y
	handleVertexMouseover()
}

canv.onmouseout = function(event) {
	doScroll = false
	setTimeout(function() {
		if (!doScroll) {
			clearAll = false
		}
	},500)
}

canv.onmouseup = canv.onmouseout

canv.onmousedown = function(event) {
	mousePos.x = event.clientX
	mousePos.y = event.clientY
	var vindex = Vertex.find(mousePos.x,mousePos.y)
	if (vindex == -1) {
		hideCurrentPanel()
		doScroll = true
		clearAll = true
	} else {
		var vname = Vertex.all[vindex].name
		switch (vname) {

		case 'me':
		hideCurrentPanel()
		var x=cwidth/6,y=cheight/6,a=2*cwidth/3,b=2*cheight/3
		setMouseoverActive(false)
		for (var i = 1; i < Vertex.all.length; i++) {
			Vertex.all[i].setFade(0.005,250)
		}
		for (var i=0, n=Edge.all.length; i < n; i++) {
			Edge.all[i].setFade(0.005,250)
		}
		setTimeout(function() {
			Edge.all = []
			Vertex.all = [Vertex.all[0]]
			canv.width = canv.width
			expandInit()
			clearAll = true
			for (var i=1,n=Vertex.all.length; i < n; i++) {
				Vertex.all[i].setFade(0.6,500)
			}
			for (var i=0,n=Edge.all.length; i < n; i++) {
				Edge.all[i].setFade(0.6,500)
			}
			setMouseoverActive(true)
			setTimeout(function() {
				clearAll = false
				projExpand = false
				contExpand = false
			},500)
		},750)
		break;

		case 'projects':
		if (!projExpandLock) {
			if (!projExpand) {
				projExpandLock = true
				expandProjects()
				projExpand = true
				projExpandLock = false
			} else {
				projExpandLock = true
				collapseProjects()
				projExpand = false
			}
		}
		break;

				// About
		case 'about':
		if (curPanel) {
			hideCurrentPanel()
		} else {
			curPanel = '#about'
			showPanel(curPanel)
		}
		break;

		// Contact
		case 'contact':
		if (!contExpandLock) {
			if (!contExpand) {
				contExpandLock = true
				expandContacts()
				contExpand = true
				contExpandLock = false
			} else {
				contExpandLock = true
				collapseContacts()
				contExpand = false
			}
		}
		break;

		// Resume
		case 'resume':
		link('whsieh-resume.pdf')
		break;

		// Dygraph
		case 'dygraph':
		if (curPanel) {
			hideCurrentPanel()
		} else {
			curPanel = '#dygraph'
			showPanel(curPanel)
		}
		break;

		// Gomoku
		case 'gomoku':
		if (curPanel) {
			hideCurrentPanel()
		} else {
			curPanel = '#gomoku'
			showPanel(curPanel)
		}
		break;

		// QWOP
		case 'qwop':
		if (curPanel) {
			hideCurrentPanel()
		} else {
			curPanel = '#qwop'
			showPanel(curPanel)
		}
		break;

		// PWeb
		case 'pweb':
		if (curPanel) {
			hideCurrentPanel()
		} else {
			curPanel = '#pweb'
			showPanel(curPanel)
		}
		break;

		case 'github':
		if (curPanel) {
			hideCurrentPanel()
		} else {
			link('http://www.github.com/whsieh')
		}
		break;

		case 'linkedin':
		if (curPanel) {
			hideCurrentPanel()
		} else {
			link('http://www.linkedin.com/in/whsieh')
		}
		break;
		}
	}
}

function showPanel(panel) {
	var w=$(panel).width(),h=$(panel).height()
	$(panel).css({
		left:(cwidth-w)/2+'px',
		top:(cheight-h)/2+'px'
	})
	$(panel).fadeIn(400);
	$('#main').animate({backgroundColor:'#555555'},400)
	curPanel = panel
}

function showTextbox(txt) {
	var w=$(txt).width(),h=$(txt).height()
	$(txt).css({left:(mousePos.x-w)/2,top:(mousePos.y-h)/2})
	$(txt).fadeIn(400);
}

function setMouseoverActive(b) {
	mouseoverActive = b
}

function handleVertexMouseover() {
	var mouseVtx = Vertex.find(mousePos.x,mousePos.y)
	if (mouseVtx != selVtxIndex) {
		if (selVtxIndex != -1) {
			Vertex.all[selVtxIndex].mouseexit()
		}
		selVtxIndex = mouseVtx
		if (mouseVtx != -1) {
			Vertex.all[mouseVtx].mouseenter()
		}
	}
}

function init() {
	initializeMe()
	initializePhysicsLoop()
	Vertex.all[0].setFade(0.6,500)
}

function fadeGraph(alpha) {
	for (var i=0,n=Vertex.all.length; i < n; i++) {
		Vertex.all[i].setFade(alpha,1000)		
	}
	for (var i=0,n=Edge.all.length; i < n; i++) {
		Edge.all[i].setFade(alpha,1000)
	}
}

function initializePhysicsLoop() {
	step()
}

/**
  Initializes all vertices and edges in the graph
*/
function initializeMe() {
	if (Vertex.all.length == 0) {
		new Vertex('me',P(cwidth/2,cheight/2))		// Me: 0
	}
}

function expandInit() {
	initialized = true
	var x=cwidth/6,y=cheight/6,
		a=2*cwidth/3,b=2*cheight/3
	var e = new Vertex('projects',randomXY(x,y,a,b))	// Projects: 1
	e.setFade(0.6,750)
	e = new Edge(Vertex.all[0],Vertex.all[1])
	e.setFade(0.6,750)
	e = new Vertex('about',randomXY(x,y,a,b))		// About: 2
	e.setFade(0.6,750)
	e = new Edge(Vertex.all[2],Vertex.all[0])
	e.setFade(0.6,750)
	e = new Vertex('contact',randomXY(x,y,a,b))		// Contact: 3
	e.setFade(0.6,750)
	e = new Edge(Vertex.all[3],Vertex.all[0])
	e.setFade(0.6,750)
	e = new Vertex('resume',randomXY(x,y,a,b))		// Resume: 4
	e.setFade(0.6,750)
	e = new Edge(Vertex.all[4],Vertex.all[0])
	e.setFade(0.6,750)
}

function expandContacts() {
	var x=cwidth/6,y=cheight/6,
		a=2*cwidth/3,b=2*cheight/3
	var e = new Vertex('github',randomXY(x,y,a,b))		// github
	e.setFade(0.6,750)
	e = new Edge(Vertex.all[Vertex.all.length-1],Vertex.all[3])
	e.setFade(0.6,750)
	var e = new Vertex('linkedin',randomXY(x,y,a,b))		// linkedin
	e.setFade(0.6,750)
	e = new Edge(Vertex.all[Vertex.all.length-1],Vertex.all[3])
	e.setFade(0.6,750)
	clearAll = true
	setTimeout(function() {
		clearAll = false
	},500)
}

function collapseContacts() {
	var edgeset = {}
	for (var v = 0; v <  Vertex.all.length; v++) {
		var vtx = Vertex.all[v]
		if (vtx.name in contactNames) {
			vtx.setFade(0.005,150)
			for (var vn in vtx.adj) {
				var edge = vtx.adj[vn]
				if (!(edge.name in edgeset)) {
					edge.setFade(0.005,150)
					edgeset[edge.name] = true
				}
			}
		}
	}
	setTimeout(function() {
		for (var v = Vertex.all.length-1; v >= 0; v--) {
			var vtx = Vertex.all[v]
			if (vtx.name in contactNames) {
				vtx.remove()
			}
		}
		contExpandLock = false
	},250)
}

function expandProjects() {
	var x=cwidth/6,y=cheight/6,
		a=2*cwidth/3,b=2*cheight/3
	var e = new Vertex('dygraph',randomXY(x,y,a,b))		// Dygraph: 5
	e.setFade(0.6,750)
	e = new Edge(Vertex.all[Vertex.all.length-1],Vertex.all[1])
	e.setFade(0.6,750)
	e = new Vertex('gomoku',randomXY(x,y,a,b))		// Gomoku: 6
	e.setFade(0.6,750)
	e = new Edge(Vertex.all[Vertex.all.length-1],Vertex.all[1])
	e.setFade(0.6,750)
	e = new Vertex('qwop',randomXY(x,y,a,b))		// QWOP: 7
	e.setFade(0.6,750)
	e = new Edge(Vertex.all[Vertex.all.length-1],Vertex.all[1])
	e.setFade(0.6,750)
	e = new Vertex('pweb',randomXY(x,y,a,b))		// PWeb: 8
	e.setFade(0.6,750)
	e = new Edge(Vertex.all[Vertex.all.length-1],Vertex.all[1])
	e.setFade(0.6,750)
	clearAll = true
	setTimeout(function() {
		clearAll = false
	},500)
}

function collapseProjects() {
	var edgeset = {}
	for (var v = 0; v <  Vertex.all.length; v++) {
		var vtx = Vertex.all[v]
		if (vtx.name in projectNames) {
			vtx.setFade(0.005,150)
			for (var vn in vtx.adj) {
				var edge = vtx.adj[vn]
				if (!(edge.name in edgeset)) {
					edge.setFade(0.005,150)
					edgeset[edge.name] = true
				}
			}
		}
	}
	setTimeout(function() {
		for (var v = Vertex.all.length-1; v >= 0; v--) {
			var vtx = Vertex.all[v]
			if (vtx.name in projectNames) {
				vtx.remove()
			}
		}
		projExpandLock = false
	},250)
}

/**
  Draws all vertices and edges in the graph. Draws all edges first, so
  any vertices overlapping an edge will appear in the front.
*/
function drawAll() {
	for (var i = 0; i < Edge.all.length; i++) {
		Edge.all[i].draw()
	}
	for (var i = 0; i < Vertex.all.length; i++) {
		Vertex.all[i].draw()
	}
	if (scrollMessage) {
		scrollMessage.draw()
	}
}

/**
  Loops through every pair of vertices in the graph, updating their
  positions, velocities and accelerations.
*/
function update() {

	if (!doScroll) {
		var ax = viewOffsetAcc.x,
			ay = viewOffsetAcc.y,
			vx = viewOffsetVel.x,
			vy = viewOffsetVel.y
		// console.log([vx,vy])
		scrollView(vx,vy)
		viewOffsetVel.x *= 0.95
		viewOffsetVel.y *= 0.95
	}

	minX = cwidth
	minY = cheight
	maxX = 0
	maxY = 0

	// Update acc for repulsive and attractive forces
	for (var i = 0; i < Vertex.all.length; i++) {
		
		var vi = Vertex.all[i]
		var px = vi.vPos.x, py = vi.vPos.y
		if (vi.vPos.x < minX) {
			minX = px
		}
		if (vi.vPos.y < minY) {
			minY = py
		}
		if (vi.vPos.x > maxX) {
			maxX = px
		}
		if (vi.vPos.y > maxY) {
			maxY = py
		}
		minX = minX < 0 ? 0 : minX
		minY = minY < 0 ? 0 : minY
		maxX = maxX > cwidth ? cwidth : maxX
		maxY = maxY > cheight ? cheight : maxY

		for (var j = i+1; j < Vertex.all.length; j++) {
			var vj = Vertex.all[j]
			var dx = vj.gPos.x - vi.gPos.x,
				dy = vj.gPos.y - vi.gPos.y
			var sqdst = (dx*dx) + (dy*dy) + 1
			var dst = sqrt(sqdst)
			// We need |<accX,accY>| = repelMgn
			var repelMgn = min(REPULSION/(sqdst*dst),10)
			var accX = dx*repelMgn,
				accY = dy*repelMgn
			vi.acc.x -= accX
			vi.acc.y -= accY
			vj.acc.x += accX
			vj.acc.y += accY
			if (vi.hasEdge(vj)) {
				accX = dx*ATTRACTION
				accY = dy*ATTRACTION
				vi.acc.x += accX
				vi.acc.y += accY
				vj.acc.x -= accX
				vj.acc.y -= accY
			}
		}
	}
	// Account for drag and update pos,vel
	for (var i=0,n=Vertex.all.length; i < n; i++) {
		var vtx = Vertex.all[i]
		var dragX = -vtx.vel.x*DRAG,
			dragY = -vtx.vel.y*DRAG
		offset(vtx.acc,dragX,dragY)
		offset(vtx.gPos,vtx.vel)
		offset(vtx.vel,vtx.acc)
		vtx.vPos = getViewPos(vtx.gPos)
		vtx.acc.x = 0
		vtx.acc.y = 0
	}
}

function step() {
	var focus = document.hasFocus()
		if (focus) {
			update()
		if (framecount > 60) {
			clear(true)
			framecount = 0
		} else {
			clear(false)
			framecount++
		}
		drawAll()
	}
	window.requestAnimationFrame(step);
}

/* GRAPH-SPECIFIC DATASTRUCTURES */

/**
  The Vertex is a node in the graph. It has an image, a unique global
  ID, a global position used by the physics engine, a view position
  used by the canvas, and its adjacency information (a collection that
  maps edge IDs to their corresponding vertex IDs)
*/
function Vertex(imgName,x,y) {
	if (y == undefined) {
		this.gPos = x
	} else {
		this.gPos = P(x,y)
	}
	this.state = IDLE
	this.name = imgName
	this.img = icons[imgName]
	this.adj = {}
	this.vPos = getViewPos(this.gPos)
	if (imgName == 'linkedin') {
		this._ringImg = ring0
	} else {
		this._ringImg = rings[floor(rings.length*random())]
	}
	this.labelText = labels[imgName][0]
	this.labelFont = labels[imgName][1]
	this.labelShiftX = -this.img.width/2
	this.labelShiftY = this.img.height
	this.opacity = 0
	// Used by the physics engine
	this.vel = P(0,0)
	this.acc = P(0,0)
	Vertex.all.push(this)
	this.fadeTimeRemaining = 0
	this.fadeAmount = 0
}

/**
  Using the 2d context ctx, draws the vertex on the canvas.
*/
Vertex.prototype.draw = function() {

	var oldAlpha = ctx.globalAlpha
	ctx.globalAlpha = this.opacity

	if (this.fadeTimeRemaining > 0) {
		this.fadeTimeRemaining--
		this.opacity += this.fadeAmount
	}
	drawCroppedImage(this.img,this.vPos.x,this.vPos.y,31)
	drawImage(this._ringImg,this.vPos.x,this.vPos.y,true)
	drawText(this.labelText,this.vPos.x + this.labelShiftX,
		this.vPos.y+this.labelShiftY,this.labelFont)
	ctx.globalAlpha = oldAlpha
}

Vertex.prototype.contains = function(x,y) {
	var r = 16 + this._ringImg.width/2,
		dx = this.vPos.x - x,
		dy = this.vPos.y - y
	return dx*dx + dy*dy < r*r
}

Vertex.prototype.setFade = function(toAlpha,time) {
	if (time == undefined) {
		time = TIMESTEPMS
	}
	time = round(time/TIMESTEPMS)
	this.fadeAmount = (toAlpha - this.opacity) / time
	this.fadeTimeRemaining = time
}

Vertex.prototype.mouseenter = function() {
	this.state = HIGHLIGHTED
	this.setFade(1,100)
	if (!initialized && this.name=='me') {
		expandInit()
	}
}

Vertex.prototype.mouseexit = function() {
	this.state = IDLE
	this.setFade(0.6,100)
}

Vertex.prototype.clear = function() {
	var imgW = this.img.width, imgH = this.img.height
	ctx.clearRect(this.vPos.x-imgW/2-75,
		this.vPos.y-imgH/2-75,imgW-2*this.labelShiftX+200,imgH+200)
}

Vertex.prototype.sqdist = function(vtx) {
	return sqdist(vtx.gPos,this.gPos)
}

Vertex.prototype.gdist = function(vtx) {
	return dist(vtx.gPos,this.gPos)
}

Vertex.prototype.vdist = function(vtx) {
	return dist(vtx.vPos,this.vPos)
}

Vertex.prototype.hasEdge = function(vtx) {
	return vtx.name in this.adj
}

Vertex.prototype.setPosition = function(x,y) {
	this.gPos.x = x
	this.gPos.y = y
	this.vPos = getViewPos(this.gPos)
}

Vertex.prototype.remove = function() {
	for (var key in this.adj) {
		this.adj[key].remove()
	}
	for (var v = 0; v < Vertex.all.length; v++) {
		if (Vertex.all[v].name == this.name)  {
			Vertex.all.splice(v,1)
			break
		}
	}
}

Vertex.find = function(x,y) {
	if (mouseoverActive) {
		for (var i = 0; i < Vertex.all.length; i++) {
			if (Vertex.all[i].contains(x,y)) {
				return i
			}
		}
	}
	return -1
}

Vertex.all = []

/**
  Simple class that represents an edge in the graph. Contains
  a pair of adjacent vertices.
*/
function Edge(v1,v2) {
	this.v1 = v1
	this.v2 = v2
	this.name = v1.name + '-' + v2.name
	Edge.all.push(this)
	v1.adj[v2.name] = this
	v2.adj[v1.name] = this
	this.opacity = 0
	this.fadeTimeRemaining = 0
	this.fadeAmount = 0
}

Edge.prototype.clear = function() {
	var dx = this.v2.vPos.x - this.v1.vPos.x,
		dy = this.v2.vPos.y - this.v1.vPos.y
	var theta = atan2(dy,dx)
	ctx.translate(this.v1.vPos.x, this.v1.vPos.y)
	ctx.rotate(theta)
	ctx.clearRect(0,-25,this.v1.vdist(this.v2),50)
	ctx.rotate(-theta)
	ctx.translate(-this.v1.vPos.x,-this.v1.vPos.y)
}

Edge.prototype.setFade = function(toAlpha,time) {
	if (time == undefined) {
		time = TIMESTEPMS
	}
	time = round(time/TIMESTEPMS)
	this.fadeAmount = (toAlpha - this.opacity) / time
	this.fadeTimeRemaining = time
}

/**
  Using the 2d context ctx, draws the edge on the canvas.
*/
Edge.prototype.draw = function() {

	var oldAlpha = ctx.globalAlpha
	ctx.globalAlpha = this.opacity

	if (this.fadeTimeRemaining > 0) {
		this.fadeTimeRemaining--
		this.opacity += this.fadeAmount
	}

	var dx = this.v2.vPos.x - this.v1.vPos.x,
		dy = this.v2.vPos.y - this.v1.vPos.y,
		len = dist(this.v1.vPos,this.v2.vPos)
	var theta = atan2(dy,dx),
		cost = cos(theta),
		sint = sin(theta)
	var a = VERTEX_RADIUS*cost,
		b = VERTEX_RADIUS*sint
	var start = P(this.v1.vPos.x+a,this.v1.vPos.y+b),
		end = P(this.v2.vPos.x-a,this.v2.vPos.y-b)
	if (len > 200) {
		drawBrush(start,end)
	} else if (len > 72) {
		var gap = len/20
		var shiftX = gap*cost, shiftY = gap*sint
		offset(start,2*sgn(shiftX),2*sgn(shiftY))
		offset(end,-2*sgn(shiftX),-2*sgn(shiftY))
		drawLine(start,end,1.1,'#')
		offset(start,shiftX,shiftY)
		offset(end,-shiftX,-shiftY)
		drawLine(start,end,1.5,'#000000')
		offset(start,shiftX,shiftY)
		offset(end,-shiftX,-shiftY)
		for (var t = 2.5; t < 5; t+=0.5) {
			drawLine(start,end,t,'#000000')
			offset(start,shiftX,shiftY)
			offset(end,-shiftX,-shiftY)
		}
	}
	ctx.globalAlpha = oldAlpha
}

Edge.prototype.remove = function() {
	delete this.v1.adj[this.v2.name]
	delete this.v2.adj[this.v1.name]
	for (var e = 0; e < Edge.all.length; e++) {
		if (Edge.all[e].name == this.name)  {
			Edge.all.splice(e,1)
			break
		}
	}
}

Edge.all = []


/* CANVAS UTILITY METHODS */

function randomXY(x,y,dx,dy) {
	return P(dx*random()+x,dy*random()+y)
}

function clear(total) {
	if (total || clearAll) {
		ctx.clearRect(0, 0, canv.width, canv.height);
	} else {
		for (var i=0,n=Edge.all.length; i < n; i++) {
			Edge.all[i].clear()
		}
		for (var i=0,n=Vertex.all.length; i < n; i++) {
			Vertex.all[i].clear()
		}
	}
	if (scrollMessage) {
		scrollMessage.clear()
	}
}

function getViewPos(gPos) {
	return P((gPos.x-viewOffset.x)*cwidth/viewSpan.x,
		(gPos.y-viewOffset.y)*cheight/viewSpan.y)
}

function prepareFont(font,callback) {
	drawText('',0,0,'8px '+font)
	callback()
}

function drawText(text,x,y,font) {
	if (font != undefined) {
		var oldFont = ctx.font
		ctx.font = font
		ctx.fillText(text,x,y)
		ctx.font = oldFont
	} else {
		ctx.fillText(text,x,y)
	}
}

function drawImage(img,x,y,centered) {
	if (centered) {
		ctx.drawImage(img,x-img.width/2,y-img.height/2)
	} else {
		ctx.drawImage(img,x,y)
	}
}

function drawBrush(p1,p2) {

	var dx = p2.x - p1.x
	var dy = p2.y - p1.y
	var theta = atan2(dy,dx)
	var a = brush.width*cos(theta)
	var b = brush.width*sin(theta)
	// Draw the stroke beginning
	ctx.translate(p1.x,p1.y)
	ctx.rotate(theta + PI)
	drawImage(brush,-brush.width,-brush.height+2.5)
	ctx.rotate(-theta-PI)
	ctx.translate(-p1.x,-p1.y)
	// Draw the stroke end
	ctx.translate(p2.x,p2.y)
	ctx.rotate(theta)
	drawImage(brush,-brush.width,-brush.height+2.5)
	ctx.rotate(-theta)
	ctx.translate(-p2.x,-p2.y)
	// Draw the stroke body
	drawLine(P(p1.x+a,p1.y+b),P(p2.x-a,p2.y-b),5,'#000000')
}

function drawCroppedImage(img,x,y,crop) {
	var hx = img.width/2, hy = img.height/2
	crop = crop==undefined ? hx-1 : crop
	ctx.save()
	ctx.beginPath()
	ctx.arc(x,y,crop,0,2*Math.PI)
	ctx.closePath()
	ctx.clip()
	ctx.drawImage(img,x-hx,y-hy)
	ctx.restore()
}

function drawLine(p1,p2,lWidth,sStyle) {
	var w = ctx.lineWidth
	var s = ctx.strokeStyle;
	lWidth = lWidth ? lWidth : 1
	sStyle = sStyle ? sStyle : '#000000'
	ctx.lineWidth = lWidth
	ctx.strokeStyle = sStyle
	ctx.beginPath()
	ctx.moveTo(p1.x,p1.y)
	ctx.lineTo(p2.x,p2.y)
	ctx.stroke()
	ctx.lineWidth = w
	ctx.strokeStyle = s
}

function sgn(x) {
	return x==0 ? 0 : (x<0 ? -1 : 1)
}

// Returns an object representing a 2D point or vector. Has 2
// fields: x and y
function P(x,y) {
	return {'x':x,'y':y}
}

function offset(p,dx,dy) {
	if (dy==undefined) {
		p.x += dx.x
		p.y += dx.y
	} else {
		p.x += dx
		p.y += dy
	}
}

function reduce(p,dx,dy) {
	if (dy == undefined) {

	} else {
		if (p.x > 0) {
			p.x -= dx
			if (p.x < 0) {
				p.x = 0
			}
		} else if (p.x < 0) {
			p.x += dx
			if (p.x > 0) {
				p.x = 0
			}
		}
		if (p.y > 0) {
			p.y -= dy
			if (p.y < 0) {
				p.y = 0
			}
		} else if (p.y < 0) {
			p.y += dx
			if (p.y > 0) {
				p.y = 0
			}
		}
	}
}

function sqdist(p1,p2) {
	var dx = p2.x - p1.x
	var dy = p2.y - p1.y
	return dx*dx + dy*dy
}

function dist(p1,p2) {
	var dx = p2.x - p1.x
	var dy = p2.y - p1.y
	return sqrt(dx*dx + dy*dy)
}

for (var panel in panels) {
	$(panel).click(function() {
		hideCurrentPanel()
	})
}

hideInfoPanels()
// Force the custom font to load after a short delay by writing
// an empty string onto the canvas
setTimeout(function() {
	prepareFont('joecasual',init)
},500)
setTimeout(function() {
	scrollMessage = new FlashingMessage('Click & drag to scroll',
		'24px joecasual',50,50,0.05236,360,function() {
			scrollMessage = null
			setTimeout(function() {
				scrollMessage = new FlashingMessage('Click & drag to scroll',
				'24px joecasual',50,50,0.05236,360,function() {
					scrollMessage = null
				})
			},10000)
		})
},5000)

function hideCurrentPanel() {
	if (curPanel) {
		$('#main').animate({backgroundColor:'white'},400)
		$(curPanel).fadeOut(400)
		curPanel = null
	}
}

$(document).keyup(function(e) {
	if (e.keyCode == 27) { // ESC
		hideCurrentPanel()
	}
});

function link(url,type) {
	type = type || '_blank'
	window.open(url,type)
}

$('#about-algo').click(function(evt) {
	link('https://github.com/whsieh/DyGraph/blob/master/src/stat/comm/CommunityTransformer.java')
	evt.stopPropagation()
})

$('#about-dnd').click(function(evt) {
	link('https://github.com/whsieh/warscribe')
	evt.stopPropagation()
})

$('#gomoku-dl').click(function(evt) {
	link('dl/gomoku.jar')
	evt.stopPropagation()
})

$('#qwop-app').click(function(evt) {
	link('app/game.html')
	evt.stopPropagation()
})

$('.exp-div').click(function(evt) {
	evt.stopPropagation()
	if ($(this).attr('exp')==='1') {
		$(this).attr('exp','0')
		$(this).animate({
			width:'100px',
			height:'100px'
		},250)
	} else {
		$(this).attr('exp','1')
		$(this).animate({
			width:'500px',
			height:'500px'
		},250)
	}
})
$('.exp-div').hover(function(evt) {
	$(this).animate({
		opacity:1.0
	},100)
},function(evt) {
	console.log($(this).attr('exp'))
	if ($(this).attr('exp')===undefined || $(this).attr('exp')==='0') {
		$(this).animate({
			opacity:0.4
		},100)
	}
})