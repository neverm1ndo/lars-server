#!/bin/bash
## LLS launch script
cd /home/nmnd/libertylogs
RED="\e[31m"
NC="\e[0m"
GREEN="\e[32m"
LYELLOW="\e[93m"
check () {
	if
		[[ -n "`pgrep screen`" ]];
	then
		return 1
	else
		return 0
	fi

}
launch() {
	if check ; then
		echo " > Запуск LARS сервера..."
		if
			[[ -n "`pgrep mongod`" ]];
		then
			echo " > Сервер MongoDB уже запущен"
			sudo screen -d -m -S lars npm run start
		else
			echo " > Запуск сервера MongoDB..."
			sudo service mongod start |
	       		echo " > Сервер MongoDB запущен" |
			sudo screen -d -m -S lars npm run start
		fi
		sleep 2s
		if check;
		then
			echo -e " > > > ${RED}Не удалось запустить сервер LARS!${NC}"
		else
			echo -e " > > > ${GREEN}Сервер LARS успешно запущен${NC}"
		fi
	else
	       echo -e " > > > ${LYELLOW} LARS сервер уже запущен ${NC}"
	fi
}
trap launch 0
