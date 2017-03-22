<?php
// config:
$hiddenNames = ["GM Gesior", "Secret Character"];
$SQL = new PDO('mysql:host=localhost;dbname=tfs', 'root', 'secretpassword');


// CODE
foreach($hiddenNames as $id => $hiddenName)
{
	$hiddenNames[$id] = base64_encode($hiddenName);
}
$response = $SQL->query('SELECT * FROM `minimap_stream`');
$ret = [];
if($response)
{
	$result = $response->fetch();
	if($result)
	{
		$data = json_decode($result['info']);
		$ret = [];
		$ret['time'] = time() - $result['date'];
		$ret['players'] = [];

		foreach($data as $player)
		{
			if(!in_array($player[1], $hiddenNames))
			{
				$ret['players'][] = [$player[0],$player[1],$player[2],$player[3],$player[4],$player[5]+1,$player[6],$player[7],$player[8],$player[9],$player[10],$player[11],$player[12],$player[13]];
			}
		}
	}
}
echo json_encode($ret);
