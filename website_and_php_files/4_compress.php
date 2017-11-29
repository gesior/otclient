<?php
$fromFolder = 'map_tiled';
$toFolder = 'map_viewer/map';
$quality = 80; // 1 - 100, 100 is highest
$fromExtension = '.png';
$toExtension = '.jpg';

function getImageCords($imagePath)
{
	$temp1 = explode('.', basename($imagePath));
	$temp2 = explode('_', $temp1[0]);
	return ['x' => $temp2[0], 'y' => $temp2[1], 'z' => $temp2[2]];
}

function progressBar($done, $total) {
    $perc = floor(($done / $total) * 100);
    $left = 100 - $perc;
    $write = sprintf("[%'={$perc}s>%-{$left}s] - $perc%% - $done/$total\n", "", "");
    fwrite(STDERR, $write);
}

if (count($argv) != 2 && count($argv) != 3) {
	exit('This program requires argument passed in console. Argument is "floor level" to compress. Example: php 4_mcompress.php 7' . PHP_EOL);
}

if (!file_exists('fs_compress.serialized')) {
	exit('File "fs_compress.serialized" does not exist. First run: php 3_pre_compress.php' . PHP_EOL);
}
$floor = $argv[1];
$showProgressBar = isset($argv[2]) ? $argv[2] : 1;

@mkdir($toFolder, 0777, true);
copy('anti_index_page.htm', $toFolder . '/index.htm');
copy('anti_index_page.htm', $toFolder . '/index.html');
for($i = 0; $i <= 16; $i++)
{
	@mkdir($toFolder . '/' . $i);
	copy('anti_index_page.htm', $toFolder . '/' . $i . '/index.htm');
	copy('anti_index_page.htm', $toFolder . '/' . $i . '/index.html');
}

$filesToCompress = [];
echo "Generating list of files to compress (floor " . $floor . ")..." . PHP_EOL;
$startTime = time();
$files = unserialize(file_get_contents('fs_compress.serialized'));
foreach ($files as $imagePath)
{
	if (getImageCords($imagePath)['z'] != $floor)
		continue;

	$filesToCompress[] = $imagePath;
}

echo "Files to compress count (floor " . $floor . "): " . count($filesToCompress) . ", time: " . (time() - $startTime) . " seconds" . PHP_EOL;
$done = 0;

foreach ($filesToCompress as $imagePath)
{
	$savePath = str_replace($fromFolder, $toFolder, $imagePath);
	$savePath = str_replace($fromExtension, $toExtension, $savePath);

	$image = @imagecreatefrompng($imagePath);
	@imagejpeg($image, $savePath, $quality);
	@imagedestroy($image);
	$done++;
	if($showProgressBar == 1 && $done % 100 == 0) {
		progressBar($done, count($filesToCompress));
	}
}
echo "All images compressed (floor " . $floor . ")." . PHP_EOL . "Total count: " . $done . PHP_EOL . "Total time: " . (time() - $startTime) . " seconds" . PHP_EOL;