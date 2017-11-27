-- this file is loaded after all modules are loaded and initialized
-- you can place any custom user code here

g_logger.info('Startup done :]')
g_logger.info("Step 1: prepare client to generate graphics, execute: prepareClient(1076, '/things/1076/items.otb', '/map.otbm')")


local clientVersion = 123
local otbPath = ''
local mapPath = ''

local areaSizeY = 25
local areaSizeX = 25
local isGenerating = false
local startTime = 0
local threadsToRun = 1
local areasList = {}
local areasIds = {}
local currentArea = 0
local lastPrintStatus = os.time()

-- ex. prepareClient(1076, '/things/1076/items.otb', '/map.otbm')
function prepareClient(cv, op, mp)
	clientVersion = cv
	otbPath = op
	mapPath = mp
	g_logger.info("Loading client data... (it will freez client for FEEEEW seconds)")
	g_dispatcher.scheduleEvent(prepareClient_action, 1000)
end

function prepareClient_action()
	g_map.initializeMapGenerator();
	g_logger.info("Loading client Tibia.dat and Tibia.spr...")
	g_game.setClientVersion(clientVersion)
	g_logger.info("Loading server items.otb...")
	g_things.loadOtb(otbPath)
	g_logger.info("Loading server map...")
	g_map.loadOtbm(mapPath)
	g_logger.info("Loaded client data")
end

function threadsManager()
	local threadsRunning = 0
	local allFinished = true
	for threadId = 0, threadsToRun - 1 do
		if g_map.isThreadRunning(threadId) then
			threadsRunning = threadsRunning + 1
			allFinished = false
		end
	end
	if currentArea == #areasList then
		if allFinished then
			isGenerating = false
			print('Map image generation finished.')
			print(currentArea .. ' areas generated [each up to ' .. (areaSizeX*areaSizeY) .. ' images] in ' .. (os.time() - startTime) .. ' seconds.')
			return
		end
	end
	if lastPrintStatus ~= os.time() then
		print(currentArea .. ' of ' .. #areasList .. ' generated or are being generated right now, ' .. threadsRunning .. ' threads are generating')
		lastPrintStatus = os.time()
	end
	
	-- there is no more areas to generate and we are just waiting for all threads to finish
	if currentArea < #areasList then
		for threadId = 0, threadsToRun - 1 do
			if currentArea == #areasList then
				break
			end
			if not g_map.isThreadRunning(threadId) then
				currentArea = currentArea + 1
				local areaId = areasIds[currentArea]
				local area = areasList[areaId]
				-- start new thread with given area
				g_map.startThread(threadId, area[1], area[2], area[3], area[4], area[5], area[6])
			end
		end
	end
	g_dispatcher.scheduleEvent(threadsManager, 10)
end

function generateMap(minX, minY, minZ, maxX, maxY, maxZ, threadsCount, customCurrentArea)
	if isGenerating then
		print('Generating script is already running.')
		return
	end
	isGenerating = true
	areasList = {}
	currentArea = 0
	if customCurrentArea then
		currentArea = customCurrentArea
	end
	-- threads number limit is set in engine in file 'mapio.cpp' in line: #define THREADS_NUMBER 128
	if(threadsCount > 128) then
		g_logger.debug('Notice: You tried to run ' .. threadsCount .. ' threads, but threads number limit is 128.')
		threadsCount = 128
	end
	threadsToRun = threadsCount

	-- block invalid values
	minX = math.max(0, minX)
	minY = math.max(0, minY)
	minZ = math.max(0, minZ)

	maxX = math.min(g_map.getSize().width, maxX)
	maxY = math.min(g_map.getSize().height, maxY)
	maxZ = math.min(16, maxZ) -- more then 16 floors? idk if it's possible

	print('Generating areas list for tile positons: min{x=' .. minX .. ', y=' .. minY .. ', z=' .. minZ .. '} , max{x=' .. maxX .. ', y=' .. maxY .. ', z=' .. maxZ .. '}')
	-- change to 8x8 tiles 
	minX = math.floor(minX / 8)
	minY = math.floor(minY / 8)
	maxX = math.floor(maxX / 8) + 1
	maxY = math.floor(maxY / 8) + 1
	for z = minZ, maxZ do
		local startX = minX
		local endX = minX + areaSizeX
		while(startX < maxX) do
			local startY = minY
			local endY = minY + areaSizeY
			while(startY < maxY) do
				-- 1 floor, areaSizeY x areaSizeY 'areas' (each 8x8 tiles), up to 400 images to generate [no tiles in area = no image]
				table.insert(areasList, {startX, startY, z, endX, endY, z})
				--print(startX, startY, z, endX, endY, z)
				startY = endY + 1
				endY = endY + areaSizeY
			end
			startX = endX + 1
			endX = endX + areaSizeX
		end
	end
	-- we need some pseudo random order of areas generated to reduce chance of client crash
	for i = 1, 7 do
		local x = i
		while x <= #areasList do
			table.insert(areasIds, x)
			x = x + 7
		end
	end
	print('Generated list of ' .. #areasList .. ' areas. ' .. threadsCount .. ' threads will generate it now. Please wait.')
	startTime = os.time()
	g_dispatcher.scheduleEvent(threadsManager, 1000)
end
