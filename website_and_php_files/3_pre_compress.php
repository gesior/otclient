<?php
$fromFolder = 'map_tiled';
$fromExtension = '.png';

$substrFromExtensionLength = -(strlen($fromExtension));
$files = [];
echo "Generating list of files to compress..." . PHP_EOL;
$startTime = time();

foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($fromFolder . '/')) as $filename)
{
    if ($filename->isDir())
		continue;

	$imagePath = $filename->getPathname();

	if (substr($imagePath, $substrFromExtensionLength) != $fromExtension)
		continue;

	$files[] = $imagePath;
}
file_put_contents('fs_compress.serialized', serialize($files));
echo "Files to compress count: " . count($files) . ", time: " . (time() - $startTime) . " seconds" . PHP_EOL;