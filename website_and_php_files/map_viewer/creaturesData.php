<?php
// make sure that this path is writeable for PHP
$cacheFileName = 'creaturesData.cache.json';

// path to folder with monster, npc and spawns data
$dataPath = '/home/jskalski/p/prv/mapview_monsters_npc/';
$monstersDir = 'monster/';
$npcDir = 'npc/';
$spawnsFile = 'world/world-spawn.xml';

if(file_exists($cacheFileName)) {
	readfile($cacheFileName);
	exit;
}

// LOAD MONSTERS
$monsters = json_decode(json_encode(simplexml_load_file($dataPath . $monstersDir . 'monsters.xml')), true);
$monsters = $monsters['monster'];

$monstersData = [];
foreach($monsters as $monster) {
	$monster = $monster['@attributes'];
	$monsterData = json_decode(json_encode(simplexml_load_file($dataPath . $monstersDir . $monster['file'])), true);
	if($monsterData === false) {
		file_put_contents('error.log', 'Failed to parse Monster XML: ' . $dataPath . $monstersDir . $monster['file'] . PHP_EOL, FILE_APPEND);
		continue;
	}
	$lookData = $monsterData['look']['@attributes'];
	$look = [
		isset($lookData['type']) ? $lookData['type'] : 128,
		isset($lookData['typeex']) ? $lookData['typeex'] : 0,
		isset($lookData['head']) ? $lookData['head'] : 0,
		isset($lookData['body']) ? $lookData['body'] : 0,
		isset($lookData['legs']) ? $lookData['legs'] : 0,
		isset($lookData['feet']) ? $lookData['feet'] : 0,
		isset($lookData['addons']) ? $lookData['addons'] : 0,
	];
	$data = [
		'name' => $monsterData['@attributes']['name'],
		'look' => $look
	];
	$monstersData[strtolower($monster['name'])] = $data;
}
$monstersDataKeys = array_keys($monstersData);
$monstersDataValues = array_values($monstersData);

// LOAD NPCS
$npcsData = [];
foreach (glob($dataPath . $npcDir . '*.xml') as $filePath) {
	$npcFileName = substr($filePath, strlen($dataPath . $npcDir), -strlen('.xml'));
	$npcData = json_decode(json_encode(simplexml_load_file($filePath)), true);
	if($npcData === false) {
		file_put_contents('error.log', 'Failed to parse NPC XML: ' . $filePath . PHP_EOL, FILE_APPEND);
		continue;
	}

	if(isset($npcData['look']['@attributes'])) {
		$lookData = $npcData['look']['@attributes'];
		$look = [
			isset($lookData['type']) ? $lookData['type'] : 128,
			isset($lookData['typeex']) ? $lookData['typeex'] : 0,
			isset($lookData['head']) ? $lookData['head'] : 0,
			isset($lookData['body']) ? $lookData['body'] : 0,
			isset($lookData['legs']) ? $lookData['legs'] : 0,
			isset($lookData['feet']) ? $lookData['feet'] : 0,
			isset($lookData['addons']) ? $lookData['addons'] : 0,
		];
	} else {
		$look = [
			128,
			0,
			0,
			0,
			0,
			0,
		];
	}
	$data = [
		'name' => $npcData['@attributes']['name'],
		'look' => $look
	];
	$npcsData[$npcFileName] = $data;
}
$npcsDataKeys = array_keys($npcsData);
$npcsDataValues = array_values($npcsData);

// LOAD SPAWNS
$spawns = json_decode(json_encode(simplexml_load_file($dataPath . $spawnsFile)), true);
$spawns = $spawns['spawn'];
$spawnsDataMonster = [];
$spawnsDataNpc = [];
foreach($spawns as $i => $spawn) {
	$centerX = $spawn['@attributes']['centerx'];
	$centerY = $spawn['@attributes']['centery'];
	$centerZ = $spawn['@attributes']['centerz'];

	if(isset($spawn['monster'])) {
		foreach($spawn['monster'] as $monsterData) {
			if(count($monsterData) == 1) {
				$monster = $monsterData['@attributes'];
			} else {
				$monster = $monsterData;
			}
			$monsterName = $monster['name'];
			$monsterX = $centerX + $monster['x'];
			$monsterY = $centerY + $monster['y'];
			$monsterZ = $centerZ;
			$monsterKey = array_search(strtolower($monsterName), $monstersDataKeys);
			if($monsterKey !== false) {
				$spawnsDataMonster[$monsterZ][$monsterX][$monsterY] = $monsterKey;	
			}
		}
	}
	if(isset($spawn['npc'])) {
		foreach($spawn['npc'] as $npcData) {
			if(count($npcData) == 1) {
				$npc = $npcData['@attributes'];
			} else {
				$npc = $npcData;
			}
			$npcName = $npc['name'];
			$npcX = $centerX + $npc['x'];
			$npcY = $centerY + $npc['y'];
			$npcZ = $centerZ;
			$npcKey = array_search($npcName, $npcsDataKeys);
			if($npcKey !== false) {
				$spawnsDataNpc[$npcZ][$npcX][$npcY] = $npcKey;
			}
		}
	}
}

$ret = [
	'monstersData' => $monstersDataValues,
	'npcsData' => $npcsDataValues,
	'spawnsDataMonster' => $spawnsDataMonster,
	'spawnsDataNpc' => $spawnsDataNpc
];
$json = json_encode($ret);
@file_put_contents($cacheFileName, $json);
echo $json;