#!/bin/bash

minFloor=0
maxFloor=16

echo '2: Generate all zoom levels'
for (( i=minFloor; i<=maxFloor; i++))
	do
		php 2_tile_generator.php $i &
	done