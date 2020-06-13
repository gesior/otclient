#!/bin/bash

minFloor=0
maxFloor=16

echo '4: Compress images'
for (( i=minFloor; i<=maxFloor; i++))
	do
		php 4_compress.php $i 0 &
	done