<?php
$start = microtime(true);
echo 'Start time: ' . date('H:i:s') . PHP_EOL;

function getImageCords($imagePath)
{
	$temp1 = explode('.', basename($imagePath));
	$temp2 = explode('_', $temp1[0]);
	return ['x' => $temp2[0], 'y' => $temp2[1], 'z' => $temp2[2]];
}

if(file_exists('map'))
{
	if(!is_dir('map_tiled') && !@mkdir('map_tiled'))
	{
		exit('Cannot create folder "map_tiled".' . PHP_EOL);
	}
	if(!@rename('map', 'map_tiled/16'))
	{
		exit('Cannot move folder "map" to "map_tiled/16".' . PHP_EOL);
	}
}

if(!is_dir('map_tiled') || !is_dir('map_tiled/16'))
{
	exit('Folder "map_tiled" or "map_tiled/16" does not exist.' . PHP_EOL);
}

echo 'Folders for tiles generator created and images moved to new folder in ' . round(microtime(true)-$start, 3) . ' seconds. Listing files in directory...' . PHP_EOL;
$start = microtime(true);

$files = [];
$filesCount = 0;

foreach(glob('map_tiled/16/*.png') as $imagePath)
{
	$position = getImageCords($imagePath);
	$z = $position['z'];
	$files[$z][$imagePath] = $imagePath;
	++$filesCount;
}
file_put_contents('fs_tiles.serialized', serialize($files));
echo 'Listed ' . $filesCount . ' files in ' . round(microtime(true)-$start, 3) . ' seconds.' . PHP_EOL;