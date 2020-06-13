#!/bin/bash
minFloor=0
maxFloor=16

echo '1: Move files to map_tiled folder'
php 1_pre_tile_generator.php 

echo '2: Generate all zoom levels'
for (( i=minFloor; i<=maxFloor; i++))
	do
		php 2_tile_generator.php $i &
	done

while [ `jobs -lr | grep 2_tile_generator | wc -l` -gt 0 ]
do
	sleep 1
	echo `date +%T` ' - Generate zoom levels - running processes: ' `jobs -lr | grep 2_tile_generator | wc -l`
done

echo '3: Generate list of files to compress'
php 3_pre_compress.php

echo '4: Compress images'
for (( i=minFloor; i<=maxFloor; i++))
	do
		php 4_compress.php $i 0 &
	done

while [ `jobs -lr | grep 4_compress | wc -l` -gt 0 ]
do
	sleep 1
	echo `date +%T` ' - Compress images - running processes: ' `jobs -lr | grep 4_compress | wc -l`
done

