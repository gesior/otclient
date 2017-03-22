### What is this fork?

It's 100% automatic map image generator [for website view 'like GoogleMaps'].
It generates OTS map .png images (each 8x8 tiles).

### How to use?

1. Compile it like normal OTClient:

https://github.com/edubart/otclient/wiki/Compiling-on-Windows

https://github.com/edubart/otclient/wiki/Compiling-on-Linux

https://github.com/edubart/otclient/wiki/Compiling-on-Mac-OS-X

https://github.com/edubart/otclient/wiki/Compiling-for-Android

2. Copy your server **client .spr and .dat** files to OTClient folder: **data/things/HERE_PROTOCOL_VERSION/**

3. Copy your server **data/items/items.otb** file to OTClient folder: **data/things/HERE_PROTOCOL_VERSION/**

4. Copy your server **data/world/MAP_NAME.otbm** file to OTClient folder: **data/map.otbm**

5. Run **otclient.exe**

6. Type in client terminal command like:
    
   **prepareClient(1076, '/things/1076/items.otb', '/map.otbm', 8, 5)**
    
	- with you client protocol version,
	
	- valid paths to items.otb and map.otbm,
	
	- number of threads to run (in example it's 8),
	
	- number of map parts (OTC will split map to parts to reduce maximum RAM usage)
	
	[Paths are relational, so start path with '/' to start in folder 'data', access to other folders in computer is blocked]

7. OTClient will show in 10-50 seconds (it will freez client, do not close it, just wait) something like:

	Now just type (lower levels shadow 30%)
	ALL PARTS OF MAP:
	generateMap('all', 30)
	ONLY PARTS 2 AND 3 OF MAP:
	generateMap({2, 3}, 30)

8. Type in client terminal command:
		
	**generateMap('all', 30)**
		
	OTClient will report progress in terminal.

9. Your map images will appear in your system 'user' directory

	**%HOMEPATH%/otclient** - Windows, open it in folder explorer
	
	**$({HOME}/.otclient** - Linux, 'cd' to it, this folder is invisible, but you can navigate to it

10. Copy folder **map** from folder metioned in previous step to folder **website_and_php_files** of otclient_mapgen.

--- NEXT STEPS REQUIRE **PHP** INSTALLED IN SYSTEM ---

--- LINUX: FOR GENERATION TIME, SET FOLDER **website_and_php_files** RIGHTS TO 777 ---

11. Execute (in system terminal):

	**php 1_pre_tile_generator.php**

12. Execute (command parameter is map 'floor'):
- You can execute these commands in any order.
- You can open few terminals and run few commands at once to generate it faster (use all CPU cores).

	**php 2_tile_generator.php 0**
	
	**php 2_tile_generator.php 1**
	
	**php 2_tile_generator.php 2**
	
	**php 2_tile_generator.php 3**
	
	**php 2_tile_generator.php 4**
	
	**php 2_tile_generator.php 5**
	
	**php 2_tile_generator.php 6**
	
	**php 2_tile_generator.php 7**
	
	**php 2_tile_generator.php 8**
	
	**php 2_tile_generator.php 9**
	
	**php 2_tile_generator.php 10**
	
	**php 2_tile_generator.php 11**
	
	**php 2_tile_generator.php 12**
	
	**php 2_tile_generator.php 13**
	
	**php 2_tile_generator.php 14**
	
	**php 2_tile_generator.php 15**
	
	**php 2_tile_generator.php 16**

13. Execute:

	**php 3_pre_compress.php**

14. Execute (command parameter is map 'floor'):
- You can set compression quality in file 4_compress.php (line: $quality = 80;)
- You can execute these commands in any order.
- You can open few terminals and run few commands at once to generate it faster (use all CPU cores).

	**php 4_compress.php 0**
	
	**php 4_compress.php 1**
	
	**php 4_compress.php 2**
	
	**php 4_compress.php 3**
	
	**php 4_compress.php 4**
	
	**php 4_compress.php 5**
	
	**php 4_compress.php 6**
	
	**php 4_compress.php 7**
	
	**php 4_compress.php 8**
	
	**php 4_compress.php 9**
	
	**php 4_compress.php 10**
	
	**php 4_compress.php 11**
	
	**php 4_compress.php 12**
	
	**php 4_compress.php 13**
	
	**php 4_compress.php 14**
	
	**php 4_compress.php 15**
	
	**php 4_compress.php 16**

15. Move folder **website_and_php_files/map_viewer** to your webserver - it contains all images and website scripts to view them (Leaflet Map).

16. Configure map_viewer. Config is at start of **map.js** file:
- You can keep images on other webserver. Set **imagesUrl** to URL of this server like: 'http://myserver.com/map_images/'

	imagesUrl: 'map/', // URL to folder with 'zoom levels' (folders with names 0-16)
	
	imagesExtension: '.jpg',
	
	mapName: 'RL MAP?',
	
	startPosition: {x: 1000, y: 1000, z: 7},
	
	startZoom: 14,
	
	minZoom: 4,
	
	maxZoom: 18, // maximum zoom with full quality is 16
