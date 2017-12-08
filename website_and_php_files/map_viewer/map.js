var mapConfig = {
	imagesUrl: 'map/', // URL to folder with 'zoom levels' (folders with names 0-16)
	imagesExtension: '.jpg',
	mapName: 'RL MAP?',
	startPosition: {x: 32000, y: 32000, z: 7},
	startZoom: 14,
	minZoom: 4,
	maxZoom: 18, // maximum zoom with full quality is 16
	
	streamPlayers: false, // stream on/off
	streamUpdateURL: 'update.php',
	streamUpdateOutfitsURL: 'update_outfits.php',
	disableClusteringAtZoom: 14, // disable grouping when zoomed in
	streamAnimationFramesPerSecond: 25, // smoother animation requires fast PC for high number of players online

	streamOutfit: false,
	streamHideOutfitOnZoom: 14, // show icons, not outfits when zoomed out
	itemGeneratorURL: 'http://item-images.ots.me/1092/',
	outfitGeneratorURL: 'http://outfit-images.ots.me/outfit.php?',
	outfitAnimatedGeneratorURL: 'http://outfit-images.ots.me/animatedOutfits1090/animoutfit.php?',
	
	// NPC & Monsters
	creaturesDataURL: 'creaturesData.php', // set 'false' to disable
	drawMonstersMinimumZoom: 14,
	drawNpcsMinimumZoom: 13,
}

var tmpLocation = location.hash.slice(1).split(',');
// #zoom,3,positon,32000,32000,7
if(tmpLocation.length == 6 &&  parseInt(tmpLocation[1]) && parseInt(tmpLocation[3]) && parseInt(tmpLocation[4]) && parseInt(tmpLocation[5]))
{
	mapConfig.startZoom = parseInt(tmpLocation[1]);
	mapConfig.startPosition = {x: parseInt(tmpLocation[3]), y: parseInt(tmpLocation[4]), z: parseInt(tmpLocation[5])};
}
var normalIcon = new L.Icon.Default();
var followedIcon = new (L.Icon.Default.extend({
	options: {
		iconUrl: 'libs/images/marker-icon-red.png' 
	}
}))();
var showedIcon = new (L.Icon.Default.extend({
	options: {
		iconUrl: 'libs/images/marker-icon-red.png' 
	}
}))();
var map = L.map('map', {
	center: new L.LatLng(-(mapConfig.startPosition.y / 2048), (mapConfig.startPosition.x / 2048)),
	zoom: mapConfig.startZoom,
	maxZoom: mapConfig.maxZoom,
	crs: L.CRS.Simple

});

var CreaturesMap = {
	loaded: false,
	markers: false,
	map: false,
	monstersData: {},
	npcsData: {},
	spawnsDataMonster: {},
	spawnsDataNpc: {},
	visibleCreatures: [],
	visibleSpawns: [],
	
	init: function(map)
	{
		CreaturesMap.map = map;
		if (mapConfig.creaturesDataURL) {
			$.getJSON(mapConfig.creaturesDataURL, function(data) {
				if(data) {
					CreaturesMap.monstersData = data.monstersData
					CreaturesMap.npcsData = data.npcsData
					CreaturesMap.spawnsDataMonster = data.spawnsDataMonster
					CreaturesMap.spawnsDataNpc = data.spawnsDataNpc

					CreaturesMap.rebuildData(CreaturesMap.spawnsDataMonster, CreaturesMap.monstersData);
					CreaturesMap.rebuildData(CreaturesMap.spawnsDataNpc, CreaturesMap.npcsData);
					CreaturesMap.loaded = true;
					CreaturesMap.map.on('moveend', CreaturesMap.onMapMove);
					CreaturesMap.redrawCreatureMarkers();

					for(var monsterId in CreaturesMap.monstersData) {
						var monsterData = CreaturesMap.monstersData[monsterId];
						$('#monsterSearch').append('<option>' + monsterData.name + '</option>');
					}
					$('#monsterSearch').chosen();

					for(var npcId in CreaturesMap.npcsData) {
						var npcData = CreaturesMap.npcsData[npcId];
						$('#npcSearch').append('<option>' + npcData.name + '</option>');
					}
					$('#npcSearch').chosen();
				}
			});
		}
		CreaturesMap.clearVisibleSpawns();
	},

	searchByName(names, thingsList) {
		var results = [];

		for (var z in thingsList) {
			if (!thingsList.hasOwnProperty(z)) continue;

			var zData = thingsList[z];
			for (var x in zData) {
				if (!zData.hasOwnProperty(x)) continue;

				var xData = zData[x];
				for (var y in xData) {
					if (!xData.hasOwnProperty(y)) continue;

					var data = xData[y];
					if(names.indexOf(data.name) >= 0) {
						results.push(data);
					}
				}
			}
		}

		return results;
	},

	monsterSearch() {
		CreaturesMap.clearVisibleSpawns();
		var monsterNames = $('#monsterSearch').val();
		var resultsBox = $('#monsterSearchResults');
		if (monsterNames) {
			resultsBox.html('');
			var monsters = CreaturesMap.searchByName(monsterNames, CreaturesMap.spawnsDataMonster);
			// clone objects
			monsters = JSON.parse(JSON.stringify(monsters));
			var currentGroupId = 0;
			var groups = [];
			for(var monsterOneId in monsters) {
				var monster1 = monsters[monsterOneId];
				// create new group
				if (monster1.group === undefined) {
					monster1.group = currentGroupId++;
					groups.push([monster1]);
				}
				for(var monsterTwoId in monsters) {
					var monster2 = monsters[monsterTwoId];
					if (Math.abs(monster1.x - monster2.x) <= 25 && Math.abs(monster1.y - monster2.y) <= 25 && Math.abs(monster1.z - monster2.z) <= 1) {
						if (monster2.group === undefined) {
							// add neightbour to group
							monster2.group = monster1.group;
							groups[monster1.group].push(monster2);
						} else if (monster1.group != monster2.group) {
							// merge group to monster1 group
							var toRemoveGroup = monster2.group;
							for(var monsterMergeId in groups[toRemoveGroup]) {
								var monsterMerge = groups[toRemoveGroup][monsterMergeId];
								monsterMerge.group = monster1.group;
								groups[monster1.group].push(monsterMerge);
							}
							groups[toRemoveGroup] = [];
						}
					}
				}
			}
			for(var i = 0; i < groups.length; i++) {
				if (groups[i].length == 0) {
					groups.splice(i, 1);
					i--;
				}
			}
			resultsBox.append('<div>Monsters: ' + monsters.length + ' Groups: ' + groups.length + '</div>');
			for(var groupId in groups) {
				var groupMonsters = groups[groupId];
				
				var monsterNames = [];
				for(var monsterId in groupMonsters) {
					var monster = groupMonsters[monsterId];
					if (monsterNames.indexOf(monster.name) == -1) {
						monsterNames.push(monster.name);	
					}
				}
				
				// add spawns on map
				if (groupMonsters.length <= 2) {
					for(var monsterId in groupMonsters) {
						var monster = groupMonsters[monsterId];
						var spawn = new L.circle(Map.positionToLatLng(monster.x + 0.5, monster.y + 0.5), 150);
						CreaturesMap.visibleSpawns[monster.z].push(spawn);
					}
					resultsBox.append(
						'<button class="btn btn-info" onclick="Map.setCenter({x: ' + monster.x + ', y:  ' + monster.y + ', z:  ' + monster.z + '}, true);Map.setZoom(15)">' + 
						monsterNames.join(', ')  +  ' (' + groupMonsters.length + ')</button>'
					);
				} else {
					var pointsPerFloor = [];
					for(var i = 0; i <=16; i++) {
						pointsPerFloor.push([]);
					}
					var minLat = 99999;
					var maxLat = -99999;
					var minLng = 99999;
					var maxLng = -99999;
					var spawnBoundsPoints = [];
					for(var monsterId in groupMonsters) {
						var monster = groupMonsters[monsterId];
						pointsPerFloor[monster.z].push(Map.positionToLatLng(monster.x + 1, monster.y + 1));
						pointsPerFloor[monster.z].push(Map.positionToLatLng(monster.x - 1, monster.y - 1));
						spawnBoundsPoints.push(Map.positionToLatLng(monster.x, monster.y));
					}
					var spawnBounds = L.polygon(spawnBoundsPoints).getBounds();
					for(var i = 0; i <=16; i++) {
						var points = pointsPerFloor[i];
						if (points.length > 0) {
							points.sort(sortPointY);
							points.sort(sortPointX);
							var polygonPoints = [];
							hullPoints_size = chainHull_2D(points, points.length, polygonPoints);
							var spawn = L.polygon(polygonPoints);
							CreaturesMap.visibleSpawns[i].push(spawn);
						}
					}
					resultsBox.append(
						'<button class="btn btn-info" onclick="Map.fitBounds(' + spawnBounds.getNorth() + ', ' + spawnBounds.getEast() + ', ' + spawnBounds.getSouth() + ', ' + spawnBounds.getWest() + ', ' + monster.z + ')">' + 
						monsterNames.join(', ')  +  ' (' + groupMonsters.length + ')</button>'
					);
				}
			}
		}
		CreaturesMap.redrawSpawns();
	},

	hideVisibleSpawns() {
		for(var floorId in CreaturesMap.visibleSpawns)
		{
			var visibleSpawnsOnFloor = CreaturesMap.visibleSpawns[floorId];
			for(var markerId in visibleSpawnsOnFloor)
			{
				var marker = visibleSpawnsOnFloor[markerId];
				CreaturesMap.map.removeLayer(marker);
			}
		}
	},

	clearVisibleSpawns() {
		CreaturesMap.hideVisibleSpawns();

		CreaturesMap.visibleSpawns = [];
		for(var i = 0; i <= 16; i++) {
			CreaturesMap.visibleSpawns.push([]);
		}
	},
	
	redrawSpawns() {
		CreaturesMap.hideVisibleSpawns();

		var floorId = Map.getFloor();
		if (CreaturesMap.visibleSpawns[floorId].length > 0) {
			var visibleSpawnsOnFloor = CreaturesMap.visibleSpawns[floorId];
			for(var markerId in visibleSpawnsOnFloor)
			{
				var marker = visibleSpawnsOnFloor[markerId];
				marker.addTo(CreaturesMap.map);
			}
		}
	},
	
	npcSearch() {
		var npcName = $('#npcSearch').val();
		if (npcName) {
			var npcNameArray = [npcName];
			var npcs = CreaturesMap.searchByName(npcNameArray, CreaturesMap.spawnsDataNpc);
			for(var npcId in npcs) {
				var npc = npcs[npcId];
				Map.setCenter({x: npc.x, y: npc.y, z: npc.z}, true);
				Map.setZoom(15);
				var addedSpawn = new L.circle(Map.positionToLatLng(npc.x + 0.5, npc.y + 0.5), 150);
				addedSpawn.addTo(map);
			}
		}
	},

	onMapMove: function()
	{
		CreaturesMap.redrawCreatureMarkers();
	},

	floorChanged: function(floor)
	{
		CreaturesMap.redrawCreatureMarkers();
		CreaturesMap.redrawSpawns();
	},

	getMonstersInRange(minX, minY, minZ, maxX, maxY, maxZ)
	{
		return CreaturesMap.getThingInRange(CreaturesMap.spawnsDataMonster, minX, minY, minZ, maxX, maxY, maxZ)
	},

	getNpcsInRange(minX, minY, minZ, maxX, maxY, maxZ)
	{
		return CreaturesMap.getThingInRange(CreaturesMap.spawnsDataNpc, minX, minY, minZ, maxX, maxY, maxZ)
	},

	getThingInRange(thingList, minX, minY, minZ, maxX, maxY, maxZ)
	{
		var list = [];
		for (var z in thingList) {
			if (!thingList.hasOwnProperty(z) || minZ > z || z > maxZ) continue;

			var zData = thingList[z];
			for (var x in zData) {
				if (!zData.hasOwnProperty(x) || minX > x || x > maxX) continue;

				var xData = zData[x];
				for (var y in xData) {
					if (!xData.hasOwnProperty(y) || minY > y || y > maxY) continue;

					var yData = xData[y];
					list.push(yData);
				}
			}
		}

		return list;
	},
	
	redrawCreatureMarkers: function()
	{
		for(var markerId in CreaturesMap.visibleCreatures)
		{
			var marker = CreaturesMap.visibleCreatures[markerId];
			CreaturesMap.map.removeLayer(marker);
		}

		CreaturesMap.visibleCreatures = [];

		var bounds = Map.getBounds();
		
		if(map.getZoom() >= mapConfig.drawMonstersMinimumZoom)
		{
			var visibleMonsters = CreaturesMap.getMonstersInRange(bounds.minX, bounds.minY, Map.getFloor(), bounds.maxX, bounds.maxY, Map.getFloor());

			for(var monsterId in visibleMonsters)
			{
				var monster = visibleMonsters[monsterId];

				if(monster.z == Map.currentFloor)
				{
					var divider = Math.pow(2, (22 - map.getZoom()));
					var positionChange = {x: 0.5, y: 0.5};
					if(monster.look[1] > 0)
					{
						var monsterIcon = new L.Icon({iconSize: [2048 / divider, 2048 / divider], iconAnchor: [3072 / divider, 3072 / divider], 
							iconUrl: mapConfig.itemGeneratorURL + monster.look[1] + '.gif'});
						positionChange.x += 1;
						positionChange.y += 1;
					}
					else
					{
						var monsterIcon = new L.Icon({iconSize: [4096 / divider, 4096 / divider], iconAnchor: [3072 / divider, 3072 / divider], 
							iconUrl: mapConfig.outfitGeneratorURL + 'id=' + monster.look[0] + '&addons=' + monster.look[6] + 
							'&head=' + monster.look[2] + '&body=' + monster.look[3] + '&legs=' + monster.look[4] + '&feet=' + monster.look[5] + '&mount=0&direction=3'});
					}
					
					var marker = new L.marker(new L.LatLng(-((monster.y+positionChange.y) / 2048), ((monster.x+positionChange.x) / 2048)), {
						icon: monsterIcon,
						monsterName: monster.name,
						type: 'monster'
					});
					marker.on('click', CreaturesMap.onClickMonster);
					marker.addTo(CreaturesMap.map);
					CreaturesMap.visibleCreatures.push(marker);
					
					var nameIcon = new L.divIcon({ 
						iconSize: new L.Point(200, 30), 
						html: monster.name
					});

					var nameMarker = new L.marker(new L.LatLng(-((monster.y+positionChange.y-1) / 2048), ((monster.x+positionChange.x) / 2048)), {
						icon: nameIcon,
						monsterName: monster.name,
						type: 'monster'
					});
					nameMarker.on('click', CreaturesMap.onClickMonster);
					nameMarker.addTo(CreaturesMap.map);
					CreaturesMap.visibleCreatures.push(nameMarker);
				}
			}
		}
		
		var visibleNpcs = CreaturesMap.getNpcsInRange(bounds.minX, bounds.minY, Map.getFloor(), bounds.maxX, bounds.maxY, Map.getFloor());

		if(map.getZoom() >= mapConfig.drawNpcsMinimumZoom)
		{
			for(var npcId in visibleNpcs)
			{
				var npc = visibleNpcs[npcId];

				if(npc.z == Map.currentFloor)
				{
					var divider = Math.pow(2, (22 - map.getZoom()));
					var positionChange = {x: 0.5, y: 0.5};
					if(npc.look[1] > 0)
					{
						var npcIcon = new L.Icon({iconSize: [2048 / divider, 2048 / divider], iconAnchor: [3072 / divider, 3072 / divider], 
							iconUrl: mapConfig.itemGeneratorURL + npc.look[1] + '.gif'});
						positionChange.x += 1;
						positionChange.y += 1;
					}
					else
					{
						var npcIcon = new L.Icon({iconSize: [4096 / divider, 4096 / divider], iconAnchor: [3072 / divider, 3072 / divider], 
							iconUrl: mapConfig.outfitGeneratorURL + 'id=' + npc.look[0] + '&addons=' + npc.look[6] + 
							'&head=' + npc.look[2] + '&body=' + npc.look[3] + '&legs=' + npc.look[4] + '&feet=' + npc.look[5] + '&mount=0&direction=3'});
					}
					
					var marker = new L.marker(new L.LatLng(-((npc.y+positionChange.y) / 2048), ((npc.x+positionChange.x) / 2048)), {
						icon: npcIcon,
						npcName: npc.name,
						type: 'npc'
					});
					marker.on('click', CreaturesMap.onClickNpc);
					marker.addTo(CreaturesMap.map);
					CreaturesMap.visibleCreatures.push(marker);
					
					var nameIcon = new L.divIcon({ 
						iconSize: new L.Point(200, 30), 
						html: npc.name
					});

					var nameMarker = new L.marker(new L.LatLng(-((npc.y+positionChange.y-1) / 2048), ((npc.x+positionChange.x) / 2048)), {
						icon: nameIcon,
						npcName: npc.name,
						type: 'npc'
					});
					nameMarker.on('click', CreaturesMap.onClickNpc);
					nameMarker.addTo(CreaturesMap.map);
					CreaturesMap.visibleCreatures.push(nameMarker);
				}
			}
		}
	},
	
	onClickMonster: function(e) {
		console.log('onClickMonster', e.target.options.monsterName);
	},
	onClickNpc: function(e) {
		console.log('onClickNpc', e.target.options.npcName);
	},

	rebuildData(thingList, thingData)
	{
		for (var z in thingList) {
			if (!thingList.hasOwnProperty(z)) continue;

			var zData = thingList[z];
			for (var x in zData) {
				if (!zData.hasOwnProperty(x)) continue;

				var xData = zData[x];
				for (var y in xData) {
					if (!xData.hasOwnProperty(y)) continue;

					var dataId = xData[y];
					var data = thingData[dataId];
					var newData = {
						name: data.name,
						look: {
							type: data.look[0],
							typeex: data.look[1],
							body: data.look[2],
							legs: data.look[3],
							feet: data.look[4],
							addons: data.look[5]
						}
					};
					for (var key in data) {
						if (!data.hasOwnProperty(key)) continue;

						newData[key] = data[key]
					}
					newData.x = parseInt(x);
					newData.y = parseInt(y);
					newData.z = parseInt(z);

					xData[y] = newData;
				}
			}
		}
	}
}

function onMapPositionChange()
{
	var pos = Map.getPosition();
	location.hash = 'zoom,' + map.getZoom() + ',position,' + parseInt(pos[0]) + ',' + parseInt(pos[1]) + ',' + parseInt(pos[2]);
	var positionString = location.origin + location.pathname + '#zoom,' + map.getZoom() + ',position,' + parseInt(pos[0]) + ',' + parseInt(pos[1]) + ',' + parseInt(pos[2]);
	$('#location').val(positionString)
}

map.on('moveend', onMapPositionChange);

var mapTilesLevelsLayers = [];
var levelsNumber = 16;
for(var i = 0; i < levelsNumber; i++)
{
	// {z} - zoom
	mapTilesLevelsLayers[i] = L.tileLayer(mapConfig.imagesUrl + '{z}/{x}_{y}_' + i + mapConfig.imagesExtension, {
			minZoom: mapConfig.minZoom,
			maxZoom: mapConfig.maxZoom,
			maxNativeZoom: 16,
			attribution: mapConfig.mapName,
			continuousWorld : true
		});
}
var markers = new L.MarkerClusterGroup({ disableClusteringAtZoom: mapConfig.disableClusteringAtZoom });
map.addLayer(markers);

function Player(id, name, position, direction, outfit)
{
	this.id = id;
	this.name = name;
	this.currentPosition = position;
	this.targetPosition = position;
	this.direction = direction;
	this.outfit = outfit;
	this.animationStepChange = {"x": 0, "y": 0};
	this.marker = false;
	this.lastUpdate = 0;
}

var Game = {
	redrawMarkersOnUpdate: false,
	followId: 0,
	showId: 0,
	playersList: {},

	init: function(startPosition)
	{
		CreaturesMap.init(map);
		Map.setCenter(startPosition, true);
		if(mapConfig.streamPlayers)
			Game.updateAnimations(1);
		else {
			$('#followPlayerMenu').hide();
			$('#streamStatus').hide();
		}
	},

	getPlayersList: function()
	{
		return Game.playersList;
	},

	getPlayerById: function(id)
	{
		if(Game.playersList[id])
		{
			return Game.playersList[id];
		}
		else
		{
			return false;
		}
	},

	addPlayer: function(id, name, position, direction, outfit)
	{
		var player = new Player(id, name, position, direction, outfit);
		Game.playersList[id] = player;
		return player;
	},

	removePlayer: function(id)
	{
		if(Game.playersList[id])
		{
			delete Game.playersList[id];
		}
	},

	updateGameState: function(data)
	{
		if(data.players)
		{
			Interface.lastUpdateChanged(Date.now() / 1000 - data.time);
			// PARSE DATA FROM SERVER
			var updateTime = Date.now();
			var players = data.players;
			for (var i = 0; i < players.length; i++)
			{
				var playerData = players[i];
				var player = Game.getPlayerById(playerData[0]);
				var newPosition = {"x": playerData[2] + 0.5, "y": playerData[3] + 0.5, "z": playerData[4]};
				var direction = 3;
				var outfit = {type: 128, head: 114, body: 114, legs: 114, feet: 114, addons: 0, mount: 0};
				if(mapConfig.streamOutfit)
				{
					direction = playerData[5];
					outfit = {type: playerData[6], typeEx: playerData[7], head: playerData[8], body: playerData[9], legs: playerData[10], feet: playerData[11], addons: playerData[12], mount: playerData[13]};
				}
				if(!player)
				{
					player = Game.addPlayer(playerData[0], decodeByte64(playerData[1]), newPosition, direction, outfit);
				}
				else
				{
					player.currentPosition = player.targetPosition;
					player.targetPosition = newPosition;
					player.outfit = outfit;
					player.direction = direction;
					// same floor, short movement distance
					if(player.currentPosition.z == player.targetPosition.z &&
						Math.abs(player.currentPosition.x - player.targetPosition.x) < 20 &&
						Math.abs(player.currentPosition.y - player.targetPosition.y) < 20)
					{
						// animate player movement [tile = 1/2048]
						player.animationStepChange = {
							"x": (player.targetPosition.x - player.currentPosition.x) / mapConfig.streamAnimationFramesPerSecond,
							"y": (player.targetPosition.y - player.currentPosition.y) / mapConfig.streamAnimationFramesPerSecond,
							};
					}
					else
					{
						// teleport player to new position, stop animation
						player.currentPosition = player.targetPosition;
						player.animationStepChange = {"x": 0, "y": 0};
					}
				}
				player.lastUpdate = updateTime;
			}

			// Map: move all players to their current positions or remove them from list
			var idsToRemove = [];
			for(var playerId in Game.playersList)
			{
				if (Game.playersList.hasOwnProperty(playerId))
				{
					var player = Game.playersList[playerId];
					if(player.lastUpdate != updateTime)
					{
						player.marker = false;
						idsToRemove.push(player.id);
					}
				}
			}
			for(var i = 0; i < idsToRemove.length; i++)
			{
				Game.removePlayer(idsToRemove[i]);
			}
			Game.redrawMarkersOnUpdate = true;
			Game.updateAnimations(mapConfig.streamAnimationFramesPerSecond);
		}
		else
		{
			Interface.lastUpdateChanged();
			setTimeout(Game.updateAnimations, 1000, 1);
		}
	},

	redrawMarkers: function()
	{
		// remove markers
		map.removeLayer(markers);
		for(var playerId in Game.playersList)
		{
			if (Game.playersList.hasOwnProperty(playerId))
			{
				var player = Game.playersList[playerId];
				if(player.marker)
				{
					markers.removeLayer(player.marker);
					player.marker = false;
				}
			}
		}
		markers.clearLayers();

		// create new markers
		markers = new L.MarkerClusterGroup({ disableClusteringAtZoom: mapConfig.disableClusteringAtZoom });
		for(var playerId in Game.playersList)
		{
			if (Game.playersList.hasOwnProperty(playerId))
			{
				var player = Game.playersList[playerId];
				if(player.currentPosition.z == Map.currentFloor)
				{
					var url = '';
					var playerIcon = '';
					var direction = 0;
					if(mapConfig.streamOutfit && map.getZoom() > mapConfig.streamHideOutfitOnZoom)
					{
						// show outfits only when zoomed
						if(player.animationStepChange.x != 0 || player.animationStepChange.y != 0)
						{
							// moving
							url= mapConfig.outfitAnimatedGeneratorURL;
							if(Math.abs(player.animationStepChange.x) > Math.abs(player.animationStepChange.y))
							{
								if(player.animationStepChange.x > 0)
								{
									direction = 2;
								}
								else
								{
									direction = 4;
								}
							}
							else
							{
								if(player.animationStepChange.y > 0)
								{
									direction = 3;
								}
								else
								{
									direction = 1;
								}
							}
						}
						else
						{
							// standing
							direction = player.direction;
							url= mapConfig.outfitGeneratorURL;
						}
						var divider = Math.pow(2, (22 - map.getZoom()));
						if(player.outfit.typeEx > 0)
						{
							playerIcon = new L.Icon({iconSize: [2048 / divider, 2048 / divider], iconAnchor: [3072 / divider, 3072 / divider], iconUrl: mapConfig.itemGeneratorURL + player.outfit.typeEx + '.gif'});
						}
						else
						{
							playerIcon = new L.Icon({iconSize: [4096 / divider, 4096 / divider], iconAnchor: [3072 / divider, 3072 / divider], iconUrl: url + 'id=' + player.outfit.type + '&addons=' + player.outfit.addons + '&head=' + player.outfit.head + '&body=' + player.outfit.body + '&legs=' + player.outfit.legs + '&feet=' + player.outfit.feet + '&mount=' + player.outfit.mount + '&direction=' + direction});
						}
					}
					else
					{
						playerIcon = (Game.getFollow() == player.id) ? followedIcon : ((Game.getShow() == player.id) ? showedIcon : normalIcon);
					}
					if(player.outfit.typeEx > 0)
					{
						var marker = L.marker(new L.LatLng(-((player.currentPosition.y+1) / 2048), ((player.currentPosition.x+1) / 2048)), {
							icon: playerIcon,
							playerId: player.id
						})
						.bindLabel(player.name)
						.on('click', Map.onMarkerClick);
					}
					else
					{
						var marker = L.marker(new L.LatLng(-((player.currentPosition.y) / 2048), ((player.currentPosition.x) / 2048)), {
							icon: playerIcon,
							playerId: player.id
						})
						.bindLabel(player.name)
						.on('click', Map.onMarkerClick);
					}
					if(Game.getFollow() != player.id)
					{
						markers.addLayer(marker);
					}
					player.marker = marker;
				}
			}
		}

		map.addLayer(markers);
	},

	updateAnimations: function(step)
	{
		var followedPlayer = Game.getPlayerById(Game.getFollow());
		var isCenter = false;
		if(followedPlayer)
		{
			if(followedPlayer.currentPosition.z != Map.getFloor())
			{
				Map.setCenter(followedPlayer.currentPosition, true);
				isCenter = true;
			}
		}
		else if(Game.getFollow() > 0)
		{
			Interface.followTargetLost();
		}
		if(Game.redrawMarkersOnUpdate)
		{
			Game.redrawMarkers();
			Game.redrawMarkersOnUpdate = false;
		}

		for(var playerId in Game.playersList)
		{
			if (Game.playersList.hasOwnProperty(playerId))
			{
				var player = Game.playersList[playerId];
				if(player.marker && (player.animationStepChange.x != 0 || player.animationStepChange.y != 0))
				{
					player.currentPosition.x += player.animationStepChange.x;
					player.currentPosition.y += player.animationStepChange.y;
						
					var latLng = player.marker.getLatLng();
					latLng.lng = player.currentPosition.x / 2048;
					latLng.lat = -player.currentPosition.y / 2048;
					player.marker.setLatLng(latLng);
					if(followedPlayer.id == player.id && !isCenter)
					{
						Map.setCenter(followedPlayer.currentPosition, false);
					}
				}
			}
		}
		
		if(step == 1)
		{
			/*
			//FAKE PLAYER INFO FOR TESTS:
			var data = {time: Date.now() / 1000, players: [[2,'aaAAAgffg', 1000+Math.floor( Math.random() * 7 ) , 1000, 7, 1, 129,114,45,88,13,1,0], [4,'CCAAAgffg', 1030+Math.floor( Math.random() * 7 ) , 1000+Math.floor( Math.random() * 7 ), 7, 2, 128,114,45,88,13,2,0]]}
			Game.updateGameState(data);
			*/

			var jsonURL = mapConfig.streamUpdateURL;
			if(mapConfig.streamPlayers)
				jsonURL = mapConfig.streamUpdateOutfitsURL;

			$.getJSON(jsonURL, {x:Math.random()}, Game.updateGameState)
				.fail(function()
				{
					Interface.lastUpdateChanged();
					console.log('Status Update Error');
					setTimeout(Game.updateAnimations, 100, 1);
				});
		}
		else if(step > 0)
		{
			setTimeout(Game.updateAnimations, 1000 / mapConfig.streamAnimationFramesPerSecond, step-1);
		}
	},

	moveToPlayer: function(id)
	{
		if(Game.playersList[id])
		{
			Map.setCenter(Game.playersList[id].currentPosition, false);
		}
	},

	setFollow: function(id)
	{
		if(id == 0 || Game.playersList[id])
		{
			Game.followId = id;
			if(id > 0)
			{
				Interface.followTargetUpdate(Game.playersList[id].name);
			}
			else
			{
				Interface.followTargetUpdate();
			}
		}
		else
		{
			Game.followId = 0;
			Interface.followTargetDoesNotExist();
		}
	},

	getFollow: function(id)
	{
		return Game.followId;
	},

	setShow: function(id)
	{
		Game.showId = id;
	},

	getShow: function(id)
	{
		return Game.showId;
	}
}

var Map = {
	currentFloor: -1,
	
	setFloor: function(floorId)
	{
		if(floorId != Map.currentFloor && mapTilesLevelsLayers[floorId])
		{
			if(mapTilesLevelsLayers[Map.currentFloor])
			{
				map.removeLayer(mapTilesLevelsLayers[Map.currentFloor]);
			}
			Map.currentFloor = floorId;
			map.addLayer(mapTilesLevelsLayers[Map.currentFloor]);
			Game.redrawMarkersOnUpdate = true;
			Interface.floorChanged(floorId);
			CreaturesMap.floorChanged(floorId);
		}
	},

	getFloor: function()
	{
		return Map.currentFloor;
	},

	getPosition: function()
	{
		return [map.getCenter().lng * 2048, map.getCenter().lat * -2048, Map.currentFloor];
	},

	positionToLatLng: function(x, y)
	{
		return new L.LatLng((-y / 2048), (x / 2048));
	},

	getBounds: function()
	{
		var bounds = map.getBounds();
		return {
			minX: bounds._southWest.lng * 2048,
			minY: bounds._northEast.lat * -2048,
			maxX: bounds._northEast.lng * 2048,
			maxY: bounds._southWest.lat * -2048
		};
	},

	fitBounds: function(minLat, minLng, maxLat, maxLng, floor)
	{
		Map.setFloor(floor);
		map.fitBounds([
			[minLat, minLng],
			[maxLat, maxLng]
		]);
	},

	setCenter: function(position, teleport)
	{
		Map.setFloor(position.z);
		// +0.5 to set position to center of tile
		var positionX = position.x+0.5;
		var positionY = -(Math.abs(position.y)+0.5);
		if(teleport)
		{
			map.panTo(new L.LatLng((positionY / 2048), (positionX / 2048)), {animate: false, duration: 0.0, easeLinearity: 1.0});
		}
		else
		{
			map.panTo(new L.LatLng((positionY / 2048), (positionX / 2048)), {animate: true, duration: 0.2, easeLinearity: 1});
		}
	},

	setZoom: function(zoom)
	{
		map.setZoom(zoom);
	},

	onMarkerClick: function(e)
	{
		var player = Game.getPlayerById(e.target.options.playerId);
		if(player)
		{
			Game.setFollow(player.id);
			Game.moveToPlayer(player.id);
		}
	}
}

var Interface = {
	lastUpdate: Date.now(),
	floorChanged: function(floorId)
	{
		$('#floorLevel').val(floorId);
		onMapPositionChange();
	},

	followTargetLost: function()
	{
		$('#followStatus').html('Target lost. Player logged out or died.');
	},

	followTargetUpdate: function(name)
	{
		if(name)
		{
			$('#followStatus').html('You are now following: <b>' + name + '</b> <button onclick="Game.setFollow(0)" type="button" class="btn btn-warning btn-xs">Stop</button>');
		}
		else
		{
			$('#followStatus').html('You are not following anyone. Click on player or search by name.');
		}
	},

	followTargetDoesNotExist: function()
	{
		$('#followStatus').html('Cannot follow. Target player is not online');
	},

	lastUpdateChanged: function(newUpdateTime)
	{
		if(newUpdateTime)
		{
			Interface.lastUpdate = newUpdateTime;
		}
		if(Date.now() - Interface.lastUpdate > 5)
		{
			$('#streamStatus').hide();
		}
		else
		{
			$('#streamStatus').text('There are some problems with live stream. Server is not responding or delay is over 5 seconds.');
			$('#streamStatus').show();
		}
	}
}
$("#searchPlayerName").keyup(function(event)
{
	var searchName = $("#searchPlayerName").val().toLowerCase();
	var playersList = Game.getPlayersList();
	$("#searchResults").empty();
	var validPlayersList = [];
	var validPlayersData = {};
	for(var playerId in playersList)
	{
		if(playersList.hasOwnProperty(playerId))
		{
			var player = playersList[playerId];
			if(player.name.toLowerCase().indexOf(searchName) >= 0)
			{
				validPlayersList.push(player.name);
				validPlayersData[player.name] = player;
			}
		}
	}
	if(validPlayersList.length == 0)
	{
		$("#searchResults").append('<li>There is no player online with this name.</li>');
	}
	else if(validPlayersList.length > 30)
	{
		$("#searchResults").append('<li>Too many results. Type more letters.</li>');
	}
	else
	{
		validPlayersList.sort();
		for(var i = 0; i < validPlayersList.length; i++)
		{
			var player = validPlayersData[validPlayersList[i]];
			$("#searchResults").append('<li>' + player.name + ' <button onclick="Game.moveToPlayer(' + player.id + ');Game.setFollow(' + player.id + ')" type="button" class="btn btn-primary btn-xs">Follow</button> <button onclick="Game.moveToPlayer(' + player.id + ');Game.setShow(' + player.id + ')" type="button" class="btn btn-default btn-xs">Show</button></li>');
		}
	}
});
$('#floorLevel').change(function()
{
	Map.setFloor(parseInt($('#floorLevel').val()));
});

$("#searchForm").submit(function(event)
{
	$("#searchPlayerName").keyup();
	event.preventDefault();
});

Game.init(mapConfig.startPosition);
map.setZoom(mapConfig.startZoom);
/*
$('#map').css('position', 'relative')
.append('<div id="line1" style="height:3px;width:100%;background:repeating-linear-gradient(90deg,#DD3333,#DD3333 10px,transparent 10px,transparent 20px);top:50%;left:0;position:absolute"></div>')
.append('<div id="line2" style="height:100%;width:3px;background:repeating-linear-gradient(0deg,#DD3333,#DD3333 10px,transparent 10px,transparent 20px);top:0;left:50%;position:absolute"></div>')
*/