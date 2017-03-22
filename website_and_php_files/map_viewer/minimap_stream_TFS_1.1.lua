local levelToHideName = 50
-- TFS 1.1 Live Stream
-- INSTALL DATABASE SCHEMA IN PHPMYADMIN BEFORE YOU INSTALL THIS SCRIPT ON OTS
--[[ Database schema:
CREATE TABLE IF NOT EXISTS `minimap_stream` (
  `date` int(10) NOT NULL,
  `info` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
ALTER TABLE `minimap_stream` ADD PRIMARY KEY (`date`);
]]--
--[[ globalevents/globalevents.xml:
<globalevent type="startup" name="MinimapStreamStartup" script="minimap_stream.lua"/>
<globalevent interval="1000" name="MinimapStreamUpdate" script="minimap_stream.lua"/>
]]
-- Base64 encoder
	local function lsh(value,shift)
		return (value*(2^shift)) % 256
	end
	local function rsh(value,shift)
		return math.floor(value/2^shift) % 256
	end
	local function bit(x,b)
		return (x % 2^b - x % 2^(b-1) > 0)
	end
	local function lor(x,y)
		local result = 0
		for p=1,8 do result = result + (((bit(x,p) or bit(y,p)) == true) and 2^(p-1) or 0) end
		return result
	end
	local base64chars = {[0]='A',[1]='B',[2]='C',[3]='D',[4]='E',[5]='F',[6]='G',[7]='H',[8]='I',[9]='J',[10]='K',[11]='L',[12]='M',[13]='N',[14]='O',[15]='P',[16]='Q',[17]='R',[18]='S',[19]='T',[20]='U',[21]='V',[22]='W',[23]='X',[24]='Y',[25]='Z',[26]='a',[27]='b',[28]='c',[29]='d',[30]='e',[31]='f',[32]='g',[33]='h',[34]='i',[35]='j',[36]='k',[37]='l',[38]='m',[39]='n',[40]='o',[41]='p',[42]='q',[43]='r',[44]='s',[45]='t',[46]='u',[47]='v',[48]='w',[49]='x',[50]='y',[51]='z',[52]='0',[53]='1',[54]='2',[55]='3',[56]='4',[57]='5',[58]='6',[59]='7',[60]='8',[61]='9',[62]='-',[63]='_'}
	local function enc(data)
		local bytes = {}
		local result = ""
		for spos=0,string.len(data)-1,3 do
			for byte=1,3 do bytes[byte] = string.byte(string.sub(data,(spos+byte))) or 0 end
			result = string.format('%s%s%s%s%s',result,base64chars[rsh(bytes[1],2)],base64chars[lor(lsh((bytes[1] % 4),4), rsh(bytes[2],4))] or "=",((#data-spos) > 1) and base64chars[lor(lsh(bytes[2] % 16,2), rsh(bytes[3],6))] or "=",((#data-spos) > 2) and base64chars[(bytes[3] % 64)] or "=")
		end
		return result
	end
-- Base64 encoder end

function onStartup()
	db.query("TRUNCATE TABLE `minimap_stream`")
	db.query("INSERT INTO `minimap_stream` (`date`, `info`) VALUES (" .. os.time() .. ", " .. db.escapeString("") .. ")")
end

function onThink(interval)
	local players = Game.getPlayers()
	local info = "["

	if #players > 0 then
		local player, pos
		for i = 1, #players do
			player = players[i]
			if player:getGroup() < 2 then
				local pos = player:getPosition()
				local outfit = player:getOutfit()

				if(player:getLevel() < levelToHideName) then
					info = info .. '[' .. player:getGuid() .. ',"' .. enc(player:getName()) .. '",' .. pos.x .. ',' .. pos.y .. ',' .. pos.z .. ',' .. player:getDirection() .. ',' .. outfit.lookType .. ',' .. outfit.lookTypeEx .. ',' .. outfit.lookHead .. ',' .. outfit.lookBody .. ',' .. outfit.lookLegs .. ',' .. outfit.lookFeet .. ',' .. outfit.lookAddons .. ',' .. outfit.lookMount .. ']'
				else
					info = info .. '[' .. player:getGuid() .. ',"",' .. pos.x .. ',' .. pos.y .. ',' .. pos.z .. ',' .. player:getDirection() .. ',' .. outfit.lookType .. ',' .. outfit.lookTypeEx .. ',' .. outfit.lookHead .. ',' .. outfit.lookBody .. ',' .. outfit.lookLegs .. ',' .. outfit.lookFeet .. ',' .. outfit.lookAddons .. ',' .. outfit.lookMount .. ']'
				end
				if(i ~= #players) then
					info = info .. ','
				end
			end
		end
	end
	info = info .. "]"

	db.query("UPDATE `minimap_stream` SET `date` = " .. os.time() .. ", `info` = " .. db.escapeString(info))
	return true
end
