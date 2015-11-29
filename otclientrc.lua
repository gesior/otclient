-- this file is loaded after all modules are loaded and initialized
-- you can place any custom user code here

g_logger.info('Startup done :]')
g_logger.info("Step 1: prepare client to generate graphics, execute: prepareClient(1076, '/things/1076/items.otb', '/map.otbm', 8)")


local clientVersion = 0
local otbPath = ''
local mapPath = ''

local isGenerating = false
local offset = 0
local threadsToRun = 3
local areasAdded = 0

local startTime = os.time()
local lastPrintStatus = os.time()

-- ex. prepareClient(1076, '/things/1076/items.otb', '/map.otbm')
function prepareClient(cv, op, mp, ttr)
	clientVersion = cv
	otbPath = op
	mapPath = mp
	threadsToRun = ttr or 3
	g_logger.info("Loading client data... (it will freez client for FEEEEW seconds)")
	g_dispatcher.scheduleEvent(prepareClient_action, 1000)
end

function prepareClient_action()
	g_map.initializeMapGenerator(threadsToRun);
	g_logger.info("Loading client Tibia.dat and Tibia.spr...")
	g_game.setClientVersion(clientVersion)
	g_logger.info("Loading server items.otb...")
	g_things.loadOtb(otbPath)
	g_logger.info("Loading server map...")
	g_map.loadOtbm(mapPath)
	g_logger.info("Loaded client data")
end

function generateManager()
	-- code here
	if ((offset + g_map.getGeneratedAreasCount()) / 1000) + 3 > areasAdded then
		g_map.addAreasToGenerator((offset + areasAdded) * 1000, (offset + areasAdded) * 1000 + 999)
		--print('add areans: ' .. areasAdded .. ' f:' .. ((offset + areasAdded) * 1000) .. ' t:' ..  ((offset + areasAdded) * 1000 + 999))
		areasAdded = areasAdded + 1
	end

	if lastPrintStatus ~= os.time() then
		-- status here
		print(math.floor(g_map.getGeneratedAreasCount() / (g_map.getAreasCount() - offset * 1000) * 100) .. '%, ' .. format_int(g_map.getGeneratedAreasCount()) .. ' of ' .. format_int(g_map.getAreasCount() - offset * 1000) .. ' images generated')

		if g_map.getAreasCount() == g_map.getGeneratedAreasCount() + offset * 1000 then
			isGenerating = false
			print('Map image generation finished.')
			print(g_map.getGeneratedAreasCount() .. ' images generated in ' .. (os.time() - startTime) .. ' seconds.')
			return
		end

		lastPrintStatus = os.time()
	end

	g_dispatcher.scheduleEvent(generateManager, 100)
end

function generateMap(newOffset)
	if isGenerating then
		print('Generating script is already running. Cannot start another generation')
		return
	end

	if newOffset then
		offset = newOffset
	end

	isGenerating = true
	areasAdded = 0
	g_map.setGeneratedAreasCount(0)
	startTime = os.time()

	print('Starting generator. ' .. format_int(g_map.getAreasCount() - (offset * 1000)) .. ' images to generate. ' .. threadsToRun .. ' threads will generate it now. Please wait.')

	g_dispatcher.scheduleEvent(generateManager, 1000)
end

function format_int(number)
	local i, j, minus, int, fraction = tostring(number):find('([-]?)(%d+)([.]?%d*)')
	int = int:reverse():gsub("(%d%d%d)", "%1,")
	return minus .. int:reverse():gsub("^,", "") .. fraction
end