-- this file is loaded after all modules are loaded and initialized
-- you can place any custom user code here

g_logger.info('Startup done :]')
g_logger.debug("----- STEP 1 -----")
g_logger.info("prepare client to generate graphics, EXECUTE:")
g_logger.debug("prepareClient(1076, '/things/1076/items.otb', '/map.otbm', 8, 5)")
g_logger.info("'1076' - client version, OTC will load client .spr and .dat from folder 'data/things/1076'")
g_logger.info("'/things/1076/items.otb' - OTB file [from OTS /data/items/ folder], OTC will load from file 'data/things/1076/items.otb'")
g_logger.info("'/map.otbm' - MAP file [from OTS /data/world/ folder], OTC will load from file 'data/map.otbm'")
g_logger.info("8 - number of threads that will generate map images, set it to number of your CPU 'threads' or lower")
g_logger.info("5 - split map to 5 parts, if your map uses much RAM and OTC is compiled in 32-bit version, you need to load map by parts to reduce maximum RAM usage of OTC")


local clientVersion = 0
local otbPath = ''
local mapPath = ''

local isGenerating = false
local threadsToRun = 3
local areasAdded = 0

local startTime = os.time()
local lastPrintStatus = os.time()


local mapParts = {}
local mapPartsToGenerate = {}
local mapPartsCount = 0
local mapPartsCurrentId = 0
local mapImagesGenerated = 0

-- ex. prepareClient(1076, '/things/1076/items.otb', '/map.otbm')
function prepareClient(cv, op, mp, ttr, mpc)
	clientVersion = cv
	otbPath = op
	mapPath = mp
	threadsToRun = ttr or 3
	mapPartsCount = mpc
	g_logger.info("Loading client data... (it will freez client for FEEEEW seconds)")
	g_dispatcher.scheduleEvent(prepareClient_action, 1000)
end

function prepareClient_action()
	g_map.initializeMapGenerator(threadsToRun);
	g_resources.makeDir('house');
	g_logger.info("Loading client Tibia.dat and Tibia.spr...")
	g_game.setClientVersion(clientVersion)
	g_logger.info("Loading server items.otb...")
	g_things.loadOtb(otbPath)
	g_logger.info("Loading server map information...")
	g_map.setMaxXToLoad(-1) -- do not load tiles, just save map min/max position
	g_map.loadOtbm(mapPath)
	g_logger.info("Loaded map positions. Minimum [X: " .. g_map.getMinPosition().x .. ", Y: " .. g_map.getMinPosition().y .. ", Z: " .. g_map.getMinPosition().z .. "] Maximum [X: " .. g_map.getMaxPosition().x .. ", Y: " .. g_map.getMaxPosition().y .. ", Z: " .. g_map.getMaxPosition().z .. "]")
	g_logger.debug("Loaded client data.")

	local totalTilesCount = 0
	local mapTilesPerX = g_map.getMapTilesPerX()
	for x, c in pairs(mapTilesPerX) do
		totalTilesCount = totalTilesCount + c
	end
	
	mapParts = {}
	local targetTilesCount = totalTilesCount / mapPartsCount
	local currentTilesCount = 0
	local currentPart = {["minXrender"] = 0}
	for i = 0, 70000 do
		if mapTilesPerX[i] then
			currentTilesCount = currentTilesCount + mapTilesPerX[i]
			currentPart.maxXrender = i
			if #mapParts < mapPartsCount and currentTilesCount > targetTilesCount then
				table.insert(mapParts, currentPart)
				currentPart = {["minXrender"] = i}
				currentTilesCount = 0
			end
		end
	end
	currentPart.maxXrender = 70000
	table.insert(mapParts, currentPart)
	
	g_logger.debug('----- MAP PARTS LIST -----')
	for i, currentPart in pairs(mapParts) do
		-- render +/- 8 tiles to avoid problem with calculations precision
		currentPart.minXrender = math.max(0, math.floor((currentPart.minXrender - 8) / 8) * 8)
		currentPart.maxXrender = math.floor((currentPart.maxXrender + 8) / 8) * 8
		
		-- load +/- 16 tiles to be sure that all items on floors below will load
		currentPart.minXload = math.max(0, math.floor((currentPart.minXrender - 16) / 8) * 8)
		currentPart.maxXload = math.floor((currentPart.maxXrender + 16) / 8) * 8
		
		print("PART " .. i .. " FROM X: " .. currentPart.minXrender .. ", TO X: " .. currentPart.maxXrender)
	end
	g_logger.debug('----- MAP PARTS LIST -----')
	
	g_logger.debug('')
	g_logger.debug("----- STEP 2 -----")
    g_logger.info("Now just type (lower levels shadow 30%)");
    g_logger.info("ALL PARTS OF MAP:")
	g_logger.debug("generateMap('all', 30)");
    g_logger.info("ONLY PARTS 2 AND 3 OF MAP:")
	g_logger.debug("generateMap({2, 3}, 30)");
	g_logger.info("")
	
end

function generateManager()
	-- code here
	if (g_map.getGeneratedAreasCount() / 1000) + 1 > areasAdded then
		g_map.addAreasToGenerator(areasAdded * 1000, areasAdded * 1000 + 999)
		areasAdded = areasAdded + 1
	end

	if lastPrintStatus ~= os.time() then
		-- status here
		print(math.floor(g_map.getGeneratedAreasCount() / g_map.getAreasCount() * 100) .. '%, ' .. format_int(g_map.getGeneratedAreasCount()) .. ' of ' .. format_int(g_map.getAreasCount()) .. ' images generated - PART ' .. mapPartsCurrentId .. ' OF ' .. #mapPartsToGenerate)

		if g_map.getAreasCount() == g_map.getGeneratedAreasCount() then
			mapImagesGenerated = mapImagesGenerated + g_map.getGeneratedAreasCount()
			if mapPartsCurrentId ~= #mapPartsToGenerate then
				mapPartsCurrentId = mapPartsCurrentId + 1
				startMapPartGenerator()
				g_dispatcher.scheduleEvent(generateManager, 100)
				return
			end
			isGenerating = false
			print('Map images generation finished.')
			print(mapImagesGenerated .. ' images generated in ' .. (os.time() - startTime) .. ' seconds.')
			return
		end

		lastPrintStatus = os.time()
	end

	g_dispatcher.scheduleEvent(generateManager, 100)
end

function startMapPartGenerator()
	local currentMapPart = mapPartsToGenerate[mapPartsCurrentId]
	
	g_logger.info("Set min X to load: " .. currentMapPart.minXload)
	g_logger.info("Set max X to load: " .. currentMapPart.maxXload)
	g_logger.info("Set min X to render: " .. currentMapPart.minXrender)
	g_logger.info("Set max X to render: " .. currentMapPart.maxXrender)
	g_map.setMinXToLoad(currentMapPart.minXload)
	g_map.setMaxXToLoad(currentMapPart.maxXload)
	g_map.setMinXToRender(currentMapPart.minXrender)
	g_map.setMaxXToRender(currentMapPart.maxXrender)
	
	g_logger.info("Loading server map part...")
	g_map.loadOtbm(mapPath)
	
	areasAdded = 0
	g_map.setGeneratedAreasCount(0)

	print('Starting generator (PART ' .. mapPartsCurrentId .. ' OF ' .. #mapPartsToGenerate .. '). ' .. format_int(g_map.getAreasCount()) .. ' images to generate. ' .. threadsToRun .. ' threads will generate it now. Please wait.')

end

function generateMap(mapPartsToGenerateIds, shadowPercent)
	if isGenerating then
		print('Generating script is already running. Cannot start another generation')
		return
	end
	
	isGenerating = true

	if type(mapPartsToGenerateIds) == "string" then
		mapPartsToGenerateIds = {}
		for i = 1, mapPartsCount do
			table.insert(mapPartsToGenerateIds, i)
		end
	end
	
	g_map.setShadowPercent(shadowPercent)
	mapImagesGenerated = 0
	
	-- split map into parts
	mapPartsCurrentId = 1
	mapPartsToGenerate = {}
	
	
	for _, i in pairs(mapPartsToGenerateIds) do
		table.insert(mapPartsToGenerate, mapParts[i])
	end
	
	startTime = os.time()
	
	startMapPartGenerator()
	
	g_dispatcher.scheduleEvent(generateManager, 1000)
end

function format_int(number)
	local i, j, minus, int, fraction = tostring(number):find('([-]?)(%d+)([.]?%d*)')
	int = int:reverse():gsub("(%d%d%d)", "%1,")
	return minus .. int:reverse():gsub("^,", "") .. fraction
end

partialLoading = false
houseTiles = {}
houseImageMarginSize = 5

function generateHouseImage(id)

	local floors = {}
	
	if partialLoading then
		-- load part of map that contains house
		local minX = 99999
		local maxX = 0
		for _, tilePosition in pairs(houseTiles[id]) do
			local pos = tilePosition

			floors[pos.z] = pos.z

			if pos.x < minX then
				minX = pos.x
			end
			if pos.x > maxX then
				maxX = pos.x
			end
		end
		g_map.setMinXToLoad(minX - (houseImageMarginSize + 16))
		g_map.setMaxXToLoad(maxX + houseImageMarginSize + 16)
		g_map.setMinXToRender(minX - (houseImageMarginSize + 8))
		g_map.setMaxXToRender(maxX + houseImageMarginSize + 8)
		g_logger.info("Loading server map part for house ID " .. id)
		print(
		g_map.getMinXToLoad(),
		g_map.getMaxXToLoad(),
		g_map.getMinXToRender(),
		g_map.getMaxXToRender())
		g_map.loadOtbm(mapPath)
	end

	g_map.drawHouse(id, houseImageMarginSize)
	
	houseTiles[id] = nil
end

function generateHouseImages()
	-- code to generate images in loop, generated images got houseTiles set to null
	local anyGenerated = false
	for houseId, tiles in pairs(houseTiles) do
		if tiles then
			generateHouseImage(houseId)
			g_logger.info("Generated house image: " .. houseId)
			anyGenerated = true
		end
	end
	
	if anyGenerated then
		g_dispatcher.scheduleEvent(generateHouseImages, 100)
	else
		isGenerating = false
		g_logger.info("Done house image generation.")
	end
end

function mapLoadManager()
	if mapPartsCurrentId ~= #mapPartsToGenerate then
		mapPartsCurrentId = mapPartsCurrentId + 1

		local currentMapPart = mapPartsToGenerate[mapPartsCurrentId]

		g_logger.info("Set min X to load: " .. currentMapPart.minXload)
		g_logger.info("Set max X to load: " .. currentMapPart.maxXload)
		g_logger.info("Set min X to render: " .. currentMapPart.minXrender)
		g_logger.info("Set max X to render: " .. currentMapPart.maxXrender)
		g_map.setMinXToLoad(currentMapPart.minXload)
		g_map.setMaxXToLoad(currentMapPart.maxXload)
		g_map.setMinXToRender(currentMapPart.minXrender)
		g_map.setMaxXToRender(currentMapPart.maxXrender)

		g_logger.info("Loading server map part " .. mapPartsCurrentId .. " of " .. #mapPartsToGenerate)
		g_map.loadOtbm(mapPath)

		for _, house in pairs(g_houses.getHouseList()) do
			local houseId = house:getId()
			if not houseTiles[houseId] then
				houseTiles[houseId] = {}
			end
			for i, tile in pairs(house:getTiles()) do
				local tileString = tile:getPosition().x .. '_' .. tile:getPosition().y .. '_' .. tile:getPosition().z
				houseTiles[houseId][tileString] = tile:getPosition()
			end
		end

		g_dispatcher.scheduleEvent(mapLoadManager, 1000)
	else
		g_logger.info("Map loading finished.")
		
		g_logger.info("Starting house image generator.")
		g_logger.info("CLIENT WILL FREEZ! Watch progress in house images output folder.")
		g_dispatcher.scheduleEvent(generateHouseImages, 1000)
	end
end

function generateHouses(shadowPercent, doPartialLoading)
	if isGenerating then
		print('Generating script is already running. Cannot start another generator.')
		return
	end
	
	partialLoading = doPartialLoading
	g_map.setShadowPercent(shadowPercent)
	
	isGenerating = true

	mapPartsCurrentId = 0
	mapPartsToGenerate = {}
	
	for i = 1, mapPartsCount do
		table.insert(mapPartsToGenerate, mapParts[i])
	end

	g_dispatcher.scheduleEvent(mapLoadManager, 100)
end

function saveMinimap(path)
	g_map.setMinXToLoad(0)
	g_map.setMaxXToLoad(70000)
	g_map.setMinXToRender(0)
	g_map.setMaxXToRender(70000)
	g_map.loadOtbm(mapPath)
	g_minimap.saveOtmm(path)
end
