/*
	2D square graph. Handles grid cell management (placement math for eg pathfinding, range-finding, etc), exposes generalized interface.
 */

define(['graphs/Square', 'utils/Tools'], function(Square, Tools) {

var SquareGrid = function(config) {
	var x, z, c;
	if (!config) config = {};
	var gridSettings = {
		width: 5,
		height: 5,
		type: Square.FLAT,
		cellSize: 10,
		cellScale: 0.95,
		extrudeSettings: {
			amount: 1,
			bevelEnabled: true,
			bevelSegments: 1,
			steps: 1,
			bevelSize: 0.5,
			bevelThickness: 0.5
		}
	};
	
	Tools.merge(true, gridSettings, config);
	
	this.width = gridSettings.width;
	this.height = gridSettings.height;
	this.cellSize = gridSettings.cellSize;
	this.cellScale = gridSettings.cellScale;
	this.type = gridSettings.type || Square.FLAT;
	
	this.rotationIncrement = Square.POINTY;
	// holds the grid position of each cell, to which our meshes are attached to in the Board entity
	this.cells = {};
	this.numCells = 0;
	// holds the mesh data that is displayed
	this.meshes = null;
	this.boxShape = null;
	this.boxGeo = null;
	this.boxMat = gridSettings.material;
	this.hashDelimeter = '.';
	
	// the grid holds its own Group to manipulate and make it easy to add/remove from the scene
	this.group = new THREE.Group();
	
	// construct a box-shaped grid, centered
	var halfW = this.width / 2;
	var halfH = this.height / 2;
	for (x = -halfW; x < halfW; x++) {
		for (z = -halfH; z < halfH; z++) {
			c = new THREE.Vector3(x, 0, z + 1);
			c.w = null; // for storing which box is representing this cell
			this.cells[this.boxToHash(c)] = c;
			this.numCells++;
		}
	}
	
	var i, box, cell;
	this.boxShape = new THREE.Shape();
	this.boxShape.moveTo(0, 0);
	this.boxShape.lineTo(0, this.cellSize);
	this.boxShape.lineTo(this.cellSize, this.cellSize);
	this.boxShape.lineTo(this.cellSize, 0);
	this.boxShape.lineTo(0, 0);
	
	// this.boxGeo = new THREE.ShapeGeometry(this.boxShape);
	this.boxGeo = new THREE.ExtrudeGeometry(this.boxShape, gridSettings.extrudeSettings);
	
	// create Square instances and place them on the grid, and add them to the group for easy management
	this.meshes = [];
	for (i in this.cells) {
		box = new Square(this.cellSize, this.cellScale, this.boxGeo, this.boxMat);
		cell = this.cells[i];
		cell.w = box;
		box.depth = gridSettings.extrudeSettings.amount;
		
		box.placeAt(cell);
		
		this.meshes.push(box);
		this.group.add(box.mesh);
	}
	// rotate the group depending on the shape the grid is in
	this.group.rotation.y = this.type;
	
	// pre-computed permutations
	this._directions = [new THREE.Vector3(+1, 0, 0), new THREE.Vector3(0, 0, -1),
						new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, +1)];
	this._diagonals = [new THREE.Vector3(-1, 0, -1), new THREE.Vector3(-1, 0, +1), 
						new THREE.Vector3(+1, 0, +1), new THREE.Vector3(+1, 0, -1)];
	// cached objects
	this._list = [];
	this._vec3 = new THREE.Vector3();
};

SquareGrid.prototype = {
	/*
		High-level functions that the Board interfaces with (all grids implement).
	 */
	
	// grid cell (Hex in this case) to position in pixels/world
	cellToPixel: function(c, pos) {
		pos.x = c.position.x + (this.cellSize/2);
		pos.y = c.depth + (c.depth/2);
		pos.z = c.position.z - (this.cellSize/2);
	},
	
	// always returns an array
	getNeighbors: function(box, diagonal, filter) {
		var i, c, l = this._directions.length;
		this._list.length = 0;
		for (i = 0; i < l; i++) {
			this._vec3.copy(box.gridPos);
			this._vec3.add(this._directions[i]);
			c = this.cells[this.boxToHash(this._vec3)];
			if (!c || (filter && filter(c.w))) {
				continue;
			}
			this._list.push(c.w);
		}
		if (diagonal) {
			for (i = 0; i < l; i++) {
				this._vec3.copy(box.gridPos);
				this._vec3.add(this._diagonals[i]);
				c = this.cells[this.boxToHash(this._vec3)];
				if (!c || (filter && filter(c.w))) {
					continue;
				}
				this._list.push(c.w);
			}
		}
		return this._list;
	},
	
	distance: function(cellA, cellB) {
		var a = cellA.gridPos;
		var b = cellB.gridPos;
		// console.log('distance: '+(Math.abs(a.x - b.x) + Math.abs(a.z - b.z)));
		return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
	},
	
	clearPath: function() {
		var i, c;
		for (i in this.cells) {
			c = this.cells[i].w;
			c.calcCost = 0;
			c.priority = 0;
			c.parent = null;
			c.visited = false;
		}
	},
	
	traverse: function(cb) {
		var i;
		for (i in this.cells) {
			cb(this.cells[i].w);
		}
	},
	
	getRandomCell: function() {
		var c, i = 0, x = Tools.randomInt(0, this.numCells);
		for (c in this.cells) {
			if (i === x) {
				return this.cells[c].w;
			}
			i++;
		}
		return this.cells[c].w;
	},
	
	/*
		Square-specific conversion math.
	 */
	
	boxToHash: function(box) {
		return box.x+this.hashDelimeter+box.z;
	},
};

return SquareGrid;

});