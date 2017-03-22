<?php
ob_start();
$start = microtime(true);
echo 'Start time: ' . date('H:i:s') . "\n";

function getImageCords($imagePath)
{
	$temp1 = explode('.', basename($imagePath));
	$temp2 = explode('_', $temp1[0]);
	return ['x' => $temp2[0], 'y' => $temp2[1], 'z' => $temp2[2]];
}

if (count($argv) != 2) {
	exit('This program requires argument passed in console. Argument is "floor level" to generate. Example: php 2_tile_generator.php 7');
}

if (!file_exists('fs_tiles.serialized')) {
	exit('File "fs_tiles.serialized" does not exist. First run: php 1_pre_tile_generator.php');
}
$floor = $argv[1];
$allFiles = unserialize(file_get_contents('fs_tiles.serialized'));

$currentFiles = $allFiles[$floor];
$nextFiles = [];

$directory = 'map_tiled';
for($zoom = 16; $zoom > 0; $zoom--)
{
	@mkdir($directory . '/' . ($zoom-1));

	$imagesGenerated = 0;
	foreach($currentFiles as $imagePath)
	{
		$position = getImageCords($imagePath);
		$x = floor($position['x'] / 2) * 2;
		$y = floor($position['y'] / 2) * 2;
		$z = $position['z'];
		$toPath = $directory . '/' . ($zoom-1) . '/' . ($x/2) . '_' . ($y/2) . '_' . $z . '.png';
		if(!isset($nextFiles[$toPath]))
		{
			++$imagesGenerated;
			$nextFiles[$toPath] = $toPath;
			$topLeftPath = $directory . '/' . $zoom . '/' . $x . '_' . $y . '_' . $z . '.png';
			$topRightPath = $directory . '/' . $zoom . '/' . ($x+1) . '_' . $y . '_' . $z . '.png';
			$bottomLeftPath = $directory . '/' . $zoom . '/' . $x . '_' . ($y+1) . '_' . $z . '.png';
			$bottomRightPath = $directory . '/' . $zoom . '/' . ($x+1) . '_' . ($y+1) . '_' . $z . '.png';

			$imgBig = imagecreatetruecolor (512,512);
			imagecolorallocate($imgBig, 0, 0, 0);
			if(isset($currentFiles[$topLeftPath]))
			{
				$img1 = imagecreatefrompng($topLeftPath);
				imagecopy($imgBig, $img1, 0, 0, 0, 0, 256, 256);
				imagedestroy($img1);
			}
			if(isset($currentFiles[$topRightPath]))
			{
				$img2 = imagecreatefrompng($topRightPath);
				imagecopy($imgBig, $img2, 256, 0, 0, 0, 256, 256);
				imagedestroy($img2);
			}
			if(isset($currentFiles[$bottomLeftPath]))
			{
				$img3 = imagecreatefrompng($bottomLeftPath);
				imagecopy($imgBig, $img3, 0, 256, 0, 0, 256, 256);
				imagedestroy($img3);
			}
			if(isset($currentFiles[$bottomRightPath]))
			{
				$img4 = imagecreatefrompng($bottomRightPath);
				imagecopy($imgBig, $img4, 256, 256, 0, 0, 256, 256);
				imagedestroy($img4);
			}

			$img = imagecreatetruecolor (256,256);
			imagecopyresampled($img, $imgBig, 0, 0, 0, 0, 256, 256, 512, 512);
			imagepng($img, $toPath, 1);
			imagedestroy($img);
			imagedestroy($imgBig);
		}
	}
	$currentFiles = $nextFiles;
	$nextFiles = [];
	echo 'Zoom level "' . ($zoom-1) . '" tiles (' . $imagesGenerated . ' images) generated in ' . round(microtime(true)-$start, 3) . ' seconds - ' . date('H:i:s') . "\n";
	$start = microtime(true);
}