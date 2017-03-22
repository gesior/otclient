var mapConfig = {
	imagesUrl: 'map/', // URL to folder with 'zoom levels' (folders with names 0-16)
	imagesExtension: '.jpg',
	mapName: 'RL MAP?',
	startPosition: {x: 1000, y: 1000, z: 7},
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
	outfitAnimatedGeneratorURL: 'http://outfit-images.ots.me/animatedOutfits1090/animoutfit.php?'
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

$('#map').css('position', 'relative')
.append('<div id="line1" style="height:3px;width:100%;background:repeating-linear-gradient(90deg,#DD3333,#DD3333 10px,transparent 10px,transparent 20px);top:50%;left:0;position:absolute"></div>')
.append('<div id="line2" style="height:100%;width:3px;background:repeating-linear-gradient(0deg,#DD3333,#DD3333 10px,transparent 10px,transparent 20px);top:0;left:50%;position:absolute"></div>')
