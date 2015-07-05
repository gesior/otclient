### What is this fork?

It's 100% automatic map image generator [for website view 'like GoogleMaps'].
It generates OTS map .png images (each 8x8 tiles).

### How to use?

1. Compile it like normal OTClient:
https://github.com/edubart/otclient/wiki/Compiling-on-Windows  - CodeBlocks tutorial [harder, but less GB to download before compilation]
https://otland.net/threads/compiling-otclients-latest-source-with-microsoft-visual-studio-2013.204849/ - VisualStudio tutorial
https://github.com/edubart/otclient/wiki/Compiling-on-Linux
https://github.com/edubart/otclient/wiki/Compiling-on-Mac-OS-X
https://github.com/edubart/otclient/wiki/Compiling-for-Android

2. Copy your server **client .spr and .dat** files to OTClient folder: **data/things/HERE_PROTOCOL_VERSION/**

3. Copy your server **data/items/items.otb** file to OTClient folder: **data/things/HERE_PROTOCOL_VERSION/**

4. Copy your server /**ata/world/MAP_NAME.otbm** file to OTClient folder: **data/map.otbm**

5. Run otclient.exe

6. Type in client terminal command like:
    
    prepareClient(1076, '/things/1076/items.otb', '/map.otbm')
    
	with you client protocol version and valid paths to items.otb and map.otbm
	[Paths are relational, so start path with '/' to start in folder 'data', access to other folders is blocked]

7. OTClient will show in 10-50 seconds (it will freez client, do not close it, just wait) something like [pink text]:

	Example generator of whole map: generateMap(25, 45, 0, 555, 699, 15, 4) [last 4 = 4 threads to generate]

8. Type in client terminal command:
		
	**generateMap(25, 45, 0, 555, 699, 15, 4)**
		
	OTClient will report progress in terminal.

	Last **4** is number of threads to run in same time (only way to use more then 1 core to generate images).

	If you are borded of getting 'crash' every few seconds/minutes [restart client and type all again..] you can set it to **1**.
	It will take sooome time, but it will work for sure, so you can leave PC for night and get your map images.

	**NOTE:** THERE ARE SOME PROBLEMS WITH MULTI THREADING! Read text below, if you want use more then 1 core of your CPU.

	There are some problems with multithreading [few threads try to access 1 tile in same time].
	You can try to run X threads, wait for crash, check in file 'otclient.log' last 'area' generated ['X of XX...'] before crash.
	Then when you start client again, in 'generateMap' command after number of threads, you can add 'start area' to skip already generated areas. Example:
		
	**generateMap(25, 45, 0, 555, 699, 15, NUMBER_OF_THREADS, SKIP_AREAS)**
		
	**Remember to set it to number of areas generated before MINUS number of threads.**

	So if client crashed with last message before 'debug ..':
		
	**78 of 192 generated or are being generated right now, 4 threads are generating**
		
	and last time your ran 7 threads, then after client restart type:
		
	**prepareClient(1076, '/things/1076/items.otb', '/map.otbm') generateMap(25, 45, 0, 555, 699, 15, 7, 71)**
		
	last parameter is **71** (78 - 7).
	
	You can type few commands in one line with 'space' separator (like in code above: prepareClient and then generateMap)
