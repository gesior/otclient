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
    
    prepareClient(1076, '/things/1076/items.otb', '/map.otbm', 8)
    
	with you client protocol version, valid paths to items.otb and map.otbm, and number of threads to run
	[Paths are relational, so start path with '/' to start in folder 'data', access to other folders in computer is blocked]

7. OTClient will show in 10-50 seconds (it will freez client, do not close it, just wait) something like [pink text]:

	Generate list of '123456' images to generate. Now just type: generateMap()

8. Type in client terminal command:
		
	**generateMap()**
		
	OTClient will report progress in terminal.

	Last **4** is number of threads to run in same time (only way to use more then 1 core to generate images).

9. Your map images will appear in C:\*_USERS_*\*_YOUR_USER_NAME_*\otclient\map\

	_USERS_ - your Windows language 'users' (like 'Uzytkownicy' in polish windows 7)
	_YOUR_USER_NAME_ - your Windows login
	
	Linux: /home/_YOUR_USER_NAME_/.otclient/map - this folder is invisible in file explorer!
	You must type 'cd .otclient' in your HOME folder, it will work! It's visible in 'mc' program, so you can use it to check generator results.
10. DONE! :)
